

//The name of the app, we also use leaflet-directive for the map and ngRangeSlider for the slider.
var app = angular.module("loc", ['leaflet-directive','ngRangeSlider','angular-horizontal-timeline']);
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
            accessToken: 'pk.eyJ1IjoienN1ZmZlcm4wNjE0IiwiYSI6IjVlNWFkYjQwZDc0ZTY0OTZmMDQyMzM4NmVmMjFmNWNiIn0.oZhSA6w9Pgv3ISwLjP7vTQ'//mystuff
        }
    }

    //This function actually queries the solr database and create a list of markers.
    $scope.getMarkers = function(){
        if(!$scope.search){
            
            return false;
        }

    	//We want to clear any visible markers when doing a new search.


        //Get query data, self explanatory
        var startDate  = $scope.startDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');
        var endDate = $scope.endDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');
        var search = $scope.search.split(" ").join("+");
        var url = "http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B" + startDate + "+TO+" + endDate + "%5D+%0Atext%3A%22" + search + "%22&wt=json&rows=1000&indent=true";
        var fields = '&fl=loc,date_field,id,city,state,ed,seq,seq_num';
        url += fields;

        //On successful get call we go through the responses, which solr gives back as a json object and parse it.
        $http.post('http://130.207.211.77/loc_api/get_data',{"url":url,"search":$scope.search})
        .success(function (response){
            $scope.markers = [];
            $scope.allMarkers = [];
            $scope.finMarkers = response;
            $scope.eventTable = [];
            $scope.timelineEvents = [];
           // for (i = 0; i < response.length; i++) {
           //	mark = response.marks[i];
          //      $scope.allMarkers.push(mark);
         //    }
	   // console.log($scope.allMarkers);
          //  $scope.filter(true);
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
                $scope.showTimeLine = true;   
                $scope.timelineEvents = $scope.eventTable[args.leafletObject.options.lat];
            }
        });
    }


    $scope.popupText = function(){
        var myWindow = window.open("", "FullPage");
        myWindow.document.write($scope.popupTextData);
    }

    $scope.turnOn = function(){
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
    
	 $http.post('http://130.207.211.77/loc_api/update',{"date":$scope.rangeDate.toISOString()})
        .success(function (response){
		$scope.finMarkers = response;
	})	

	/*

        $scope.rangeDate = new Date($scope.range/1);//Figureout the ole.log(response.marks);
//ate that the range slider is on. Apparently $scope.range is a string and dividing by 1 turns it into a number.

        var curr;//Our current marker.
        if ($scope.markers.length  == 0){//if there are no markers, go ahead and push the oldest marker onto the stack.
            $scope.markers.push($scope.allMarkers[0]);
        }

        if( $scope.markers.length > 0 && $scope.markers.length <= $scope.allMarkers.length){//I dont think this is actually used for anything.
            curr = $scope.markers.pop();//we pop the top marker off the stack we then compare to our ranegDate to see if we need to add or remove markers from the stack.
            //if(!curr || !curr.hasOwnProperty('date')){
               // return;
            //}
           if (curr['date'] < new Date($scope.range/1)){//we need to add markers in this scenario
                $scope.markers.push(curr);
                while ($scope.markers.length < $scope.allMarkers.length){//make sure that we don't go outside the allMarkers array.
                    curr = $scope.allMarkers[$scope.markers.length];//get the next marker that we are going to check.
                    if (curr['date'] <= new Date($scope.range/1)){//If that marker is still less then the date we are att, push it onto the stack and go back to the beggining of the while loop.
                        $scope.markers.push(curr);
                    }else{
                        $scope.cityLoc();
                        return;//we cant add anymore so stop the function
                    }
                }
            }else  if (curr['date'] > new Date($scope.range/1)){ //remove markers
                while ( $scope.markers.length > 0 ){//as long as there are still markers to remove
                    curr = $scope.markers.pop();
                    if (curr['date'] <= new Date($scope.range/1)){//pop off the marker if it is younger then the date redo the loop, else we've reached the date we wanted and so we push the marker back on the stack and end the function.
                        $scope.markers.push(curr);
                        $scope.cityLoc()
                        return;
                    }
                }

            }
            $scope.cityLoc();
        }*/
    }

/*
    $scope.cityLoc = function(){
	console.log("city loc");
	console.log($scope.markers);
        $scope.eventTable = [];
        $scope.timelineEvents = [];

        var finMark = {};
        $scope.finMarkers = [];

        for(mark in $scope.markers){
            if($scope.markers[mark].date <= $scope.rangeDate){
                finMark[$scope.markers[mark].lat] = $scope.markers[mark];
                var curr = $scope.markers[mark];
                if($scope.eventTable[curr.lat] == null){
                    $scope.eventTable[curr.lat] = [];
                }
                $scope.eventTable[curr.lat].push({"date":curr.timeDate,"content":"<p>"+curr.lat+"</p>","id":curr.nid, "search":curr.search, "url": "http://chroniclingamerica.loc.gov/lccn/"+curr.seq_num+"/"+curr.year+"-"+curr.month+"-"+curr.day+"/"+curr.ed+"/"+curr.seq+".pdf"})
        
            }
        }


        for (mark in $scope.allMarkers){
            var curr = $scope.allMarkers[mark];
            if($scope.eventTable[curr.lat] != null){
                curr.message =  curr.city + "," + curr.state + "\n" + $scope.eventTable[curr.lat].length;
            }
        }

        for (x in finMark){
            $scope.finMarkers.push(finMark[x]);
        }

        
        
    }*/
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

}]);

//http://130.207.211.77:8983/solr/loc/select?q=id%3A+%22834903f4-55f4-40eb-9608-7aadbf41d6c2%22&wt=json&indent=true


//http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B1836-01-02T00%3A00%3A00%3A000Z+TO+1925-01-01T00%3A00%3A00%3A000Z%5D+%0Atext%3A%22lincoln%22&wt=json&rows=1000&indent=true&fl=loc,date_field,id,city,state
