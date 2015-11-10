import datetime
import re
import requests
import logging
import pymongo
import traceback
import simplejson as json
import sys
import uuid
from bson import json_util
from flask import Flask, request, jsonify, Response
from flask.ext.cors import CORS
from flask.ext.restplus import Api, Resource, fields, apidoc

sys.path.insert(1,'/var/www/loc/python')
from HashList.HashList import HashList, HashTable

logging.basicConfig(stream=sys.stderr)

application = Flask(__name__)
cors = CORS(application)

client = pymongo.MongoClient()
db = client["loc"]
coll = db["users"]
locationCollection = db["locations"]
logCollection = db["log"]
newsCollection = db["newspapers"]

######
#There is a bug with flask, python, and HashList where if you click the search button too
# quickly you will get duplication of your data in the hash table and linked list.
#What looks like what is happening is that something isn't being collected by the
#garbage collector. SO just intilizing though init wont work. The current
# work around is to use setters for the hash table and linked list. Possibly works
# becuase it gives more time for GC to work.
######

@application.route('/get_data',methods=['GET', 'POST'])
def docSearch():
    marks = []
    flaskData = json.loads(request.data)
    user_id = uuid.UUID(flaskData['user_id'])

    searchString = flaskData['search']
    search = ''.join(['text:"',searchString,'"'])
    shards = '&shards=130.207.211.77:8983/solr/loc|130.207.211.78:8983/solr/loc|130.207.211.79:8983/solr/loc'
    sort = ''.join(['&sort=random_',str(user_id.int),'%20desc'])
    dateSearch = ''.join(['date_field:[',flaskData['startDate'],'+TO+',flaskData['endDate'],']+'])
    numRows = 1000
    pagination = '&rows=' + str(numRows) + '&start=' + str(flaskData['start'])
    url = ['http://130.207.211.77:8983/solr/loc/select?q=',dateSearch,search,
        '&wt=json&indent=false','&fl=date_field,id,ed,seq,seq_num',pagination
        ,'&q.op=AND', sort
        # ,shards
        ]
    url = ''.join(url)
    # print url
    time = flaskData['date']
    r = requests.get(url)
    solrResp = r.json()
    # print data
    meta = {    "available":solrResp['response']['numFound'],
                "start":solrResp['responseHeader']['params']['start'],
                "rows":solrResp['responseHeader']['params']['rows'],
                "batchSize": numRows,
                "solrTime":solrResp['responseHeader']['QTime']
                # "q":url
            }
    retObj = {"data":[],"meta":meta}

    log_metadata(meta,searchString,url)

    if meta['available'] == 0:
        return json.dumps(retObj)

    resultsList = solrResp['response']['docs']
    if flaskData['start'] > 0:
        existingData = coll.find_one({"id":flaskData['user_id']})
        resultsList = existingData['linked_list'] + resultsList
    for d in resultsList:
        loc_data = locationCollection.find_one({"sn":d['seq_num']})
        if not loc_data or 'lat' not in loc_data:
            continue
        if 'date_field' in d:
            dats = map(int, d['date_field'].split("T")[0].split("-"))
            date = datetime.date(dats[0],dats[1],dats[2]).isoformat()
            year = dats[0]
            month = dats[1]
            day = dats[2]
            idField = d['id']
        else:
            year = d['year']
            month = d['month']
            day = d['day']
            date = d['date']
            idField = d['nid']
        mark = {'lat':float(loc_data['lat']),
            'lng':float(loc_data['long']),
            'timeDate':str(month)+'/'+str(day)+'/'+str(year),
            'message':loc_data['city']+','+loc_data['state'],
            'city':loc_data['city'],
            'state':loc_data['state'],
            'year':year,
            'month':month,
            'day':day,
            'ed':d['ed'],
            'seq':d['seq'],
            'seq_num':d['seq_num'],
            'nid':idField,
            'date':date,
            'hash':loc_data['city']+loc_data['state'],
            'search':search
        }
        marks.append(mark)
    marks = sorted(marks,key=lambda mark : mark['date'])

    h_list = HashList(id=str(user_id))
    for mark in marks:
        h_list.add_node(mark)
    h_list.update(time)
    insert_to_mongo(h_list)
    retObj['data'] = json.loads(h_list.get_hash_json())
    return json.dumps(retObj) #json.dumps(marks)

def insert_to_mongo(h_list):
    coll.update({"id": h_list.get_id()},h_list.get_mongo_format(),True)
    data = coll.find_one({"id": h_list.get_id()})

def log_metadata(meta,search,url):
    obj = meta.copy()
    obj['search'] = search
    obj['solrURL'] = url
    obj['ip'] = request.remote_addr
    obj['cookies'] = request.cookies
    obj['requestedURL'] = request.url
    obj['isXHR'] = request.is_xhr
    obj['requestData'] = request.get_json()
    obj['dateCreated'] = datetime.datetime.utcnow()
    obj.update(request.headers)
    logCollection.insert(obj)


def get_from_mongo(id):
    data = coll.find_one({"id":id})
    h_list = HashList(data['id'],data['hash'],data['linked_list'],data['tail'],data['head'])
    h_list.set_list(data['linked_list'])
    h_list.set_hash(data['hash'])
    return h_list

@application.route('/news_meta',methods=['POST'])
def news_meta():
    requestData = request.get_json()
    if 'sn' not in requestData or len(requestData['sn']) == 0:
        return json.dumps({}), 404
    newspapers = newsCollection.find({"lccn":{"$in":requestData['sn']}},{"_id":0,"issues":0})
    # Return dict of results indexed by sequence num
    ret = {}
    for item in newspapers:
        sn = item['lccn']
        ret[sn] = item
    return json_util.dumps(ret)

@application.route('/update',methods=['GET', 'POST'])
def update():
    if request.method == 'POST':
        data = json.loads(request.data)
        h_list = get_from_mongo(data['user_id'])
        h_list.update(data['date'])
        insert_to_mongo(h_list)
        return h_list.get_hash_json()
    else:
        return "no updates at this time"

if __name__ == '__main__':
    application.run(debug=True,host='0.0.0.0',port=8080)
