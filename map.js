var app = angular.module("myApp", ['leaflet-directive','ngRangeSlider']);
app.controller("MapCtrl", [ "$scope","$http","$sce","leafletData", "leafletBoundsHelpers", "leafletEvents",function($scope, $http, $sce, leafletData, leafletBoundsHelpers, leafletEvents) {
    
    


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
        $scope.getMarkers();
        $scope.filter();
    };


    $scope.getMarkers = function(){
        $scope.markers = [];
        var startDate  = $scope.startDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');
        var endDate = $scope.endDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');
        var search = $scope.search.split(" ").join("+");
        console.log(search);
        var url = "http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B" + startDate + "+TO+" + endDate + "%5D+%0Atext%3A%22" + search + "%22&wt=json&rows=1000&indent=true";
        console.log(url); 
        $http.get(url)
        .success(function (response){
            for (i = 0; i < response.response.docs.length; i++) { 
                var datum = response.response.docs[i];
                var loc = datum.loc.split(',');
                var dats = datum.date_field.split("T")[0].split("-");
                var mark = ({
                    lat:(parseFloat(loc[0]) + Math.random()/10-0.05),
                    lng:(parseFloat(loc[1]) + Math.random()/10-0.05),
                    message: "<b>" + datum.city + "," + datum.state+"</b><br>"+dats[1]+"/"+dats[2]+"/"+dats[0],
                    /*icon: {
                        iconSize:  [19, 46], // size of the icon
                        iconUrl : "leaflet/images/marker-icon-Grey.png"
                    },*/
                    icon:{},
                    text_msg : datum.text
                });
                $scope.allMarkers.push(mark);
            }
        })
    }

    angular.extend($scope, {
        search : "",
        maxbounds: bounds,
        center: {
            lat: 39.82825,
            lng: -98.5795,
            zoom: 4
        },
        tiles: tiles,
        markers: [],
        allMarkers : [],
        startDate: new Date( "1836-01-02"),
        endDate: new Date("1923-01-01"),
        range : new Date("1923-01-01").getTime(),
        events : {
            markers: {
                enable: leafletEvents.getAvailableMarkerEvents(),
            }
        },
        text: $sce.trustAsHtml("TO HELL WITH GEORGIA!!!")
    });

               
    var markerEvents = leafletEvents.getAvailableMarkerEvents();
    for (var k in markerEvents){
        var eventName = 'leafletDirectiveMarker.' + markerEvents[k];
        $scope.$on(eventName, function(event, args){
            if(event.name == "leafletDirectiveMarker.click"){
                console.log($scope.search);
                var k = args.leafletObject.options.text_msg;
                k = k.replace(new RegExp($scope.search, 'gi'), '<span class="highlighted">'+$scope.search+'</span>')
                $scope.text = $sce.trustAsHtml(k);
            }
        });
    }
    
    $scope.getMarkers();

    $scope.filter = function(){
        //console.log(new Date(dats[0],dats[2],dats[1],12));
        $scope.markers = $scope.allMarkers.splice(0,4);
    }

}]);


//http://www.stevespanglerscience.com/lab/experiments/liquid-nitrogen-ice-cream


//http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B1836-01-02T00%3A00%3A00%3A000Z+TO+1839-01-02T00%3A00%3A00%3A000Z%5D%2C+text%3A%22christmas%22&rows=100&wt=json&indent=true
//http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B1836-01-02T00%3A00%3A00%3A000Z+TO+1900-01-02T00%3A00%3A00%3A000Z%5D+&wt=json&indent=true
//http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B1836-01-02T00%3A00%3A00%3A000Z+TO+1836-01-02T00%3A00%3A00%3A000Z%5D%2C+text%3A%22Georgia%20Institute%20of%20Technology%22&rows=1000&wt=json&indent=true
//http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B1836-01-02T00%3A00%3A00%3A000Z+TO+1900-01-02T00%3A00%3A00%3A000Z%5D+%0Atext%3A%22georgia+tech%22&wt=json&indent=true
//date_field:[1836-01-02T00:00:00:000Z TO 1900-01-02T00:00:00:000Z] 


// var marker = L.marker([32.4117889404,-87.0222320557]).addTo(map)
// marker.bindPopup("<b>Hello world!</b><br>I am a popup.");
// date_field:[1914-03-06T23:59:59.999Z TO 1914-03-07T23:59:59.999Z]
// goes from 1836 - 1922 , 36,890 days difference

 