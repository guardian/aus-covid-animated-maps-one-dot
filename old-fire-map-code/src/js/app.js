import * as d3 from "d3"
import * as topojson from "topojson"
import moment from "moment"
import hal from './settings'
// import * as scaleBar from "d3-geo-scale-bar"
/*
change index in hal... as in hal[0] or hal[2]
0 = Mid north coast
1 = Sydney
2 = North and gold coast
3 = Brisbane
*/
var settings = hal[0]
var interval1=null;
var firstRun = true;
var currentDate = null;
var projection = null;

// Polyfill for requestAnimationFrame which is not supported in the IE universe
;(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());


function makeMap(states, data, places) {

	var scope = d3.select("#map1")
	var statusMessage = scope.select("#statusMessage");

	var width = document.querySelector("#mapContainer").getBoundingClientRect().width

	var ratio = settings.width / settings.height

	console.log("picWidth",settings.width, "picHeight",settings.height, "ratio", ratio)
	var height = width / ratio

	var mobile = (width < 861) ? true : false;

	var margin = { top: 0, right: 0, bottom: 0, left: 0 }

	var active = d3.select(null);

	var parseDate = d3.timeParse("%Y-%m-%d");

	var formatDate = d3.timeFormat("%Y-%m-%d");

	// var ratio = settings.width / settings.height

	var colors = ['rgba(219, 0, 14, 0.6)', 'rgba(20, 231, 255, 0.6)'];				

	var gradientLocal = d3.scaleLinear()
						.range(['rgba(255, 0, 0, 0.9)', 'rgba(0, 0, 0, 0.2)'])
						.domain([0,14])

	var gradientOS = d3.scaleLinear()
						.range(['rgba(0, 0, 255, 0.9)', 'rgba(0, 0, 0, 0.2)'])
						.domain([0,14])					

	projection = d3.geoMercator()
	                .scale(1)
	                .translate([0,0])	

	projection.fitSize([width, width / ratio], settings.bbox);

	var locations = d3.select('#points');	 

	var imageObj = new Image()

	imageObj.src = `<%= path %>/assets/satellite/${settings.image}`
	   
	scope.select("#mapContainer canvas").remove();

	scope.select("#keyContainer svg").remove();

	var keyWidth = 110

	var keyHeight = (width < 450) ? 70 : 100	

	var canvas = scope.select("#mapContainer").append("canvas")	
	                .attr("width", width)
	                .attr("height", height)
	                .attr("id", "map-animation-csg")
	                .attr("overflow", "hidden");      

	var svg = scope.select("#mapContainer").append("svg")	
	                .attr("width", width)
	                .attr("height", height)
	                .attr("id", "svg-overlay")
	                .attr("overflow", "hidden");                                     


	// var kilometers = scaleBar.geoScaleBar()
 //      .left(.79)
 //      .top(.92)
 //      .distance(100);

    // var scale_bar_kilometers = svg.append("g")
    //   .attr("transform", "translate(0,0)");

	// kilometers.fitSize([width, height], settings.bbox).projection(projection);
 //    scale_bar_kilometers.call(kilometers);

	var context = canvas.node().getContext("2d"); 	              

	var filterPlaces = places.features.filter((d) => (mobile) ? d.properties.scalerank < 7 : d.properties.scalerank < 8 );

	var path = d3.geoPath()
		    .projection(projection)
		    .context(context);

	var graticule = d3.geoGraticule();  	    

	// var point1 = projection([151.20346,-33.86760])[0]

	// var point2 = projection([151.21432,-33.86760])[0]

	var rCircle = 1.5
	console.log(settings.bbox.geometry.coordinates[0][0])
	function drawMap() {

        var nw = projection(settings.bbox.geometry.coordinates[0][0])
        var se = projection(settings.bbox.geometry.coordinates[0][2])    
        var sx = 0
        var sy = 0
        var sw = settings.width
        var sh = settings.height
        var dx = nw[0]
        var dy = nw[1]
        var dw = se[0] - nw[0]
        var dh = se[1] - nw[1]
        
        context.drawImage(imageObj, sx, sy, sw, sh, dx, dy, dw, dh);  

	 //    filterPlaces.forEach(function(d,i) {
		// 	context.beginPath();
		// 	context.save();
		// 	context.fillStyle="#767676";
		// 	// context.strokeStyle = 'white';
		// 	context.shadowColor="white";
		// 	context.shadowBlur=5;
		// 	// context.strokeText(d.properties.name,projection([d.properties.longitude,d.properties.latitude])[0],projection([d.properties.longitude,d.properties.latitude])[1]);
		// 	context.fillText(d.properties.name,projection([d.properties.longitude,d.properties.latitude])[0],projection([d.properties.longitude,d.properties.latitude])[1]);
		// 	context.font = "15px 'Guardian Text Sans Web' Arial";
		//     context.closePath();
		//     context.restore();

		// })

	}

	drawMap();

	data.forEach(function(d) {
		d.lat = +d.latitude;
		d.lon = +d.longitude;
		d.date = moment.utc(d.time, "YYYY-MM-DD HHmm")
	})

	data.sort((a, b) => a.date - b.date);

	var sortData = (sortBy) => data.sort((a, b) =>  d3.descending(a["sort_" + sortBy], b["sort_" + sortBy]))

	var getRadius = (d) => (d < 6) ? radius(6) : radius(d);

	function fillGradient(date1, date2, location) {
		
		var days=60*60*24*1000;

		var date1_ms = date1.valueOf();

		var date2_ms = date2.valueOf();

		var difference_ms = date2_ms - date1_ms;

		var daysDiff = Math.round(difference_ms/days)
		if (location === "Local") {
			return gradientLocal(Math.round(daysDiff))
		}
		else {
			return gradientOS(Math.round(daysDiff))
		}
	}

	// var circumference = 6371000 * Math.PI * 2;

	// var angle = 1000000 / circumference * 360;

	// var circle = d3.geoCircle().center([-100,40]).radius(angle);

	function updateCircles(dateUpto) {
		// console.log(dateUpto)
		context.clearRect(0,0,width,height);

		drawMap()
		var twoWeeks = dateUpto.clone().subtract(14, 'days'); 
		// var uptoDate = parseDate(dateUpto);
		var filterData = data.filter((d) => (d.date <= dateUpto) && (d.date >= twoWeeks));
		// console.log(filterData)
		filterData.forEach(function(d,i) {
			var circleColor = colors[1]
			context.beginPath();
			context.arc(projection([d.lon,d.lat])[0], projection([d.lon,d.lat])[1], rCircle, 0, 2 * Math.PI);
			context.fillStyle = fillGradient(d.date, dateUpto, d.combined)
		    context.fill();
		    context.closePath();
		})

		context.beginPath();
		context.arc(800, 50, 40, 0, 2 * Math.PI);
		context.fillStyle = "#FFF"
	    context.fill();
	    context.closePath();

    	context.beginPath();
		// context.save();
		context.fillStyle="#767676";
		context.font = "16px Arial";
		context.fillText(dateUpto.local().format("MMM D"),778,45);
		context.fillText(dateUpto.local().format("YYYY"),782,65);
	    context.closePath();
	    // context.restore();

	}

	statusMessage.transition(600).style("opacity",0);

	var animationSpeed = 100

	var startDate = moment.utc(data[0].time, "YYYY-MM-DD")
	
	var endDate = moment.utc(data[data.length-1].time, "YYYY-MM-DD")

	if (firstRun) {
		currentDate = moment.utc(data[0].time, "YYYY-MM-DD")
	}

	updateCircles(currentDate);
	function animate(t) {

		if (currentDate.isSameOrAfter(endDate)) {
			console.log("stop")
			interval1.stop()
			animationRestart();
		}

		updateCircles(currentDate);
		monthText.text(currentDate.local().format("MMM D"))
		yearText.text(currentDate.local().format("YYYY"))
		currentDate.add(1, 'days'); 
	
	}

	interval1 = d3.interval(animate, animationSpeed);
	var monthText = scope.select("#monthText")
	var yearText = scope.select("#yearText")

	function animationRestart() {

		console.log("pause")
		
		monthText.text("Replaying")

		var t = d3.timer(function(elapsed) {
			monthText.text("Paused")
		  	yearText.text(10 - Math.round(elapsed/1000))
		  	if (elapsed > 10000){
		  		t.stop()
		  		currentDate = moment.utc(data[0].time, "YYYY-MM-DD");
				interval1 = d3.interval(animate, animationSpeed);
		  	} 
		}, 1000);
	}
	firstRun = false

}

