var MERGE_CACHE = null;
$(function() {
	// Create the dash
	var $dash = $("#dash");
	var $duty = $("<div />")
		.addClass("duty")
		.appendTo(dash);
	var $fare = $("<div />")
		.addClass("fare")
		.appendTo(dash);

	// Create the notepad
	var $notes = $("#notes");
	var $note_list = $("<ol />")
		.appendTo($notes);
	$note = $("<li />")
		.addClass("head")
		.appendTo($note_list)
	$start = $("<div />")
		.addClass("start")
		.text("Start")
		.appendTo($note);
	$description = $("<div />")
		.addClass("description")
		.text("Description")
		.appendTo($note);
	$end = $("<div />")
		.addClass("end")
		.text("End")
		.appendTo($note);
	$fare = $("<div />")
		.addClass("fare")
		.text("$")
		.appendTo($note);



	// Create the clock
	var $clock = $("#clock");

	// Create the Map
	var map = L.map('map', {attributionControl: false}).setView([
		42.345193, // default lat
		-71.104652 // default lon
		], 15); // default zoom level
		
	L.tileLayer('http://{s}.tiles.mapbox.com/v3/gabriel-florit.map-s24tp6w4/{z}/{x}/{y}.png', {
		minZoom: 6,
		maxZoom: 15
		}).addTo(map);


	// Load the data
	$.ajax({
		dataType:"json",
		method:"GET",
		url:"merge.json"
	})
	.done(function(merge_data) {
		var features = [];

		// Assign an ID to each record
		for(var x in merge_data) {
			merge_data[x].id = x;
		}


		MERGE_CACHE=merge_data;
		
		for(var x in merge_data) {
			var item = merge_data[x];
			for(var s in item.route_data.steps) {
				var step = item.route_data.steps[s];
				var line = L.Polyline.fromEncoded(step.polyline.points);
				if(item.table_data.fare == 0) {
					line.options.color = "#990000";
				}
				features.push(line);
			}
		}

		var layer = L.layerGroup(features);
		layer.addTo(map);

		// Start the animation
		var h = 5;
		var m = 55;
		var s = 0;
		var speed = 100;
		var active_route = null;
		var marker = null;
		var tick = function() {
			// Update the time
			s += 5;
			m = (s >= 60)?(m+1):m;
			h = (m >= 60)?(h+1):h;
			m = (m >= 60)?m-60:m;
			s = (s >= 60)?s-60:s;
			var time = h + ":" + m + ":" + s;

			// Update the marker
			if(marker == null) {
				marker = new L.Marker(getPositionAtTime(time));
				marker.addTo(map);
			} else {
				if (L.DomUtil.TRANSITION) {
					console.log(marker);
					if (marker._icon) { marker._icon.style[L.DomUtil.TRANSITION] = ('all ' + speed + 'ms linear'); }
					if (marker._shadow) { marker._shadow.style[L.DomUtil.TRANSITION] = ('all ' + speed + 'ms linear'); }
    			}
				marker.setLatLng(getPositionAtTime(time));
			}

			map.panTo([marker.getLatLng().lat,marker.getLatLng().lng], 500);
			map.whenReady(function() {
				setTimeout(tick,speed);
			})

			// Update the notebook
			var route = getRouteAtTime(time);
			if(route != active_route) {
				if(route.table_data.fare != "") {
					$note = $("<li />")
						.attr("id", "note_" + route.id)
						.appendTo($note_list)
					$start = $("<div />")
						.addClass("start")
						.text(route.table_data.starttime)
						.appendTo($note);
					$description = $("<div />")
						.addClass("description")
						.text(route.table_data.startlocation + " to " + route.table_data.endlocation)
						.appendTo($note);
				} else {
					$note = $("#note_" + active_route.id);
					$end = $("<div />")
						.addClass("end")
						.text(active_route.table_data.endtime)
						.appendTo($note);
					$fare = $("<div />")
						.addClass("fare")
						.text(active_route.table_data.fare)
						.appendTo($note);

				}
				active_route = route;
			}
		};
		tick()

		var indexOfListItem;
		var selectedFeature;

	});
});

function getDaystampFromTime(time) {
	var components = time.split(":");
	var h = components[0];
	var m = components[1];
	var s = components[2];
	return parseInt(s) + 60*parseInt(m) + 3600*parseInt(h);
}

function getRouteAtTime(time) {
	var merge_data = MERGE_CACHE;
	var daystamp = getDaystampFromTime(time);

	for(var x in merge_data) {
		var item = merge_data[x];
		var start_daystamp = getDaystampFromTime(item.table_data.starttime);
		var end_daystamp = getDaystampFromTime(item.table_data.endtime);

		if(daystamp < start_daystamp || daystamp > end_daystamp)
			continue;

		return item;
	}
}

function getPositionAtTime(time) {
	var merge_data = MERGE_CACHE;
	var daystamp = getDaystampFromTime(time);

	var item = getRouteAtTime(time);
	var start_daystamp = getDaystampFromTime(item.table_data.starttime);
	var end_daystamp = getDaystampFromTime(item.table_data.endtime);
	
	var total_distance = item.route_data.distance.value;
	var time_distance = total_distance * (daystamp - start_daystamp) / (end_daystamp - start_daystamp);
	var odometer = 0;

	// Which step are we in?
	for(var y in item.route_data.steps) {
		var step = item.route_data.steps[y];
		if(time_distance > odometer + step.distance.value ) {
			odometer += step.distance.value;
			continue;
		}
		var step_progress = (time_distance - odometer) / step.distance.value; 

		// How long is the step in total?
		var polyline = L.Polyline.fromEncoded(step.polyline.points);
		var points = polyline.getLatLngs();
		var length = 0;
		var prev_point = null;
		for(var z in points) {
			var point = points[z];
			if(prev_point != null)
				length += Math.sqrt(Math.pow(point.lat - prev_point.lat,2) + Math.pow(point.lng - prev_point.lng,2));
			prev_point = point;
		}

		// Which line are we in?
		var length_odometer = 0;
		length_target = length * step_progress;
		prev_point = null;
		for(var z in points) {
			var point = points[z];
			if(prev_point != null) {
				var length_contribution = Math.sqrt(Math.pow(point.lat - prev_point.lat,2) + Math.pow(point.lng - prev_point.lng,2));
				if(length_target > length_odometer + length_contribution) {
					length_odometer += length_contribution;
				} else {
					var length_progress = (length_target - length_odometer) / length_contribution;
					var lat = prev_point.lat + (point.lat - prev_point.lat) * length_progress;
					var lng = prev_point.lng + (point.lng - prev_point.lng) * length_progress;
					return [lat,lng];
				}
			}
			prev_point = point;
		}
	}
}
