import os
import pymongo
import requests
from random import randint
from time import sleep, strftime
from multiprocessing import Pool


snDir = '/storage/uga/loc/downloads/sn'

def getSNData(sn):
    client = pymongo.MongoClient()
    db = client["loc"]
    coll = db["newspapers"]
    url = ''.join(['http://chroniclingamerica.loc.gov/lccn/',sn,'.json'])
    if coll.find_one({"lccn":sn}):
        print sn , "Skipping"
        client.close()
        return 0

    sleepSecs = randint(0,5)
    print sn, "Sleeping", sleepSecs
    sleep(sleepSecs)
    r = requests.get(url)
    # print r.json()
    try:
        coll.insert(r.json())
    except:
        print sn , "Skipping"
        client.close()
        return 0
    client.close()
    return 1

if __name__ == '__main__':
    dirs = os.listdir(snDir)
    pools = 50
    if pools > 1:
        pool = Pool(pools)
        print "Started map with %d pools" % pools
        print 'Gathered data for',sum(pool.map(getSNData, dirs)), 'SNs'
        pool.close()
        print strftime("%Y-%m-%d %H:%M:%S"),"Pool closed"
    else:
        for sn in dirs:
            getSNData(sn)
