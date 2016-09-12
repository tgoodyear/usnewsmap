// The name of the app, we also use leaflet-directive for the map and ngRangeSlider for the slider.
var app = angular.module("loc", ['leaflet-directive','ngRangeSlider','ui.bootstrap-slider','angular-flot']);
app.controller("MapCtrl", [ "$scope","$http","$sce",'$interval',"leafletData", "leafletBoundsHelpers", "leafletEvents", "$window",
                function($scope, $http, $sce, $interval, leafletData, leafletBoundsHelpers, leafletEvents, $window) {

    var scrollWheelZoom = $window.location.href.indexOf('disableScroll') === -1;

    // This gets the actual tiles that form the map
    var tiles = {
	url: "http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        // url: "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}",
        options: {
            attribution: '<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> | <a href="https://cartodb.com/attributions/" title="Map Your World&apos;s Data">CartoDB</a> | <a href="http://maps.stamen.com/#howto">Stamen Design</a> | <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 8,
//            id: 'tgoodyear.cifypr5uo5bccuzkszn0emy7c', // API Key
//            accessToken: 'pk.eyJ1IjoidGdvb2R5ZWFyIiwiYSI6ImNpZnlwcjZ6MzViYTB1dWtzN2dnN2x4b2QifQ.3UtPEf_PlHMgqWDX7t1TOA',// API Access Token
    	    continuousWorld: false,
            // This option disables loading tiles outside of the world bounds.
            noWrap: false
        }
    };

    //All of the $scope variables
    angular.extend($scope, {
        user_id : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);}),
        search : "",// Our Search term
        // maxbounds: bounds,//THe bounds of the map, see the var bounds above.
        center: {// This is the center of our map, which is currently over the geographical center of the continental US.
            lat: 39.83333,
            lng: -94.58333,
            zoom: 5
        },
        lit_or_fuzz : "Literal",
        tiles: tiles,// This is the var tiles from above.
        markers: [],// The markers  array which is actually shown, used in filter()
        allMarkers : [],// The marker holder array used in getMarkers()
        eventTable : [],
        timelineEvents : [],
        startDate: new Date( "1836-01-02"),// The earliest date possible for search queries.
        endDate: new Date("1923-01-01"),// The latest date possible for search queries.
        range : new Date("1923-01-01").getTime(),// The range bar value, set to miliseconds since epoch and changed by the slider.
        rangeDate : new Date("1923-01-01"),// The date represented by the slider and range value.
        events : {
            markers: {
                enable: leafletEvents.getAvailableMarkerEvents(),
            }
        },
        isPlaying : false,// For the play button. Switches between true and false when play button is pressed.
        isOn : false,
        markersConstant : true,
        textShown : false,
        showTimeLine : false,
        popupTextData : "",
        search_started : false,
        defaults : {
            zoomControlPosition: 'bottomright',
	    scrollWheelZoom: scrollWheelZoom
        },
        interval_var : 1,
        loadingStatus : false,
        markerYears: 10,
        resultStart: 0,
        resultsShowing : 0,
        errorStatus : false,
        loadingStatus : false,
        meta : {},
        markerKeyValues : [3,12,50],
        selectedCity : false,
        userSet : false,
        icons : {'search':true,'play':false,'history':false,'info':false},
        cityResultsClosed:false,
        chartOptions: {
            grid:  { hoverable: true }, // flot.tooltip requires this
            tooltip: {
                show: true,
                content: "Year %x: %y.4"
            }},
        timelineData: [],
		geojson: {
			data: statesData,
			style: {
				fillColor: "black",
				weight: 1,
				opacity: 0.9,
				color: 'grey',
				dashArray: '1',
				fillOpacity: 0.9
			}
		},
        playbackInterval: {label:'Year',value:31557600000},
        playbackIntervalOptions: [
            {label:'Year',value:31557600000},
            {label:'Month',value:2592000000},
            {label:'Week',value:604800000},
            {label:'Day',value:86400000}
        ]
    });

	 var stateMouseover = function (feature, leafletEvent) {
		var layer = leafletEvent.target;
		layer.bindPopup("No digitized newspapers available for " + feature.properties.name);
	};

	$scope.$on("leafletDirectiveGeoJson.click", function(ev, leafletPayload) {
		stateMouseover(leafletPayload.leafletObject.feature, leafletPayload.leafletEvent);
	});

    if(!$scope.userSet){
        $window.ga('set', '&uid', $scope.user_id);
        $scope.userSet = true;
    }

    // Event listener for interacting with markers
    var markerEvents = leafletEvents.getAvailableMarkerEvents();
    for (var k in markerEvents){
        var eventName = 'leafletDirectiveMarker.' + markerEvents[k];
        $scope.$on(eventName, function(event, args){
            if(event.name == "leafletDirectiveMarker.click"){
                var l = parseInt(args.modelName);
                $scope.getMetaData($scope.markers[l]);
                $scope.showTimeLine = true;
            }
        });
    }

    $scope.newSearch = function(){
        if(!$scope.search){
            return false;
        }
        $scope.resultsShowing = 0;
        $scope.startDate_q  = $scope.startDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');
        $scope.endDate_q = $scope.endDate.toISOString().replace(':','%3A').replace(':','%3A').replace('.','%3A');

        var search = $scope.search.split(" ");
        if ($scope.lit_or_fuzz == "Fuzzy"){
            for (pos in search){
                search[pos] = search[pos] + "~"
            }
            search = '%7B!complexphrase+inOrder%3Dfalse%7Dtext%3A"'+search.join("+")+'"';
        } else{
            search = search.join("+");
        }
        $scope.searchPhrase = search;

        // On successful get call we go through the responses, which solr gives back as a json object and parse it.
        $scope.getMarkers();
    }

    // This function actually queries the solr database and create a list of markers.
    $scope.getMarkers = function(){
        var payload = { "startDate":$scope.startDate_q,"search":$scope.search,
                        "user_id":$scope.user_id,"date":$scope.endDate,
                        "endDate":$scope.endDate_q, "searchTerms":$scope.searchPhrase,
                        "start":$scope.resultsShowing
                        };

        // We want to clear any visible markers when doing a new search.
        $scope.loadingStatus = true;
        $scope.selectedCity = false;
        $scope.markers = [];
        $scope.allMarkers = [];
        $scope.eventTable = [];
        $scope.timelineEvents = [];
        $scope.meta = {};

        var startTime = +new Date();
        $http.post('http://usnewsmap.com/loc_api/get_data',payload)
        .success(function (response){
            var respTime = +new Date();
            $scope.loadingStatus = false;
            $scope.errorStatus = false;
            if (typeof response == 'undefined'){
                return;
            }

            $scope.allMarkers = response['data'];
            $scope.meta = response['meta'];
            var origShowing = $scope.resultsShowing;
            $scope.resultsShowing = Math.min(parseInt(response['meta']['available']),parseInt($scope.resultsShowing) + parseInt(response['meta']['rows']));
            $scope.search_started = $scope.resultsShowing > 0;

            if($scope.resultsShowing > 0){
                $scope.setMarkers();
            } else {
                $scope.markers = [];
                $scope.allMarkers = [];
                $scope.timelineEvents = [];
                $scope.markerKeyValues = [3,12,50];
            }
            $scope.setTimeline(_.flatten(_.values($scope.allMarkers)));
            if(origShowing == 0){
                $window.ga('send','event' ,'Search','searched',$scope.search,$scope.resultsShowing);
                $window.ga('send','timing','Search',$scope.search,respTime - startTime);
                $scope.icons['play'] = true;
                $scope.icons['history'] = true;
                $scope.range = $scope.endDate.getTime();
            } else {
                $window.ga('send', 'event','Search','LoadMore',$scope.search,$scope.resultsShowing);
                $window.ga('send','timing','LoadMore',$scope.search,respTime - startTime);
            }

            data = _.sortBy(response['frequencies'],function(d){return d[0];});
            // console.log(data);
            $scope.timelineData = [{data:data,yaxis:1},{xaxis: {tickSize:1, tickDecimals:0 }}];

        })
        .error(function(response){
            $scope.loadingStatus = false;
            $scope.errorStatus = true;
        });
    };

    $scope.popupText = function(){
        var myWindow = window.open("", "FullPage");
        myWindow.document.write($scope.popupTextData);
    }

    $scope.turnOn = function(){
        $scope.rangeDate = new Date($scope.range/1);
        $scope.isOn = !$scope.isOn;//Flips $scope.isOnx to its inverse
        $window.ga('send', 'event','Map','playback','sliderMoved');
        $scope.filter();
    }
    // This function is what figures out which markers to show on the map. Uses $scope.markers as a stack. Since the markers in $scope.allMarkers are already
    // sorted, as we push from the beginning of allMarkers to markers, we guarentee that the oldest markes will be at the bottom of the stack and the "youngest"
    // markers are on the stack. So when we have to remove or add markers, we just have to pop or push to the stack instead of rewriting the stack everytime.
    // Still can use refinments, slows down when moving fast over alot of markers, I think one of the problems is that the function is called with ng-move so
    // it is being called alot when the mouse is near it, causing slowdown.
    $scope.filter = function(filter){

        filter = typeof filter !== 'undefined' ? filter : false;
        if (!$scope.isPlaying && !$scope.isOn && !filter){
            return;
        }
        //
        // console.log(Math.abs($scope.range - $scope.rangeDate.getTime()));
        // if(Math.abs($scope.range - $scope.rangeDate.getTime()) < 1000*60*60*24*30*6 ){
        //     console.log('Skipped');
        //     return;
        // }
        $scope.rangeDate = new Date($scope.range/1);
        $http.post('http://usnewsmap.com/loc_api/update',{"date":$scope.rangeDate.toISOString(),"user_id":$scope.user_id})
            .success(function (response){
                $scope.allMarkers = [];
                $scope.markers = [];
                if (typeof response == 'undefined'){
                    return;
                }

                if(response.hasOwnProperty('data')){
                    $scope.allMarkers = response['data'];
                    $scope.availableResults = response['meta']['available'];
                    $scope.shownResults = response['meta']['shown'];
                } else {
                    $scope.allMarkers = response;
                }
                $scope.setMarkers();

            });
    };

    $scope.setMarkers = function(){
        var keys = [];
        $scope.markers = [];
        var valence = [];
        var mean = 0;
        n = 0
        for(var k in $scope.allMarkers) {
            keys.push(k);
            var curr = $scope.allMarkers[k];
            if (curr.length > 0){
                if ($scope.markersConstant){
                    n = n+1;
                    mean = mean + curr.length;
                    valence.push(curr.length);
                }else{
                    var val = 0;
                    for (var ma in curr){
                        var m = curr[ma];
                        date = new Date(m.date).getTime();
                        if(($scope.range - date)< (86400000 * 365.25*$scope.markerYears )){
                            val = val + 1;
                        }
                    }
                    if (val > 0){
                        n = n+1;
                        mean = mean + val;
                        valence.push(val);
                    }
                }
            }
        }
        mean  = mean/n
        std = 0
        for (x in valence){
            std = std + (valence[x] - mean)*(valence[x] - mean);
        }
        std = Math.sqrt(std/(n));
        $scope.markerKeyValues = [Math.floor(mean+std),Math.floor(mean+std*1.5),Math.floor(mean+std*2)];
        if(isNaN($scope.markerKeyValues[0])){
            $scope.markerKeyValues = [3,12,50];
        }


        // if($scope.eventTable[curr.lat] == null){
        //     $scope.eventTable[curr.lat] = [];
        // }
        // $scope.eventTable[curr.lat].push({"date":curr.timeDate,"content":"<p>"+curr.lat+"</p>","id":curr.nid, "search":curr.search, "url": "http://chroniclingamerica.loc.gov/lccn/"+curr.seq_num+"/"+curr.year+"-"+curr.month+"-"+curr.day+"/"+curr.ed+"/"+curr.seq+".pdf"})


        // $scope.timelineEvents = [];
        for(var k in keys){
            var marker = $scope.allMarkers[keys[k]].slice(-1)[0];
            if (typeof marker != 'undefined'){
                if ($scope.markersConstant){
                    var num = $scope.allMarkers[keys[k]].length
                }else{
                    var num = 0;
                    for (var ma in $scope.allMarkers[keys[k]]){
                        var m = $scope.allMarkers[keys[k]][ma];
                        date = new Date(m.date).getTime();
                        if(($scope.range - date)< (86400000 * 365.25*$scope.markerYears )){
                            num = num + 1;
                        }
                    }
                }

                date = new Date(marker.date).getTime();
                if ($scope.markersConstant || ($scope.range - date) < (86400000 * 365.25*$scope.markerYears)){
                    var size = $scope.figure_color(num,mean,std);
                    marker.icon =  {
                        type: 'div',
                        className:"leaflet-marker-icon marker-cluster marker-cluster-"+size+" leaflet-zoom-animated leaflet-clickable",
                        iconSize: [25,25],
                        html: '<div class = "marker-cluster"><span>'+num+'</span></div>',
                        popupAnchor:  [0, 0]
                    };
                    $scope.markers.push(marker);
                }
            }
        }
    };

  $scope.figure_color = function(num,mean,std){
        if (num < (mean)){
            return "tiny";
        }
        if (num < (mean+ std/2)){
            return "small";
        }
        if (num < (mean+ std)){
            return "medium";
        }
        if (num < (mean+ std*1.5)){
            return "large";
        }
        if (num > (mean + std*2)){
            return "huge";
        }
        return "medium";
    }

    $scope.validSearch = function(){
        return ($scope.meta.hasOwnProperty('rows') && $scope.meta['available'] > 0 && $scope.search_started && !$scope.loadingStatus);
    }

    // This function is called when you press the play/pause button.
    $scope.play = function(){
        // Don't allow playback unless proper search conditions are met
        if(!$scope.validSearch()){
            return;
        }
        if($scope.range >= -1483228800000){ // If current time position is end of timeline
            $scope.range = -4228588800000;
        }
        $scope.isPlaying = !$scope.isPlaying;//Flips $scope.isPlaying to its inverse
        if ($scope.isPlaying){//if true we will have play range function be called every 100 seconds.
            $scope.interval_var = $interval($scope.playRange,400);
            // console.log($scope.interval_var["$$intervalId"]);
        }
        $window.ga('send', 'event','Map','playback',$scope.isPlaying ? 'play' : 'pause');
    }


    // This function moves the range slider over, then calls filter(). This causes the effect of markers appearing over time.
    $scope.playRange = function(){
        if($scope.isPlaying && new Date($scope.range/1) <= $scope.endDate){
            $scope.range = new Date(($scope.range/1) + parseInt($scope.playbackInterval.value)).getTime();
            $scope.rangeDate = new Date($scope.range/1);//update $scope.range and $scope.rangeDate to make sure they are the same since they are linked.
            $scope.filter();//call filter with new $scope.rangeDate
        }
        // When we press pause, stop moving ranger and cancel calling this function.
        else if (!$scope.isPlaying){
            clearInterval($scope.interval_var["$$intervalId"]);
        }
        // we've pressed the pause button, we will call this function one more time.
        else {
            $scope.isPlaying = !$scope.isPlaying;
        }
    }

    $scope.keyCapture = function(keyCode) {
        var currentElement = document.activeElement;
        if(keyCode == 32 && $scope.validSearch() && currentElement.id != 'input-search') { // Spacebar pressed during search
            $scope.play();
        }
    };

    // Function that updates the slider when the user manually changes the current date, then filters.
    $scope.updateRange = function(){
        if(!$scope.validSearch()){
            return;
        }
		$scope.range = $scope.rangeDate.getTime();
		$scope.filter(true);
    };

    $scope.setTimeline = function(marks){
        $scope.timelineEvents = [];
        $scope.timelineData = [];
        var dat = {}
        for (e in marks){
            var ev = marks[e];
            var tDate = ev.timeDate.split('/');
            var timelineDate = tDate[2] + '-' + tDate[0] + '-' + tDate[1];
            var timelineEvent = {"date":timelineDate,"content":timelineDate,"data":ev};
            $scope.timelineEvents.push(timelineEvent);
            // dat[tDate[2]] = dat.hasOwnProperty(tDate[2]) ? dat[tDate[2]] + 1 : 1;
        }
    }

    $scope.getMetaData = function(mark){
        $scope.selectedCity = mark.hash;
        $window.ga('send', 'event','Map','markerClicked',$scope.selectedCity);
        $scope.cityResultsClosed = false;

        var SNs = _.uniq(_.pluck($scope.allMarkers[mark['hash']],'seq_num'));
        $http.post('http://usnewsmap.com/loc_api/news_meta',{"sn":SNs})
            .success(function(response){
                $scope.newspapers = response;
            })
            .error(function(e){
                console.log(e);
            });
    };

    $scope.clickedPaper = function(e){
        // console.log(e);
        var paperDesc = [e.seq_num,e.date,e.ed,e.seq,e.hash,e.search];
        $window.ga('send', 'event','Map','paperClicked',paperDesc.join(' '));
    };

    $scope.loadMore = function(){
        $scope.getMarkers();
    };

    $scope.iconClick = function(icon){
        if((icon == 'search' || icon =='play') && !$scope.search_started){
            return;
        }
        $scope.icons[icon] = !$scope.icons[icon];
    };

    $scope.range_decrement = function(){
        $scope.range -= parseInt($scope.playbackInterval.value);
        $scope.rangeDate = new Date($scope.range/1);
        $scope.filter(true);
    };

    $scope.range_increment = function(){
        $scope.range += parseInt($scope.playbackInterval.value);
        $scope.rangeDate = new Date($scope.range/1);
        $scope.filter(true);
    };

}]);
