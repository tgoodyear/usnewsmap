import os, pymongo,csv,json,requests,sys
import simplejson as json
from multiprocessing import Pool

from time import gmtime, strftime
import datetime, time
import random

HOME = sys.argv[1]#this must be directory holding all sn folders and only works for this type of data due to difficulty in getting dates. 
LOC_DATA = '/home/tgoodyear/town_ref.csv'
DATA = {}
solr = ['130.207.211.77','130.207.211.78','130.207.211.79']
#http://130.207.211.77:8983/solr/loc/update?stream.body=%3Cdelete%3E%3Cquery%3E*:*%3C/query%3E%3C/delete%3E&commit=true
# curl -X POST -H 'Content-type:application/json' --data-binary '{"replace-field":{"name":"date_field","type":"date","stored":true }}' http://localhost:8983/solr/loc/schema
# curl -X POST -H 'Content-type:application/json' --data-binary '{"replace-field":{"name":"loc","type":"location","stored":true }}' http://localhost:8983/solr/loc/schema
# curl -X POST -H 'Content-type:application/json' --data-binary '{"replace-field":{"name":"seq_num","type":"string","stored":true }}' http://localhost:8983/solr/loc/schema
# curl -X POST -H 'Content-type:application/json' --data-binary '{"replace-field":{"name":"state","type":"string","stored":true }}' http://localhost:8983/solr/loc/schema
# curl -X POST -H 'Content-type:application/json' --data-binary '{"replace-field":{"name":"city","type":"string","stored":true }}' http://localhost:8983/solr/loc/schema
# curl -X POST -H 'Content-type:application/json' --data-binary '{"replace-field":{"name":"text","type":"text_en","stored":true }}' http://localhost:8983/solr/loc/schema



counter = 0

def loop(path):
	global counter
	path = path
	os.chdir(path)
	folder_list = os.listdir(os.getcwd());
	dat = []
	for folder in folder_list:
		dat.append(load_folder(folder,path,counter))
	if len(dat) == 0:
		return
	elif not dat[0]:
		return
	randint = random.randint(0,99)
	solrNode = 0
	if randint<15:
		solrNode = 2
	elif randint < 30:
		solrNode = 1
	
	if random.randint(0,1000) == 1:
		print strftime("%Y-%m-%d %H:%M:%S"),"Sending", len(dat), "documents to",solrNode
	
	payload = json.dumps(dat)
	commit = "?commit=true" if random.randint(0,5000) == 1 else ""
	try:
		url = ''.join(['http://',solr[solrNode],':8983/solr/loc_cloud/update',commit])
		h = {'Content-type':'application/json'}
		g = requests.post(url,data=payload,headers=h)
		if commit:
			print "\n\n\n\nCommitted\n\n\n\n"
	except Exception as e:
		print e,"retrying. Node", solrNode,"failed"
		time.sleep(5)
		loop(path)

	return

def load_folder(folder,path,counter):
	dat = {}
	if os.path.isdir(folder):
		loop(path+"/"+folder)
		os.chdir(path)
	elif folder[-4:] == '.txt':
		date = path.split('/')
		if len(date) > 8:
			counter = counter + 1
			directory = date[5]#might have to redo these to match pastec
			ed = date[9]
			seq = date[10]
			date = datetime.datetime(int(date[6]),int(date[7]),int(date[8])).isoformat()
			#date = date[6] +"-"+ date[7] +"-"+ date[8]+"T00:00:00Z"#might have to redo these to match pastec
			dat = load_data(folder,date,directory,ed,seq)
	return dat

def load_data(filename,date,folder,ed,seq):
	with open(filename, 'rb') as afile:
	 	data = DATA[folder]
	 	#print {'seq_num':data[0],'city':data[1],'state':data[2],'ed':ed,'seq':seq,'loc':str(data[3]) + "," + str(data[4]),'date_field':date}
	 
	 	k = {'seq_num':data[0],'city':data[1],'state':data[2],'ed':ed,'seq':seq,'date_field':date,'text':afile.read()}
	 	# k = {'seq_num':data[0],'city':data[1],'state':data[2],'ed':ed,'seq':seq,'loc':str(data[3]) + "," + str(data[4]),'date_field':date,'text':afile.read()}
	 	#g = requests.post(solr,data=k)
		return k

		#print g.text
	 




def import_data(data):
	with open(data, 'rb') as csvfile:
		spamreader = csv.reader(csvfile, delimiter=',')
		for row in spamreader:
			DATA[row[0]] = row

#http://130.207.211.77:8983/solr/loc/update?stream.body=%3Cdelete%3E%3Cquery%3E*:*%3C/query%3E%3C/delete%3E&commit=true
#yyyy-MM-dd'T'HH:mm:sss'Z'

#/storage/loc/downloads/sn

if __name__ == '__main__':
	os.chdir(HOME)
	import_data(LOC_DATA)
	pools = 256
        folder_list = [HOME + d for d in os.listdir(os.getcwd())]
	if pools > 1:
	        pool = Pool(pools)
	        print "Started map with %d pools" % pools
	        pool.map(loop, folder_list)
	        print 'Success: %d of %d' %(success,count)
	        pool.close()
	else:
		for folder in folder_list:
			loop(folder)



#loop(HOME)

