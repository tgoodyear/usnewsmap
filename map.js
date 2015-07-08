document.body.innerHTML += '<div id="map" ng-app="myApp" ng-controller="customersCtrl"></div>';
document.getElementById("map").style.height = "500px";
document.body.innerHTML +=  '<input type="text" id="amount" size="100" readonly style="border:0; color:#f6931f; font-weight:bold;">'

document.body.innerHTML += '<div id="slider"></div>';
document.body.innerHTML += '<p>Date from <input type="text" id="datepicker1"> to <input type="text" id="datepicker2"> </p>'
document.body.innerHTML += '<p>Search for <input type="text" id="searchterm">     <input type="submit" value="Search"></p>';


        


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

// var marker = L.marker([32.4117889404,-87.0222320557]).addTo(map)
// marker.bindPopup("<b>Hello world!</b><br>I am a popup.");
// date_field:[1914-03-06T23:59:59.999Z TO 1914-03-07T23:59:59.999Z]
// goes from 1836 - 1922 , 36,890 days difference
var app = angular.module('myApp', []);
app.controller('customersCtrl', function($scope, $http) {
    $http.get("http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B1914-03-06T23%3A59%3A59.999Z+TO+1914-03-07T23%3A59%3A59.999Z%5D%2C+text%3A%22christmas%22&rows=100&wt=json&indent=true")
    .success(function (response){console.log(response.response);
    for (i = 0; i < response.response.docs.length; i++) { 
        var datum = response.response.docs[i];
        var loc = datum.loc.split(',');
        var mark = L.marker([parseFloat(loc[0]),parseFloat(loc[1])]).addTo(map);
        mark.bindPopup("<b>" + datum.city + "," + datum.state+"</b><br>"+datum.seq_num);

    }

$(function() {
    $( "#slider" ).slider({ 
        range: true,
        value:36890,
        min: 0,
        max: 36890,
        step: 1,
        slide: function( event, ui ) {
            $( "#datepicker1" ).val( new Date( -4228675200000 +  $( "#slider" ).slider( "values",0 )*86400000).toLocaleDateString("en-US"));
            $( "#datepicker2" ).val( new Date( -4228675200000 +  $( "#slider" ).slider( "values",1 )*86400000).toLocaleDateString("en-US"));
            }
        });
    $( "#datepicker1" ).val( new Date( -4228675200000 +  $( "#slider" ).slider( "values",0 )*86400000).toLocaleDateString("en-US"));
    $( "#datepicker2" ).val( new Date( -4228675200000 +  $( "#slider" ).slider( "values",1 )*86400000).toLocaleDateString("en-US"));
  });

 $(function() {
    $( "#datepicker1" ).datepicker({
        changeMonth: true,
        changeYear: true,
        minDate: "-65568D", 
        maxDate: "-33792D", 
        onClose: function(selectedDate) {
            var val = (new Date(selectedDate).getTime() + 4228675200000)/86400000;
            $( "#slider" ).slider( "option", "values", [val, $( "#slider" ).slider( "values",1 )] );
        }  
    });
   
  });

 $(function() {
    $( "#datepicker2" ).datepicker({
        changeMonth: true,
        changeYear: true,
        minDate: "-65568D", 
        maxDate: "-33792D",
        onClose: function(selectedDate) {
            var val = (new Date(selectedDate).getTime() + 4228675200000)/86400000;
            $( "#slider" ).slider( "option", "values", [$( "#slider" ).slider( "values",0),val]);
        }
    });
  });




  });
});

 