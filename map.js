var app = angular.module("myApp", ['leaflet-directive','ngRangeSlider']);
app.controller("MapCtrl", [ "$scope","$http","leafletData", "leafletBoundsHelpers", "leafletEvents",function($scope, $http, leafletData, leafletBoundsHelpers, leafletEvents) {
    
    


    var bounds = leafletBoundsHelpers.createBoundsFromArray([
        [ 24.11567, -125.73004 ],
        [50.38407, -65.94975 ],
    ]);


    var tiles = {
        url: "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}",
        options: {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            maxZoom: 18,
            id: 'zsuffern0614.2ed6b495',
            accessToken: 'pk.eyJ1IjoienN1ZmZlcm4wNjE0IiwiYSI6IjVlNWFkYjQwZDc0ZTY0OTZmMDQyMzM4NmVmMjFmNWNiIn0.oZhSA6w9Pgv3ISwLjP7vTQ'
        }
    }

    

    $scope.searchT = function(){
        getMarkers();
    };


    function getMarkers(){
        $scope.markers = [];
        var startDate  = $scope.startDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');
        var endDate = $scope.startDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');
        var search = $scope.search.replace(" ","+");
        $http.get("http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B" + startDate + "+TO+" + endDate + "%5D+%0Atext%3A%22" + search + "%22&wt=json&indent=true")
        .success(function (response){
            for (i = 0; i < response.response.docs.length; i++) { 
                var datum = response.response.docs[i];
                var loc = datum.loc.split(',');
                var mark = ({
                    lat:(parseFloat(loc[0]) + Math.random()/10-0.05),
                    lng:(parseFloat(loc[1]) + Math.random()/10-0.05),
                    message: "<b>" + datum.city + "," + datum.state+"</b><br>"+datum.seq_num,
                    /*icon: {
                        iconSize:  [19, 46], // size of the icon
                        iconUrl : "leaflet/images/marker-icon-Grey.png"
                    },*/
                    icon:{},
                    text_msg : datum.text
                });
                $scope.markers.push(mark);
            }
        })
    }

    angular.extend($scope, {
        search : "Georgia Institute of Technology",
        maxbounds: bounds,
        center: {
            lat: 39.82825,
            lng: -98.5795,
            zoom: 4
        },
        tiles: tiles,
        markers: [],
        range: { 
            from: 0, 
            to: 36890 
        },
        startDate: new Date( "1836-01-02"),
        endDate: new Date("1923-01-01"),
        events : {
            markers: {
                enable: leafletEvents.getAvailableMarkerEvents(),
            }
        },
        text: "hi mom"
    });

               
    var markerEvents = leafletEvents.getAvailableMarkerEvents();
    for (var k in markerEvents){
        var eventName = 'leafletDirectiveMarker.' + markerEvents[k];
        $scope.$on(eventName, function(event, args){
            if(event.name == "leafletDirectiveMarker.click"){
                var k = args.leafletObject.options.text_msg.replace($scope.search,"<mark>"+$scope.search+"</mark>");
                $scope.text = k;
            }
        });
    }
    
    getMarkers();

}]);



//http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B1836-01-02T00%3A00%3A00%3A000Z+TO+1839-01-02T00%3A00%3A00%3A000Z%5D%2C+text%3A%22christmas%22&rows=100&wt=json&indent=true
//http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B1836-01-02T00%3A00%3A00%3A000Z+TO+1900-01-02T00%3A00%3A00%3A000Z%5D+&wt=json&indent=true
//http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B1836-01-02T00%3A00%3A00%3A000Z+TO+1836-01-02T00%3A00%3A00%3A000Z%5D%2C+text%3A%22Georgia%20Institute%20of%20Technology%22&rows=1000&wt=json&indent=true
//http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B1836-01-02T00%3A00%3A00%3A000Z+TO+1900-01-02T00%3A00%3A00%3A000Z%5D+%0Atext%3A%22georgia+tech%22&wt=json&indent=true
//date_field:[1836-01-02T00:00:00:000Z TO 1900-01-02T00:00:00:000Z] 


// var marker = L.marker([32.4117889404,-87.0222320557]).addTo(map)
// marker.bindPopup("<b>Hello world!</b><br>I am a popup.");
// date_field:[1914-03-06T23:59:59.999Z TO 1914-03-07T23:59:59.999Z]
// goes from 1836 - 1922 , 36,890 days difference

 