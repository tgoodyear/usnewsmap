

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
    	//We want to clear any visible markers when doing a new search.
        $scope.markers = [];
        $scope.allMarkers = [];
        $scope.finMarkers = [];

        //Get query data, self explanatory
        var startDate  = $scope.startDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');
        var endDate = $scope.endDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');
        var search = $scope.search.split(" ").join("+");
        var url = "http://130.207.211.77:8983/solr/loc/select?q=date_field%3A%5B" + startDate + "+TO+" + endDate + "%5D+%0Atext%3A%22" + search + "%22&wt=json&rows=1000&indent=true";
        var fields = '&fl=loc,date_field,id';
        url += fields;
        console.log(url);

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
                    lat:parseFloat(loc[0]),
                    lng:parseFloat(loc[1]),
                    //This is the popup msg when you click on a marker on the map.
                    message: dats[1]+"/"+dats[2]+"/"+dats[0],
                   	//These next two are for icons for when we can switch between two different icons, currently not in use.
                    /*icon: {
                        iconSize:  [19, 46], // size of the icon
                        iconUrl : "leaflet/images/marker-icon-Grey.png"
                    },*/
                    icon:{},
                    nid : datum.id,
                    //This holds all the newspaper text.
                    text_msg : 'text', //datum.text,
                    //date of the newspaper
                    date: date,
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
        markers: [],//The markers  array which is actually shown, used in filter()
        finMarkers : [],
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
        isOn : false,
        textShown : false,
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
                var url = " http://130.207.211.77:8983/solr/loc/select?q=id%3A+%22"+l+"%22&wt=json&indent=true"
                console.log(url);
				$http.get(url)
        		.success(function (response){
        			var datum = response.response.docs[0].text;
                    var regex = new RegExp($scope.search, 'gi');
                    var myArray;
                    var holdArray = [];
                    while ((myArray = regex.exec(datum)) !== null) {
                        holdArray.push(regex.lastIndex);
                    }

                    var senArr = [];
                    while(holdArray.length > 0){
                        var spot = holdArray.pop();
                        var sting = datum.slice(spot-200,spot+200);
                        senArr.push('<div>'+sting+"</div>");
                    }
                    senArr.reverse();
                    var ans = senArr.join();

              		ans = ans.replace(new RegExp($scope.search, 'gi'), '<span class="highlighted">'+$scope.search+'</span>')//Goes through the text document, searches for teh search term and highlights it.
               		$scope.popupTextData = $sce.trustAsHtml(datum.replace(new RegExp($scope.search, 'gi'), '<span class="highlighted">'+$scope.search+'</span>'));
                    $scope.text = $sce.trustAsHtml(ans);//replaces the text variable with the chosen marker text.
                    $scope.textShown = true;
                }); 
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
    //it is being called alot when the mouse is near it, causing slowdown.
    $scope.filter = function(){
    	if (!$scope.isPlaying && $scope.isOn){return};

        $scope.rangeDate = new Date($scope.range/1);//Figureout the date that the range slider is on. Apparently $scope.range is a string and dividing by 1 turns it into a number.

        var curr;//Our current marker.
        if ($scope.markers.length  == 0){//if there are no markers, go ahead and push the oldest marker onto the stack.
            $scope.markers.push($scope.allMarkers[0]);
        }

        if( $scope.markers.length > 0 && $scope.markers.length <= $scope.allMarkers.length){//I dont think this is actually used for anything.
            curr = $scope.markers.pop();//we pop the top marker off the stack we then compare to our ranegDate to see if we need to add or remove markers from the stack.
            /*if(!curr || !curr.hasOwnProperty('date')){
                return;
            }*/
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
        }
    }

    $scope.cityLoc = function(){
        var finMark = {};
        $scope.finMarkers = [];
        for(mark in $scope.markers){
            finMark[$scope.markers[mark].lat] = $scope.markers[mark];  
        } 

        for (x in finMark){
            $scope.finMarkers.push(finMark[x]);
        }
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

}]);

//http://130.207.211.77:8983/solr/loc/select?q=id%3A+%22834903f4-55f4-40eb-9608-7aadbf41d6c2%22&wt=json&indent=true 