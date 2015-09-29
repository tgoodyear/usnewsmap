import pymongo
import csv


client = pymongo.MongoClient()
db = client["loc"]
coll = db["locations"]

def import_data():
	with open("town_ref.txt", 'rb') as csvfile:
		spamreader = csv.reader(csvfile, delimiter=',')
		for row in spamreader:
			coll.insert({"sn":row[0],"city":row[1],"state":row[2],"lat":row[3],"long":row[4]})


import_data()