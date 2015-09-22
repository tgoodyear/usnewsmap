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
		h_list = HashList()
		marks ={'marks': []} 
		data = json.loads(request.data)
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
				'message':d['city']+','+d['state']+"\n",
				'city':d['city'],
				'state':d['state'],
				'year':dats[0],
				'month':dats[1],
				'day':dats[2],
				'ed':d['ed'],
				'seq':d['seq'],
				'seq_num':d['seq_num'],
				'icon':{},
				'nid':d['id'],
				'text_msg':'',
				'date':date,
				'group':'us',
				'hash':d['city']+d['state'],
				'search':search
			}
			marks['marks'].append(mark)
		marks['marks'] = sorted(marks['marks'],key=lambda mark : mark['date'])
		for mark in marks['marks']:
			h_list.add_node(mark)
		insert_to_mongo(h_list)
		#coll.insert_one(h_list.get_mongo_format())
		return h_list.get_hash_json()#json.dumps(marks)
	else:
		return "git milk"

def insert_to_mongo(h_list):
#	prev = coll.find_one({"id": h_list.id}).count()
#	if prev is 0:
#		coll.insert_one(h_list.get_mongo_format())
#	else:
		coll.update({"id": h_list.get_id()},h_list.get_mongo_format(),True)

@application.route('/get_hash')
def get_hash():
	global h_list
	return h_list.get_json()


@application.route('/update',methods=['GET', 'POST'])
def update():
	global h_list
	if request.method == 'POST':
		data = json.loads(request.data)
		h_list.update(data['date'])
		return h_list.get_hash_json()
	else:
		return "no updates at this time"

if __name__ == '__main__':
    application.run(debug=True,host='0.0.0.0',port=8080)
    
