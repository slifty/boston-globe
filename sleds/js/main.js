$(function() {

	var map = L.map('map', {attributionControl: false}).setView([
		42.375193, // default lat
		-71.064652 // default lon
		], 9); // default zoom level
		
		L.tileLayer('http://{s}.tiles.mapbox.com/v3/gabriel-florit.map-s24tp6w4/{z}/{x}/{y}.png', {
			minZoom: 7,
			maxZoom: 12
			}).addTo(map);

	Tabletop.init( {
		key: '0AljhJM9N24t2dG9jX2JJWUpoNUJJOWdGNHNuWHpsRkE',
		callback: function(data, tabletop) {

			var pin;
			var features = [];
			for (var i = 0; i < data.length; i++) {
				if(data[i].lng == "") continue;

				pin = L.marker([data[i].lat, data[i].lng]);

				pin.__data__ = data[i];

				pin.on('mouseover', function(e) {
					var datum = e.target.__data__; // this is the data item
					var popup = L.popup();
					
					var $container = $("<div></div>")
						.addClass('popup')
					
					var $name = $("<h1></h1>")
						.addClass("name")
						.text(datum.name)
						.appendTo($container)

					var $address = $("<p></p>")
						.addClass("address")
						.html((datum.address1!=""?datum.address1 + "<br />":"") + (datum.address2!=""?datum.address2 + "<br />":"") + (datum.city?datum.city + ", ":"") + datum.state)
						.appendTo($container);

					var $notes = $("<p></p>")
						.addClass("notes")
						.html(datum.notes)
						.appendTo($container);
					
					var $tags = $("<ul></ul>")
						.addClass("tags")
						.appendTo($container);
					
					if(datum.polldaddyid) {
						var $rating = $('<div id="pd_rating_holder_' + datum.polldaddyid + '"></div><script type="text/javascript">PDRTJS_settings_' + datum.polldaddyid + ' = {"id" : "' + datum.polldaddyid + '", "unique_id" : "default", "title" : "", "permalink" : ""};window.PDRTJS_' + datum.polldaddyid +' = new PDRTJS_RATING( window.PDRTJS_settings_' + datum.polldaddyid + ');</script>')
							.appendTo($container);
					}

					var tag_collection = [];
					tag_collection = [];
					if(datum.isgentle == "1") { tag_collection.push("grade_1") };
					if(datum.ismoderate == "1") { tag_collection.push("grade_2") };
					if(datum.issteep == "1") { tag_collection.push("grade_3") };
					tag_collection.push("age_" + datum.agecode);
					tag_collection.push("ownership_" + datum.ownershipcode);
					tag_collection.push("price_" + datum.pricecode);
					tag_collection.push("parking_" + datum.parkingcode);
					
					for(var x in tag_collection) {
						var tag = tag_collection[x];
						var $tag = $("<li></li>")
							.addClass("tag")
							.addClass(tag)
							.appendTo($tags)
					}

					popup
					.setLatLng(e.target.getLatLng())
					.setContent($('<div>').append($container).html())
					.openOn(map);
				});

				features.push(pin);
			}

			var layer = L.layerGroup(features);
			layer.addTo(map);

			var indexOfListItem;
			var selectedFeature;
		},
		simpleSheet: true
	})
});
