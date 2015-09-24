

//The name of the app, we also use leaflet-directive for the map and ngRangeSlider for the slider.
var app = angular.module("loc", ['leaflet-directive','ngRangeSlider']);
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
            // attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            attribution: '',
            maxZoom: 18,
            id: 'zsuffern0614.2ed6b495',//my stuff
            accessToken: 'pk.eyJ1IjoienN1ZmZlcm4wNjE0IiwiYSI6IjVlNWFkYjQwZDc0ZTY0OTZmMDQyMzM4NmVmMjFmNWNiIn0.oZhSA6w9Pgv3ISwLjP7vTQ',//mystuff
	    continuousWorld: false,
        // This option disables loading tiles outside of the world bounds.
            noWrap: true
        }
    }

    //This function actually queries the solr database and create a list of markers.
    $scope.getMarkers = function(){
        if(!$scope.search){
            return false;
        }

    	//We want to clear any visible markers when doing a new search.
        $scope.markers = [];
        $scope.allMarkers = [];
        $scope.finMarkers = [];
        $scope.eventTable = [];
        $scope.timelineEvents = [];

        //Get query data, self explanatory
        var startDate  = $scope.startDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');
        var endDate = $scope.endDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');
        var search = $scope.search.split(" ").join("+");
        var url = "http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B" + startDate + "+TO+" + endDate + "%5D+%0Atext%3A%22" + search + "%22&wt=json&rows=10&indent=true";
        var fields = '&fl=loc,date_field,id,city,state,ed,seq,seq_num';
        url += fields;

        //On successful get call we go through the responses, which solr gives back as a json object and parse it.
        $http.post('http://130.207.211.77/loc_api/get_data',{"url":url,"search":$scope.search,"mongo_id":$scope.mongo_id})
        .success(function (response){
            
            if (typeof response != 'undefined'){
                $scope.finMarkers = response;
            }
        })
    }

    //All of the $scope variables
    angular.extend($scope, {
	mongo_id : Math.floor((Math.random() * 100000) + 1),
        search : "",//Our Search term
        maxbounds: bounds,//THe bounds of the map, see the var bounds above.
        center: {//This is the center of our map, which is currently over the geographical center of the continental US.
            lat: 39.82825,
            lng: -98.5795,
            zoom: 4
        },
        tiles: tiles,//This is the var tiles from above.
        markers: [],//The markers  array which is actually shown, used in filter()
        finMarkers : [],
        allMarkers : [],//The marker holder array used in getMarkers()
        eventTable : [],
        timelineEvents : [],
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
        isOn : false,
        textShown : false,
        showTimeLine : false,
        popupTextData : "",
        text: $sce.trustAsHtml(" ")//The actual text shown on the screen. Is taken in as HTML so one can highlight text. Causes problems when the documents are so messed up that they inadventernatly make html statements.
    });


    //Event listener for interacting with markers
    var markerEvents = leafletEvents.getAvailableMarkerEvents();
    for (var k in markerEvents){
        var eventName = 'leafletDirectiveMarker.' + markerEvents[k];
        $scope.$on(eventName, function(event, args){
            if(event.name == "leafletDirectiveMarker.click"){
                var l = args.leafletObject.options.nid;
                $scope.getMetaData(args.leafletObject.options);
            }
        });
    }


    $scope.popupText = function(){
        var myWindow = window.open("", "FullPage");
        myWindow.document.write($scope.popupTextData);
    }

    $scope.turnOn = function(){
 	$scope.rangeDate = new Date($scope.range/1);
        $scope.isOn = !$scope.isOn;//Flips $scope.isOnx to its inverse
    }
    //This function is what figures out which markers to show on the map. Uses $scope.markers as a stack. Since the markers in $scope.allMarkers are already
    //sorted, as we push from the beginning of allMarkers to markers, we guarentee that the oldest markes will be at the bottom of the stack and the "youngest"
    //markers are on the stack. So when we have to remove or add markers, we just have to pop or push to the stack instead of rewriting the stack everytime.
    //Still can use refinments, slows down when moving fast over alot of markers, I think one of the problems is that the function is called with ng-move so
    //i`t is being called alot when the mouse is near it, causing slowdown.
    $scope.filter = function(filter){
      	
    	filter = typeof filter !== 'undefined' ? filter : false;
        if (!$scope.isPlaying && !$scope.isOn && !filter){return;};
    	 $scope.rangeDate = new Date($scope.range/1);
	 $http.post('http://130.207.211.77/loc_api/update',{"date":$scope.rangeDate.toISOString(),"mongo_id":$scope.mongo_id})
        .success(function (response){		
		if (typeof response != 'undefined'){
                	$scope.finMarkers = response;
            	}	
		else{
			$scope.finMarkers = [];
		}
	})	
    }

    //This function is called when you press the play/pause button.
    $scope.play = function(){
        $scope.isPlaying = !$scope.isPlaying;//Flips $scope.isPlaying to its inverse
        if ($scope.isPlaying){//if true we will have play range function be called every 100 seconds.
            $interval($scope.playRange,1000);
        }
    }


    //This function moves the range slider over, then calls filter(). This causes the effect of markers appearing over time.
    $scope.playRange = function(){
        var ONE_YEAR = 86400000 * 365.25; // 86400000 is the number of milliseconds in a day.
        if($scope.isPlaying && new Date($scope.range/1) <= $scope.endDate){
            $scope.range = new Date(($scope.range/1) + ONE_YEAR).getTime();
            $scope.rangeDate = new Date($scope.range/1);//update $scope.range and $scope.rangeDate to make sure they are the same since they are linked.
            $scope.filter();//call filter with new $scope.rangeDate
        }else if (!$scope.isPlaying){//When we press pause, stop moving ranger and cancel calling this function.
           $interval.cancel($scope.playRange);
        }else{//we've pressed the pause button, we will call this function one more time.
            $scope.isPlaying = !$scope.isPlaying;
        }
    }

    //Function that updates the slider when the user manually changes the current date, then filters.
    $scope.updateRange = function(){
    	$scope.range = $scope.rangeDate.getTime();
    	$scope.filter();
    }

    $scope.getMetaData = function(mark){
        $http.post('http://130.207.211.77/loc_api/news_meta',{"seq_num":mark['seq_num'],"year":mark['year'],"month":mark['month'],"day":mark['day'],"ed":mark['ed']})
        .success(function (response){
		//do stuff
        });

    }

}]);

//http://130.207.211.77:8983/solr/loc/select?q=id%3A+%22834903f4-55f4-40eb-9608-7aadbf41d6c2%22&wt=json&indent=true


//http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B1836-01-02T00%3A00%3A00%3A000Z+TO+1925-01-01T00%3A00%3A00%3A000Z%5D+%0Atext%3A%22lincoln%22&wt=json&rows=1000&indent=true&fl=loc,date_field,id,city,state
