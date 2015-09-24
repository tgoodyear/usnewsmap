import requests
import re
import logging
import sys
import traceback
import simplejson as json
import datetime
import pymongo
from flask import Flask, request, jsonify, Response
from flask.ext.cors import CORS
from flask.ext.restplus import Api, Resource, fields, apidoc

sys.path.insert(1,'/var/www/loc/python')
from HashList.HashList import HashList, HashTable

logging.basicConfig(stream=sys.stderr)

application = Flask(__name__)


client = pymongo.MongoClient()
db = client["loc"]
coll = db["users"]

@application.route('/get_data',methods=['GET', 'POST'])
def home():
	if request.method == 'POST':
		marks = [] 
		data = json.loads(request.data)
                h_list = HashList(id=data['mongo_id'])
		url = data['url']
		search = data['search']
        	r = requests.get(url)
		data = json.loads(r.text)
		for d in data['response']['docs']:
			loc = d['loc'].split(",")
			dats = map(int, d['date_field'].split("T")[0].split("-"))
			date = datetime.date(dats[0],dats[1],dats[2]).isoformat()
			mark = {'lat':float(loc[0]),
				'lng':float(loc[1]),
				'timeDate':str(dats[1])+'/'+str(dats[2])+'/'+str(dats[0]),
				'message':d['city']+','+d['state'],
				'city':d['city'],
				'state':d['state'],
				'year':dats[0],
				'month':dats[1],
				'day':dats[2],
				'ed':d['ed'],
				'seq':d['seq'],
				'seq_num':d['seq_num'],
			#	'icon':{},
				'nid':d['id'],
			#	'text_msg':'',
				'date':date,
				'group':'us',
				'hash':d['city']+d['state'],
				'search':search
			}
			marks.append(mark)
		marks = sorted(marks,key=lambda mark : mark['date'])
		for mark in marks:
			print "added mark"
			h_list.add_node(mark)
		insert_to_mongo(h_list)
		#coll.insert_one(h_list.get_mongo_format())
		#print h_list.get_hash_json()
		return h_list.get_hash_json()#json.dumps(marks)
	else:
		return "git milk"

def insert_to_mongo(h_list):
	coll.update({"id": h_list.get_id()},h_list.get_mongo_format(),True)
        data = coll.find_one({"id": h_list.get_id()})
	print "inserting tail is at " + str(data['tail'])


def get_from_mongo(id):
	data = coll.find_one({"id":id})
	print "from mongo tail is at " + str(data['tail'])
	h_list = HashList(data['id'],data['hash'],data['linked_list'],data['tail'],data['head'])
	return h_list

@application.route('/news_meta',methods=['GET','POST'])
def news_meta():
	if request.method == 'POST':
		data = json.loads(request.data)
		r = requests.get("http://chroniclingamerica.loc.gov/lccn/"+data['seq_num'] + "/" + data['year'] + "-" + data['month'] + "-" + data['day'] + "/" + data['ed'] + ".json")
		print r
	else:
		return "NO METADATA GIVEN FOUND"
@application.route('/update',methods=['GET', 'POST'])
def update():
	if request.method == 'POST':
		data = json.loads(request.data)
		h_list = get_from_mongo(data['mongo_id'])
		h_list.update(data['date'])
		insert_to_mongo(h_list)
		return h_list.get_hash_json()
	else:
		return "no updates at this time"


if __name__ == '__main__':
    application.run(debug=True,host='0.0.0.0',port=8080)
    
