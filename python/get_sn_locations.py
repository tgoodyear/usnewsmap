import pymongo
import sys
import requests

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
    textSearchURL = ''.join(['https://maps.googleapis.com/maps/api/place/textsearch/json?query=',q,'&key=',googlePlacesKey])
    r = requests.get(textSearchURL)
    resp = r.json()
    # print q
    # print r.text
    placeID = resp['results'][0]['place_id']

    placeDetailURL = ''.join(['https://maps.googleapis.com/maps/api/place/details/json?key=',googlePlacesKey,'&placeid=',placeID])
    r = requests.get(placeDetailURL)
    resp = r.json()

    city = ''
    state = ''
    result = resp['result']
    for addr in result['address_components']:
        if 'locality' in addr['types']:
            city = addr['short_name']
        elif 'administrative_area_level_1' in addr['types']:
            state = addr['short_name']
    lat = result['geometry']['location']['lat']
    lon = result['geometry']['location']['lng']
    print q, '-', city, state, str(lat), str(lon)


    # break
