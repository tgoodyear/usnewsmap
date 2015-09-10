import requests
import re
import logging
import sys
import traceback
import simplejson as json
import datetime
from flask import Flask, request, jsonify, Response
from flask.ext.cors import CORS
from flask.ext.restplus import Api, Resource, fields, apidoc


logging.basicConfig(stream=sys.stderr)

application = Flask(__name__)


@application.route('/')
def home():
	return "hello"

@application.route('/get_data', methods=['GET', 'POST'])
def milk():
	if request.method == 'POST':
		marks ={'marks': []} 
		data = json.loads(request.data)
		url = data['url']
		search = data['search']
        	r = requests.get(url)
		data = json.loads(r.text)
		for d in data['response']['docs']:
			loc = d['loc'].split(",")
			dats = map(int, d['date_field'].split("T")[0].split("-"))
			date = datetime.date(dats[0],dats[1],dats[2]).isoformat()
			mark = {'lat':float(loc[0]),
				'lng':float(loc[1]),
				'timeDate':str(dats[1])+'/'+str(dats[2])+'/'+str(dats[0]),
				'message':d['city']+','+d['state']+"\n",
				'city':d['city'],
				'state':d['state'],
				'year':dats[0],
				'month':dats[1],
				'day':dats[2],
				'ed':d['ed'],
				'seq':d['seq'],
				'seq_num':d['seq_num'],
				'icon':{},
				'nid':d['id'],
				'text_msg':'',
				'date':date,
				'group':'us',
				'search':search
			}
			marks['marks'].append(mark)
		return json.dumps(marks)
	else:
		return "git milk"




if __name__ == '__main__':
    application.run(debug=True,host='0.0.0.0',port=80)
