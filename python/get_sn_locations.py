import pymongo
import sys
import requests
import bson.json_util as json
import requests.packages.urllib3
requests.packages.urllib3.disable_warnings()

googlePlacesKey = 'AIzaSyCkg_j50ko1busYvHKvK9xs7BL9SadSL5Y'

client = pymongo.MongoClient()
db = client["loc"]
newspapersCollection = db["newspapers"]
locationCollection = db["locations"]

SNs = newspapersCollection.find()

for snDoc in SNs:
    sn = snDoc['lccn']
    if locationCollection.find_one({'sn':sn}):
        continue

    q = snDoc['place_of_publication']

    if not q:
        print "No place of publication for", sn
        continue

    textSearchURL = ''.join(['https://maps.googleapis.com/maps/api/place/textsearch/json?query=',q,'&key=',googlePlacesKey])
    r = requests.get(textSearchURL)
    resp = r.json()
    # print q
    # print r.text
    if len(resp['results']) == 0:
        print 'No results for', sn, "(",q,")"
        continue
    placeID = resp['results'][0]['place_id']

    placeDetailURL = ''.join(['https://maps.googleapis.com/maps/api/place/details/json?key=',googlePlacesKey,'&placeid=',placeID])
    r = requests.get(placeDetailURL)
    resp = r.json()

    city = ''
    state = ''
    result = resp['result']
    for addr in result['address_components']:
        if 'locality' in addr['types']:
            city = addr['long_name'].replace(' ','')
        elif 'administrative_area_level_1' in addr['types']:
            state = addr['short_name']
    lat = result['geometry']['location']['lat']
    lon = result['geometry']['location']['lng']
    obj = {'city':city,'state':state,'lat':lat,'long':lon,'sn': sn}

    print q, '-', json.dumps(obj)
    sameCoordinates =  locationCollection.find_one({'lat':lat,'lon':lon},{'_id':0})
    if sameCoordinates:
        print "\tSame Coords", sameCoordinates['sn']
        record = sameCoordinates
        record['sn'] = sn
        locationCollection.insert(record)
        continue

    sameCityState =  locationCollection.find_one({'city':city,'state':state},{'_id':0})
    if sameCityState:
        print "\tSame City/State", sameCityState['sn']
        record = sameCityState
        record['sn'] = sn
        locationCollection.insert(record)
        # print sn
        continue

    if city:
        locationCollection.insert(obj)
        print '\tInserted', json.dumps(obj)

    # break
