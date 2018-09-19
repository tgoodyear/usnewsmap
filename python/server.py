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
#solrNodes = ['b.usnewsmap.com','c.usnewsmap.com']
#solrNodes = ['solr%s.icl.gtri.org' % x for x in range(1,10)]
solrNode = 'violetwaffle08.icl.gtri.org:10125'

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
    node = solrNode
    url = ['http://',node,'/solr/loc/select?q=',dateSearch,search,
        '&wt=json&indent=false','&fl=date_field,id,ed,sn,seq',pagination
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
        loc_data = locationCollection.find_one({"sn":d['sn'][0]})
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
            year = d['year'][0]
            month = d['month'][0]
            day = d['day'][0]
            date = d['date_field']
            idField = d['id']
        mark = {'lat':float(loc_data['lat']),
            'lng':float(loc_data['long']),
            'timeDate':str(month)+'/'+str(day)+'/'+str(year),
            'message':loc_data['city']+','+loc_data['state'],
            'city':loc_data['city'],
            'state':loc_data['state'],
            'year':year,
            'month':month,
            'day':day,
            'ed':d['ed'][0],
            'seq':d['seq'][0],
            'seq_num':d['sn'][0],
            'id':idField,
            'date':date,
            'hash':loc_data['city']+loc_data['state'],
            'search':search
        }
        marks.append(mark)
    marks = sorted(marks,key=lambda mark : mark['date'])
    if len(marks) == 0:
        meta['available'] = 0
        return json.dumps(retObj)
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
    globalFreq = {1789:292,1790:416,1791:500,1792:826,1793:640,1794:1211,1795:800,1796:863,1797:808,1798:861,1799:1024,1800:1024,1801:604,1802:580,1803:616,1804:642,1805:618,1806:616,1807:568,1808:628,1809:721,1810:92,1811:0,1812:0,1813:0,1814:0,1815:0,1816:0,1817:56,1818:124,1819:0,1820:146,1821:102,1822:600,1823:599,1824:643,1825:687,1826:611,1827:836,1828:1104,1829:726,1830:70,1831:164,1832:314,1833:283,1834:128,1835:292,1836:3770,1837:5625,1838:7066,1839:8714,1840:9725,1841:9478,1842:11993,1843:11925,1844:14261,1845:15069,1846:16582,1847:14352,1848:15951,1849:16480,1850:20964,1851:24259,1852:27014,1853:30704,1854:31286,1855:33046,1856:34816,1857:35350,1858:41230,1859:45154,1860:47665,1861:48316,1862:43116,1863:41652,1864:41729,1865:42444,1866:60648,1867:58375,1868:57798,1869:55182,1870:56392,1871:57823,1872:65738,1873:68263,1874:69998,1875:71594,1876:69478,1877:70216,1878:75384,1879:72956,1880:84171,1881:86172,1882:90775,1883:97918,1884:106105,1885:107424,1886:112782,1887:123819,1888:121525,1889:127443,1890:148016,1891:166122,1892:175662,1893:179732,1894:193785,1895:199539,1896:215745,1897:217955,1898:230563,1899:245043,1900:257061,1901:261414,1902:273055,1903:272962,1904:293746,1905:313940,1906:324530,1907:326202,1908:330956,1909:357510,1910:360477,1911:321181,1912:336007,1913:335840,1914:333003,1915:324920,1916:328118,1917:323144,1918:303386,1919:351725,1920:335770,1921:292788,1922:270691,1923:18006,1924:18253,1925:17821,1926:1856,1927:9632,1928:1214,1929:1222}
    ret = []
    searchTerms = flaskData['search']
    dateStart = flaskData['startDate']
    dateEnd = flaskData['endDate']
    dats = map(int, dateStart.split("T")[0].split("-"))
    dateStart = str(dats[0]) + "-01-01T00:00:00Z"
    dats = map(int, dateEnd.split("T")[0].split("-"))
    dateEnd = str(dats[0]) + "-01-01T00:00:00Z"
    url = ['http://',solrNode,'/solr/loc/select?q=text:',searchTerms,
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
