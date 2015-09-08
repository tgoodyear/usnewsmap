import requests
import re
import logging
import sys
import traceback
import simplejson as json
from flask import Flask, request, jsonify, Response
from flask.ext.cors import CORS
from flask.ext.restplus import Api, Resource, fields, apidoc


logging.basicConfig(stream=sys.stderr)

application = Flask(__name__)


@application.route('/')
def home():
	return "hello"

@application.route('/get_data')
def milk():
    url = 'http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B1836-01-02T00%3A00%3A00%3A000Z+TO+1925-01-01T00%3A00%3A00%3A000Z%5D+%0Atext%3A%22lincoln%22&wt=json&rows=1000&indent=true&fl=loc,date_field,id,city,state,ed,seq,seq_num'
	r = requests.get(url)
	return r.json

if __name__ == '__main__':
    application.run(debug=True,host='0.0.0.0',port=80)
