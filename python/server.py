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
		url = request.data
        	r = requests.get(url)
		data = json.loads(r.text)
		for d in data['response']['docs']:
			loc = d['loc'].split(",")
			dats = map(int, d['date_field'].split("T")[0].split("-"))
			date = datetime.date(dats[0],dats[1],dats[2])
			print date
		return r.text
	else:
		return "git milk"




if __name__ == '__main__':
    application.run(debug=True,host='0.0.0.0',port=80)
