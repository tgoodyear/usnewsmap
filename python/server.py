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
from flask_cors import CORS
from flask_restplus import Api, Resource, fields, apidoc

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
#solrNodes = ['solr1.icl.gtri.org','solr2.icl.gtri.org','b.usnewsmap.com','c.usnewsmap.com']
solrNodes = ['b.usnewsmap.com','c.usnewsmap.com']

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

    flaskData['startDate'] = flaskData['startDate'][0:10]+'T00:00:00Z'
    flaskData['endDate'] = flaskData['endDate'][0:10]+'T23:59:59Z'
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
    if solrResp['responseHeader']['status'] != 0:
        print(solrResp)
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
    globalFreq = {1789:292,1790:416,1791:500,1792:826,1793:640,1794:1211,1795:800,1796:863,1797:808,1798:828,1799:1024,1800:1016,1801:592,1802:584,1803:616,1804:628,1805:618,1806:616,1807:568,1808:628,1809:621,1810:0,1811:0,1812:0,1813:0,1814:0,1815:0,1816:0,1817:0,1818:0,1819:0,1820:0,1821:0,1822:0,1823:0,1824:0,1825:0,1826:0,1827:0,1828:0,1829:0,1830:0,1831:0,1832:0,1833:0,1834:0,1835:120,1836:2897,1837:5597,1838:7222,1839:9319,1840:10335,1841:9253,1842:12376,1843:12236,1844:14830,1845:15159,1846:17050,1847:15028,1848:16980,1849:16976,1850:22103,1851:25721,1852:28893,1853:32213,1854:32923,1855:34638,1856:35604,1857:36438,1858:41540,1859:44375,1860:47443,1861:48239,1862:43104,1863:41732,1864:41737,1865:42447,1866:61978,1867:58937,1868:60240,1869:56330,1870:59493,1871:61540,1872:65952,1873:68397,1874:69151,1875:70747,1876:68169,1877:67339,1878:72515,1879:74653,1880:79270,1881:81416,1882:88308,1883:95390,1884:103874,1885:106036,1886:109857,1887:116469,1888:115143,1889:121473,1890:143001,1891:158328,1892:165310,1893:169582,1894:182263,1895:190025,1896:207603,1897:206841,1898:216692,1899:236710,1900:249443,1901:252148,1902:261739,1903:263323,1904:284206,1905:304608,1906:310612,1907:313728,1908:317035,1909:354037,1910:356044,1911:321759,1912:329388,1913:333987,1914:338026,1915:330384,1916:331536,1917:326738,1918:307147,1919:360521,1920:347713,1921:303603,1922:288937}
    ret = []
    searchTerms = flaskData['search']
    dateStart = flaskData['startDate']
    dateEnd = flaskData['endDate']
    dats = map(int, dateStart.split("T")[0].split("-"))
    dateStart = str(dats[0]) + "-01-01T00:00:00Z"
    dats = map(int, dateEnd.split("T")[0].split("-"))
    dateEnd = str(dats[0]) + "-01-01T00:00:00Z"
    url = ['http://',solrNodes[random.randint(0,len(solrNodes)-1)],':8983/solr/loc/select?q=text:',searchTerms,
            '&facet=true&facet.range=date_field&facet.range.start=',dateStart,
            '&facet.range.end=',dateEnd,'&facet.range.gap=%2B1YEAR&fl=date_field&wt=json']
    r = requests.get(''.join(url))
    solrResp = r.json()
    print(''.join(url)) #,solrResp

    freq = solrResp['facet_counts']['facet_ranges']['date_field']['counts']
#    freq = solrResp['facet_counts']['facet_dates']['date_field']
    # Remove non-frequency keys
    '''
    for k in ['end','gap','start']:
        try:
            del freq[k]
        except KeyError:
            pass
    '''
    # Trim down key names to just the year and divide by global year frequency
    # freq = dict((k[:4],v) for k,v in freq.items())
    freq = zip(freq[0::2], freq[1::2]) 
    for year in freq:
        if int(year[0][:4]) in globalFreq:
            freqValue = [int(year[0][:4]),year[1] / globalFreq[int(year[0][:4])] if globalFreq[int(year[0][:4])] != 0 else 0]
            ret.append(freqValue)

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
