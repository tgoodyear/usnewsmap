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

if __name__ == '__main__':
    application.run(debug=True,host='0.0.0.0',port=80)
