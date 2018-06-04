import pymongo
import requests
import sys
import simplejson as json
from random import randint
from multiprocessing import Pool
import time

headers = {'User-Agent': 'Georgia Tech Research Institute | trevor.goodyear@gtri.gatech.edu | usnewsmap.com'}
#solrNodes = ['a.usnewsmap.net','b.usnewsmap.net','c.usnewsmap.net','d.usnewsmap.net','e.usnewsmap.net']
solrNodes  = ['10.50.76.103','10.50.76.190','b.usnewsmap.com','c.usnewsmap.com']


def getSolrPayload(url):
    sleepTime = randint(0,3)
    time.sleep(sleepTime)

    urlParts = url.split('/')
    seq_num = urlParts[4]
    dateField = urlParts[5]
    ed = urlParts[6]
    seq = urlParts[7].split('.')[0]
    locURL = '/'.join(['http://chroniclingamerica.loc.gov/lccn',seq_num,dateField,ed,seq,'ocr.txt'])

    try:
        r = requests.get(locURL,headers=headers)
    except requests.exceptions.ConnectionError as e:
        sleepTime = (sleepTime+1)*2
        print time.strftime("%Y-%m-%d %H:%M:%S"), 'ConnectionError to',locURL ,' Retrying after',sleepTime,'seconds. ', e
        time.sleep(sleepTime)
        return getText(url)

    payload = {
            'seq_num':seq_num,
            # 'city':data[1],
            # 'state':data[2],
            'ed':ed,
            'seq':seq,
            # 'location':str(data[3]) + "," + str(data[4]),
            'date_field':dateField,
            'text':r.text,
            'text_loose':r.text
        }
    return payload

def getText(urls):
    # URL Example: http://chroniclingamerica.loc.gov/lccn/sn91066782/1910-06-18/ed-1/seq-1/ocr.txt
    payload = []
    for url in urls:
        payload.append(getSolrPayload(url))

    payload = json.dumps(payload)
    solrNode = solrNodes[randint(0,len(solrNodes)-1)]
    commit = '' #"?commit=true" if 1 else ""
    solrUrl = ''.join(['http://',solrNode,':8983/solr/loc/update',commit])
    # print solrUrl
    # print seq_num,ed,seq,dateField
    # print r.text
    # return 0
    # print solrUrl
    # print payload
    # with open('req.txt','r+') as f:
        # f.write(payload)
    # return 0
    try:
        h = {'Content-type':'application/json'}
        g = requests.post(solrUrl,data=payload,headers=h)
        print g.text
        return 1
    except Exception as e:
        sleepTime = (sleepTime+1)*2
        print time.strftime("%Y-%m-%d %H:%M:%S"), 'ConnectionError to',solrUrl ,' Retrying after',sleepTime,'seconds. ',e
        time.sleep(sleepTime)
        getText(url)

def getIssue(issue):
    sleepTime = randint(0,5)
    time.sleep(sleepTime)
    # Issue URL Example http://chroniclingamerica.loc.gov/lccn/sn91066782/1910-06-18/ed-1.json
    issueURL = issue['url']
    issueURLs = set()
    try:
        r = requests.get(issueURL,headers=headers)
    except requests.exceptions.ConnectionError as e:
        time.sleep(sleepTime)
        print time.strftime("%Y-%m-%d %H:%M:%S"), issueURL, 'ConnectionError. Retrying.', e
        getIssue(issue)
    try:
        resp = r.json()
    except Exception as e:
        print time.strftime("%Y-%m-%d %H:%M:%S"), issueURL, 'has no valid JSON response', str(e)
        return issueURLs
    # if sleepTime == 3:
        # print 'Checking',len(resp['pages']),'pages for', issueURL
    for page in resp['pages']:
        urlParts = page['url'].split('/')
        seq_num = urlParts[4]
        dateField = urlParts[5]
        edition = urlParts[6]
        seq = urlParts[7].split('.')[0]
        # Determine if we already have the document
        node = solrNodes[randint(0,len(solrNodes)-1)]
        solrURL = ''.join(['http://',node,':8983/solr/loc/select?q=date_field:%22', dateField,
                    'T00:00:00.000Z%22%20AND%20seq:',seq,'%20AND%20seq_num:',seq_num,'%20AND%20ed:',
                    edition,'&wt=json&indent=false&fl=id'])
        try:
            r = requests.get(solrURL,headers=headers)
        except requests.exceptions.ConnectionError as e:
            print time.strftime("%Y-%m-%d %H:%M:%S"), solrURL, 'ConnectionError Solr. Retrying.', e
            time.sleep((sleepTime+1)*2)
            return getIssue(issue)

        resp = r.json()
        try:
            if resp['response']['numFound'] == 0:
                issueURLs.add(page['url'])
        except:
            print "Could not parse solr resp:", r.text

    return issueURLs

def getBatch(batchURL):
    # print batchURL  # Example: http://chroniclingamerica.loc.gov/batches/batch_vtu_cauliflower_ver01.json

    r = requests.get(batchURL,headers=headers)
    resp = r.json()
    print time.strftime("%Y-%m-%d %H:%M:%S"), "Starting pool for", batchURL
    pool = Pool(120)
    issueURLs = pool.map(getIssue,resp['issues'])
    pool.close()
    print time.strftime("%Y-%m-%d %H:%M:%S"), "Closing  pool for", batchURL

    return issueURLs

def getSNData(sn):
    client = pymongo.MongoClient()
    db = client["loc"]
    coll = db["newspapers"]
    url = ''.join(['http://chroniclingamerica.loc.gov/lccn/',sn,'.json'])
    if coll.find_one({"lccn":sn}):
        # print sn , "Skipping"
        client.close()
        return 0

    r = requests.get(url)
    # print r.json()
    try:
        coll.insert(r.json())
        print 'Inserted data for ', sn
    except:
        print sn , "Skipping"
        client.close()
        return 0
    client.close()
    return 1

def getBatchPage(pageNum):

    url = ''.join(['http://chroniclingamerica.loc.gov/batches/',str(pageNum),'.json'])
    r = requests.get(url,headers=headers)
    resp = r.json()
    issueURLs = []
    batchURLs = []
    print 'Collecting SN data'
    for batch in resp['batches']:
        for sn in batch['lccns']:
            getSNData(sn)
        batchURLs.append(batch['url'])

    # print batchURLs
    for batch in batchURLs:
        issueURLs += getBatch(batch)

    issueURLs = [item for sublist in issueURLs for item in sublist]
    print 'Page',pageNum, 'collected', len(issueURLs), 'documents'
    # print issueURLs[0]

    poolSize = 120
    print time.strftime("%Y-%m-%d %H:%M:%S"), "Starting pool of size {0} for {1} documents from page {2}".format(poolSize,len(issueURLs),pageNum)
    pool = Pool(poolSize)
    n = 50
    success = sum(pool.map(getText,(issueURLs[i:i+n] for i in xrange(0, len(issueURLs), n))))
    pool.close()
    print time.strftime("%Y-%m-%d %H:%M:%S"), "Closing  pool.    Got {0} of  {1}            for page {2}".format(success,len(issueURLs),pageNum)

    return len(issueURLs)

if __name__ == '__main__':
    print time.strftime("%Y-%m-%d %H:%M:%S")
    batchPages = range(1,53)
    for batch in batchPages:
        print time.strftime("%Y-%m-%d %H:%M:%S"), 'Page', batch
        getBatchPage(batch)
    print time.strftime("%Y-%m-%d %H:%M:%S")
