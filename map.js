



//The name of the app, we also use leaflet-directive for the map and ngRangeSlider for the slider. 
var app = angular.module("myApp", ['leaflet-directive','ngRangeSlider']);
app.controller("MapCtrl", [ "$scope","$http","$sce",'$interval',"leafletData", "leafletBoundsHelpers", "leafletEvents",function($scope, $http, $sce, $interval, leafletData, leafletBoundsHelpers, leafletEvents) {
    
    //These are the bounds of the map, currently centered on the contenental US. 
    var bounds = leafletBoundsHelpers.createBoundsFromArray([
        [24.11567, -125.73004 ],//Northeast
        [50.38407, -65.94975 ],//Southwest
    ]);

    //This gets the actual tiles that form the map. Currently we are using my account and access token, we probably want to change that. 
    var tiles = {
        url: "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}",
        options: {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            maxZoom: 18,
            id: 'zsuffern0614.2ed6b495',
            accessToken: 'pk.eyJ1IjoienN1ZmZlcm4wNjE0IiwiYSI6IjVlNWFkYjQwZDc0ZTY0OTZmMDQyMzM4NmVmMjFmNWNiIn0.oZhSA6w9Pgv3ISwLjP7vTQ'
        }
    }

    //This function actually queries the solr database and create a list of markers. 
    $scope.getMarkers = function(){
    	//We want to clear any visible markers when doing a new search. 
        $scope.markers = [];
        //Get query data, self explanatory
        var startDate  = $scope.startDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');
        var endDate = $scope.endDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');
        var search = $scope.search.split(" ").join("+");
        var url = "http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B" + startDate + "+TO+" + endDate + "%5D+%0Atext%3A%22" + search + "%22&wt=json&rows=1000&indent=true";
        
        //On successful get call we go through the responses, which solr gives back as a json object and parse it.     
        $http.get(url)
        .success(function (response){
            for (i = 0; i < response.response.docs.length; i++) { 
                var datum = response.response.docs[i];
                var loc = datum.loc.split(',');
                var dats = datum.date_field.split("T")[0].split("-");
                var date = new Date(dats[0],dats[2],dats[1])
               
                //Creating individual makers for the map. 
                var mark = ({
                	//All markers have a lat and long which are slightly offset in order to show multiple newspapers from the same place. 
                    lat:(parseFloat(loc[0]) + Math.random()/10-0.05),
                    lng:(parseFloat(loc[1]) + Math.random()/10-0.05),
                    //This is the popup msg when you click on a marker on the map. 
                    message: "<b>" + datum.city + "," + datum.state+"</b><br>"+dats[1]+"/"+dats[2]+"/"+dats[0],
                   	//These next two are for icons for when we can switch between two different icons, currently not in use. 
                    /*icon: {
                        iconSize:  [19, 46], // size of the icon
                        iconUrl : "leaflet/images/marker-icon-Grey.png"
                    },*/
                    icon:{},
                    //This holds all the newspaper text.  
                    text_msg : datum.text,
                    //date of the newspaper
                    date: date
                });
				//Push the marker to the allMarkers array which hold all the markers for the search. This is just a holding array and its contents are never shown to the screen. 
                $scope.allMarkers.push(mark);
            }
            //This sorts the allmarkers array by date. If we can do this in solr by date it might be faster then in client. 
            $scope.allMarkers.sort(function(a,b){
                if (a.date < b.date){
                    return -1;
                }else{
                    return 1; 
                }
            });
            //Once we have done searching, we will then call the filter function which will actually print the markers to the screen. 
            $scope.filter();
        })
    }

    //All of the $scope variables
    angular.extend($scope, {
        search : "",//Our Search term
        maxbounds: bounds,//THe bounds of the map, see the var bounds above.
        center: {//This is the center of our map, which is currently over the geographical center of the continental US. 
            lat: 39.82825,
            lng: -98.5795,
            zoom: 4
        },
        tiles: tiles,//This is the var tiles from above.
        markers: [],//The markers array which is actually shown, used in filter()
        allMarkers : [],//The marker holder array used in getMarkers()
        startDate: new Date( "1836-01-02"),//The earliest date possible for search queries.   
        endDate: new Date("1925-01-01"),//The latest date possible for search queries.
        range : new Date("1925-01-01").getTime(),//The range bar value, set to miliseconds since epoch and changed by the slider. 
        rangeDate : new Date("1925-01-01"),//The date represented by the slider and range value.
        events : {//Possible events the can affact the markers. Black Magic Voodoo
            markers: {
                enable: leafletEvents.getAvailableMarkerEvents(),
            }
        },
        isPlaying : false,//For the play button. Switches between true and false when play button is pressed. 
        text: $sce.trustAsHtml("TO HELL WITH GEORGIA!!!")//The actual text shown on the screen. Is taken in as HTML so one can highlight text. Causes problems when the documents are so messed up that they inadventernatly make html statements.        
    });

               
    //Event listener for interacting with markers
    var markerEvents = leafletEvents.getAvailableMarkerEvents();
    for (var k in markerEvents){
        var eventName = 'leafletDirectiveMarker.' + markerEvents[k];
        $scope.$on(eventName, function(event, args){
            if(event.name == "leafletDirectiveMarker.click"){
                var k = args.leafletObject.options.text_msg;
                k = k.replace(new RegExp($scope.search, 'gi'), '<span class="highlighted">'+$scope.search+'</span>')//Goes through the text document, searches for teh search term and highlights it. 
                $scope.text = $sce.trustAsHtml(k);//replaces the text variable with the chosen marker text.
            }
        });
    }
    
    //This function is what figures out which markers to show on the map. Uses $scope.markers as a stack. Since the markers in $scope.allMarkers are already
    //sorted, as we push from the beginning of allMarkers to markers, we guarentee that the oldest markes will be at the bottom of the stack and the "youngest"
    //markers are on the stack. So when we have to remove or add markers, we just have to pop or push to the stack instead of rewriting the stack everytime.
    //Still can use refinments, slows down when moving fast over alot of markers, I think one of the problems is that the function is called with ng-move so
    //it is being called alot when the mouse is near it, causing slowdown.
    $scope.filter = function(){
        $scope.rangeDate = new Date($scope.range/1);//Figureout the date that the range slider is on. Apparently $scope.range is a string and dividing by 1 turns it into a number.

        var curr;//Our current marker.
        if ($scope.markers.length  == 0){//if there are no markers, go ahead and push the oldest marker onto the stack. 
            $scope.markers.push($scope.allMarkers[0]);
        }

        if( $scope.markers.length > 0 && $scope.markers.length <= $scope.allMarkers.length){//I dont think this is actually used for anything. 
            curr = $scope.markers.pop();//we pop the top marker off the stack we then compare to our ranegDate to see if we need to add or remove markers from the stack. 
            if (curr['date'] < new Date($scope.range/1)){//we need to add markers in this scenario
                $scope.markers.push(curr);
                while ($scope.markers.length < $scope.allMarkers.length){//make sure that we don't go outside the allMarkers array.  
                    curr = $scope.allMarkers[$scope.markers.length];//get the next marker that we are going to check.
                    if (curr['date'] <= new Date($scope.range/1)){//If that mark 
                        $scope.markers.push(curr);
                    }else{
                        return;//we cant add anymore
                    }
                }
            }else  if (curr['date'] > new Date($scope.range/1)){ //remove markers
                while ( $scope.markers.length > 0 ){
                    curr = $scope.markers.pop();
                    if (curr['date'] <= new Date($scope.range/1)){
                        $scope.markers.push(curr);
                        return;
                    }
                }

            }
        }
    }

    $scope.play = function(){
        $scope.isPlaying = !$scope.isPlaying;
        if ($scope.isPlaying){
            $interval($scope.playRange,100);
        }
    }


    $scope.playRange = function(){
        if($scope.isPlaying && new Date($scope.range/1) <= $scope.endDate){
            $scope.range = new Date(($scope.range/1) + 86400000).getTime();
            $scope.rangeDate = new Date($scope.range/1);
            $scope.filter();
        }else if (!$scope.isPlaying){
           $interval.cancel($scope.playRange);
        }else{
            $scope.isPlaying = !$scope.isPlaying;
        }
    }

    $scope.updateRange = function(){
    	$scope.range = $scope.rangeDate.getTime();
    	$scope.filter();
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
