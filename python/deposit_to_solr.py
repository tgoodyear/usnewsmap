import os, pymongo,csv,json,requests,sys
import simplejson as json

import datetime

HOME = sys.argv[1]#this must be directory holding all sn folders and only works for this type of data due to difficulty in getting dates. 
LOC_DATA = 'town_ref.csv'
DATA = {}
solr = 'http://130.207.211.77:8983/solr/loc/update/json?commit=true'
#http://130.207.211.77:8983/solr/loc/update?stream.body=%3Cdelete%3E%3Cquery%3E*:*%3C/query%3E%3C/delete%3E&commit=true
# curl -X POST -H 'Content-type:application/json' --data-binary '{"replace-field":{"name":"date_field","type":"date","stored":true }}' http://localhost:8983/solr/loc/schema
# curl -X POST -H 'Content-type:application/json' --data-binary '{"replace-field":{"name":"loc","type":"location","stored":true }}' http://localhost:8983/solr/loc/schema
# curl -X POST -H 'Content-type:application/json' --data-binary '{"replace-field":{"name":"seq_num","type":"string","stored":true }}' http://localhost:8983/solr/loc/schema
# curl -X POST -H 'Content-type:application/json' --data-binary '{"replace-field":{"name":"state","type":"string","stored":true }}' http://localhost:8983/solr/loc/schema
# curl -X POST -H 'Content-type:application/json' --data-binary '{"replace-field":{"name":"city","type":"string","stored":true }}' http://localhost:8983/solr/loc/schema
# curl -X POST -H 'Content-type:application/json' --data-binary '{"replace-field":{"name":"text","type":"text_en","stored":true }}' http://localhost:8983/solr/loc/schema

#curl http://localhost:8983/solr/update -H 'Content-type:application/json' --data-binary '<add><doc><field name="state">PR</field><field name="loc" update="set">18.406389,-66.063889</field> </doc> </add>'


counter = 0

def loop(path):
	global counter
	if counter%1000 == 0:
		print "gone through " + str(counter) + " files"
	os.chdir(path)
	folder_list = os.listdir(os.getcwd());
	for folder in folder_list:
		if os.path.isdir(folder):
			loop(path+"/"+folder)
			os.chdir(path)
		elif folder[-4:] == '.txt':k
			date = path.split('/')
			if len(date) > 8:
				counter = counter + 1
				directory = date[5]#might have to redo these to match pastec
				ed = date[9]
				seq = date[10]
				date = datetime.datetime(int(date[6]),int(date[7]),int(date[8])).isoformat()
				#date = date[6] +"-"+ date[7] +"-"+ date[8]+"T00:00:00Z"#might have to redo these to match pastec
				load_data(folder,date,directory,ed,seq)
			
				
	return

def load_data(filename,date,folder,ed,seq):
	with open(filename, 'rb') as afile:
		r = requests.get("http://chroniclingamerica.loc.gov/lccn/sn83045555/1889-11-21/ed-1.json")
	 	data = DATA[folder]
	 	#print {'seq_num':data[0],'city':data[1],'state':data[2],'ed':ed,'seq':seq,'loc':str(data[3]) + "," + str(data[4]),'date_field':date}
	 
	 	#k = json.dumps([{'seq_num':data[0],'city':data[1],'state':data[2],'ed':ed,'seq':seq,'loc':str(data[3]) + "," + str(data[4]),'date_field':date,'text':afile.read()}])
	 	#g = requests.post(solr,data=k)

		print r
	 




def import_data(data):
	with open(data, 'rb') as csvfile:
		spamreader = csv.reader(csvfile, delimiter=',')
		for row in spamreader:
			DATA[row[0]] = row

#http://130.207.211.77:8983/solr/loc/update?stream.body=%3Cdelete%3E%3Cquery%3E*:*%3C/query%3E%3C/delete%3E&commit=true
#yyyy-MM-dd'T'HH:mm:sss'Z'

#/storage/loc/downloads/sn

print HOME
import_data(LOC_DATA)
loop(HOME)

