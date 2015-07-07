document.getElementById("map").style.height = "500px";


var maxBounds = [
    [24.11567, -125.73004], //Southwest
    [50.38407 , -65.94975]  //Northeast
];

var map = L.map('map', {
    'center': [0, 0],
    'zoom': 0,
    'maxBounds': maxBounds
}).fitBounds(maxBounds);

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'zsuffern0614.2ed6b495',
    accessToken: 'pk.eyJ1IjoienN1ZmZlcm4wNjE0IiwiYSI6IjVlNWFkYjQwZDc0ZTY0OTZmMDQyMzM4NmVmMjFmNWNiIn0.oZhSA6w9Pgv3ISwLjP7vTQ'
}).addTo(map);

var marker = L.marker([32.4117889404,-87.0222320557]).addTo(map)
marker.bindPopup("<b>Hello world!</b><br>I am a popup.");

var app = angular.module('myApp', []);
app.controller('customersCtrl', function($scope, $http) {
  $http.get("http://130.207.211.77:8983/solr/loc/select?q=*%3A*&wt=json&indent=true")
  .success(function (response){$scope.names = response.records; console.log($scope.names);});
});

 