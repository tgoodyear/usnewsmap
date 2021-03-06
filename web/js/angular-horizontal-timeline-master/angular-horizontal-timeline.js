/**
 * Angular JS horizontal timeline
 *
 * (c) eowo
 * http://github.com/eowo/angularjs-horizontal-timeline
 *
 * Version: v0.0.1
 *
 * Licensed under the MIT license
 */

var template =
'<div class="timeline">'+
	'<div class="timeline-left">'+
	'	<label>{{startDate}}</label>'+
	'</div>'+
	'<div class="timeline-center">'+
		'<div class="progress">'+
		//'	<span ng-style="{width:progress_percent+\'%\'}"></span>'+
		'	<ul class="timeline-events">'+
		'		<li class="timeline-event" ng-repeat="event in events"'+
		'			ng-mouseenter="selectedEvent[$index]=true"'+
		'			ng-mouseleave="selectedEvent[$index]=false"'+
		'			ng-click="eventClicked(event)"'+
		'			event-date="event.date"'+
		// '			title="{{event.date}}"'+
		'			timeline-event-marker><span></span>'+
		'			<div class="timeline-event-box"'+
		'				ng-show="selectedEvent[$index]"'+
		'				ng-hide="!selectedEvent[$index]"'+
		'				ng-bind-html="event.content | unsafe">'+
		'			</div>'+
		'		</li>'+
		'	</ul>'+
		/*'	<ul class="timeline-bg">'+
		'		<li class="timeline-month" ng-repeat="month in months"'+
		'			timeline-month><span title="{{month.date}}">{{month.name}}</span>'+
		'			<ul>'+
		'				<li class="timeline-day" ng-repeat="day in month.days"'+
		'					ng-style="{ \'left\' : ($index * (100/month.days.length) )+\'%\'}">'+
		'					<span title="{{month.date + \'-\' + day}}"><i></i>{{day}}</span>'+
		'				</li>'+
		'			</ul></li>'+
		'	</ul>'+

		*/
		'</div>'+
	'</div>'+
	'<div class="timeline-right">'+
	'	<label>{{endDate}}</label>'+
	'</div>'+
'</div>'+
'<div class="row"><div class="col-md-12">'+
	'<div ng-model="eventText" ng-bind-html="eventText"></div>'+
'</div></div>'
;

angular.module('angular-horizontal-timeline', ['ngSanitize'])

.filter('unsafe', function($sce) {
    return function(val) {
        return $sce.trustAsHtml(val);
    };
})



.directive('horizontalTimeline', function($http,$sce){
	function controller($scope){
		$scope.selectedEvent = [];
		$scope.months = [];
		$scope.text = "";
		$scope.textShown = false;
		$scope.popupTextData = "";

		$scope.eventClicked = function(data, search){
			// console.log(data);
			// var eventText = '<h4>'+ data.data.city +', '+ data.data.state +'</h4>';
			// var dateStr = new Date(data.date).toISOString().substr(0, 10);
			// var urlData = [data.data.seq_num,dateStr,data.data.ed,data.data.seq];
	        // var url = "http://chroniclingamerica.loc.gov/lccn/"+ urlData.join('/') + ".json";
			$scope.eventText = '';// '<h4>Loading...</h4>';
			// $http.get(url)
			// .success(function (response){
				// console.log(response);
				// eventText += '<a href="'+response.pdf+'" target="_blank">'+response.title.name+'</a>';
				// $scope.eventText = $sce.trustAsHtml(eventText);
				// $scope.eventTextShown = true;
	        // });
	    };

		$scope.getPosition = function(date){
			date = moment(date);
			var diff = Math.ceil(date.diff(moment($scope.startDate),moment($scope.endDate), 'year')*365);
			var diff2 = Math.ceil(date.diff(moment($scope.startDate),moment(date), 'year')*365);
			//range between 0 - 100
			return (diff2/diff)*100;
		};

		var range  = moment().range(moment($scope.startDate), moment($scope.endDate));

		range.by('months', function(month) {
			$scope.months.push({
				'date':month.format('YYYY-MM'),
				'name':month.format('MMMM'),
				'days':[]});

			var dayrange = moment().range(month.startOf('month').format('YYYY-MM-DD'), month.endOf('month').format('YYYY-MM-DD'));
			dayrange.by('weeks', function(week) {
				$scope.months[$scope.months.length - 1].days.push(week.format('DD'));
			});
		});
		$scope.progress_percent = $scope.getPosition($scope.currDate);
	}

	return {
		restrict: 'AEC',
		controller: controller,
		scope: {
			startDate: '@',
			currDate: '@',
			endDate: '@',
			events: '='
		},
		template:template
	};
})

.directive('timelineMonth', function() {
	function link(scope, element, attr) {
		var monthWidth = 100/scope.months.length;
		element.css({'width': monthWidth+'%'});
	}
	return {
		restrict: 'A',
		link : link
	};
})

.directive('timelineEventMarker', function() {
	function link(scope, element, attr) {
		var eventDate = scope.$eval(attr.eventDate);
		var pos = scope.getPosition(eventDate);
		element.css({'left': pos+'%'});
	}
	return {
		restrict: 'A',
		link : link,
		scope: false
	};
});
