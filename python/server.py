from __future__ import division
import datetime
import logging
import re
import requests
import random
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
application.config['CORS_HEADERS'] = 'Content-Type'
cors = CORS(application)

client = pymongo.MongoClient()
db = client["loc"]
coll = db["users"]
locationCollection = db["locations"]
logCollection = db["log"]
newsCollection = db["newspapers"]

#solrNodes = ['a.usnewsmap.net','b.usnewsmap.net','c.usnewsmap.net','d.usnewsmap.net','e.usnewsmap.net']
solrNodes = ['a.usnewsmap.com','b.usnewsmap.com','c.usnewsmap.com']

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

    searchString = flaskData['search'].replace('"','')
    search = ''.join(['text:"',searchString,'"'])
    #shards = '&shards=130.207.211.77:8983/solr/loc|130.207.211.78:8983/solr/loc|130.207.211.79:8983/solr/loc'
    sort = ''.join(['&sort=random_',str(user_id.int),'%20desc'])
    dateSearch = ''.join(['date_field:[',flaskData['startDate'],'+TO+',flaskData['endDate'],']+'])
    numRows = 500
    pagination = '&rows=' + str(numRows) + '&start=' + str(flaskData['start'])
    # url = ['http://a.usnewsmap.net:8983/solr/loc/select?q=',dateSearch,search,
    node = solrNodes[random.randint(0,len(solrNodes)-1)]
    url = ['http://',node,':8983/solr/loc/select?q=',dateSearch,search,
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
    retObj = {"data":[],"meta":meta,"frequencies":[]}

    log_metadata(meta,searchString,url)

    if meta['available'] == 0:
        return json.dumps(retObj)

    retObj['frequencies'] = getFreq(flaskData)
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

def getFreq(flaskData):
    globalFreq = {1836:1798,1837:3662,1838:4896,1839:6664,1840:7682,1841:7905,1842:9300,1843:9301,1844:11271,1845:11666,1846:13395,1847:11713,1848:12966,1849:13129,1850:17216,1851:20236,1852:23414,1853:26305,1854:26684,1855:28348,1856:29562,1857:30618,1858:35334,1859:37689,1860:39900,1861:41613,1862:36326,1863:34502,1864:33711,1865:35792,1866:51372,1867:48381,1868:48036,1869:44845,1870:47468,1871:49297,1872:52996,1873:53875,1874:56374,1875:57112,1876:55018,1877:51613,1878:56439,1879:61438,1880:71290,1881:74003,1882:81175,1883:87451,1884:94211,1885:96043,1886:99523,1887:105844,1888:104071,1889:109376,1890:129453,1891:142431,1892:151292,1893:157094,1894:169563,1895:172359,1896:189546,1897:187778,1898:196695,1899:212314,1900:221567,1901:225438,1902:233644,1903:231682,1904:247743,1905:268166,1906:276029,1907:279085,1908:281283,1909:315339,1910:318104,1911:284628,1912:293786,1913:297669,1914:294896,1915:282396,1916:277674,1917:271030,1918:252884,1919:297172,1920:282027,1921:238189,1922:227616}
    ret = []
    searchTerms = flaskData['search']
    dateStart = flaskData['startDate']
    dateEnd = flaskData['endDate']
    url = ['http://',solrNodes[random.randint(0,len(solrNodes)-1)],':8983/solr/loc/select?q=text:',searchTerms,
            '&facet=true&facet.date=date_field&facet.date.start=',dateStart,
            '&facet.date.end=',dateEnd,'&facet.date.gap=%2B1YEAR&fl=date_field&wt=json']
    r = requests.get(''.join(url))
    solrResp = r.json()
    freq = solrResp['facet_counts']['facet_dates']['date_field']
    # Remove non-frequency keys
    for k in ['end','gap','start']:
        try:
            del freq[k]
        except KeyError:
            pass
    # Trim down key names to just the year and divide by global year frequency
    freq = dict((k[:4],v) for k,v in freq.items())
    for year in freq:
        if int(year) in globalFreq:
            ret.append([int(year),freq[year] / globalFreq[int(year)]])

    # print ret
    return ret


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