function initialize(a,b,c) {

	makeMap(a,b,c)

	var to=null
	var lastWidth = document.querySelector("#mapContainer").getBoundingClientRect()
	window.addEventListener('resize', function() {

		var thisWidth = document.querySelector("#mapContainer").getBoundingClientRect()
		if (lastWidth != thisWidth) {
			
			window.clearTimeout(to);
			to = window.setTimeout(function() {
					if (interval1 != null) {
						interval1.stop()	
					}
				    makeMap(a,b,c)
				}, 100)
		}
			
	})


}


Promise.all([
	d3.json('<%= path %>/assets/au-states.json'),
	d3.csv(`<%= path %>/assets/${settings.csv}`),
	d3.json('<%= path %>/assets/places.json')
])
.then((results) =>  {

	// var iframe = function inIframe () {
	//     try {
	//         return window.self !== window.top;
	//     } catch (e) {
	//         return true;
	//     }
	// }

	// // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
	// // https://css-tricks.com/a-few-functional-uses-for-intersection-observer-to-know-when-an-element-is-in-view/

	// var target = document.querySelector('#mapContainer');

	// if (iframe) {

	// }	

	var a = results[0]

	var b = results[1]

	var c = results[2]
	initialize(a,b,c)

	// if (iframe) {
	// 	parent.window.onscroll = function() {
	// 	renderLoop()
	// 	};

	// }

	// else {
	// 	 window.onscroll = function() {
	// 	renderLoop()
	// 	};
	// }


 //    function renderLoop() {

 //        	var bounding = target.getBoundingClientRect();

	// 		if (
	// 			bounding.top >= 0 &&
	// 			bounding.left >= 0 &&
	// 			bounding.right <= (window.innerWidth || document.documentElement.clientWidth) &&
	// 			bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight)
	// 		) {
	// 			console.log("Inside viewport")
				
	// 			if (interval1 == null) {
	// 				console.log("Initialise mid north coast")
	// 				initialize(a,b,c)
	// 			}	
				
	// 		} else {
				
	// 			if (interval1 != null) {
	// 					console.log("stopping mid north coast")
	// 					interval1.stop()
	// 					interval1 = null	
	// 			}
	// 			console.log("Outside viewport")
				
	// 		}


 //    }

    

});