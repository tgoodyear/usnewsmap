import pymongo
import requests
import sys
from random import randint
from multiprocessing import Pool
import time

# url = 'http://chroniclingamerica.loc.gov/lccn/sn91066782/1907-10-01/ed-1/seq-1/ocr.txt'

headers = {'User-Agent': 'Georgia Tech Research Institute | trevor.goodyear@gtri.gatech.edu | usnewsmap.com'}

def getIssue(issue):
    time.sleep(randint(0,5))
    # Issue URL Example http://chroniclingamerica.loc.gov/lccn/sn91066782/1910-06-18/ed-1.json
    issueURL = issue['url']
    issueURLs = set()
    r = requests.get(issueURL,headers=headers)
    # print issueURL
    try:
        resp = r.json()
    except:
        print issueURL, 'has no valid JSON response'
        return issueURLs

    for page in resp['pages']:
        urlParts = page['url'].split('/')
        seq_num = urlParts[4]
        formattedDate = urlParts[5]
        edition = urlParts[6]
        seq = urlParts[7].split('.')[0]
        # Determine if we already have the document
        solrURL = ''.join(['http://130.207.211.77:8983/solr/loc/select?q=date_field:%22', formattedDate,
                    'T00:00:00.000Z%22%20AND%20seq:',seq,'%20AND%20seq_num:',seq_num,'%20AND%20ed:',
                    edition,'&wt=json&indent=false&fl=id'])
        r = requests.get(solrURL,headers=headers)
        resp = r.json()
        if resp['response']['numFound'] == 0:
            issueURLs.add(page['url'])

    return issueURLs

def getBatch(batchURL):
    print batchURL  # Example: http://chroniclingamerica.loc.gov/batches/batch_vtu_cauliflower_ver01.json

    r = requests.get(batchURL,headers=headers)
    resp = r.json()

    pool = Pool(256)
    issueURLs = pool.map(getIssue,resp['issues'])
    pool.close()
    print issueURLs
    sys.exit(1)
    return issueURLs

def getBatchPage(pageNum):
    client = pymongo.MongoClient()
    db = client["loc"]
    newsCollection = db["newspapers"]

    url = ''.join(['http://chroniclingamerica.loc.gov/batches/',str(pageNum),'.json'])
    r = requests.get(url,headers=headers)
    # print r, url
    resp = r.json()
    issueURLs = []
    batchURLs = []
    for batch in resp['batches']:
        batchURLs.append(batch['url'])

    # print batchURLs
    for batch in batchURLs:
        issueURLs += getBatch(batch)

    print 'Page',pageNum, 'collected', len(issueURLs), 'documents'
    client.close()
    return batchURLs

if __name__ == '__main__':
    batchPages = [1]
    issueURLs = set()
    for batch in batchPages:
        issueURLs |= getBatchPage(batch)
