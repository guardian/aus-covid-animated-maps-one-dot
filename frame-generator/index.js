if (typeof fetch !== 'function') {
    global.fetch = require('node-fetch-polyfill');
}
const D3Node = require('d3-node')
const canvasModule = require('canvas'); // supports node-canvas v1 & v2.x
const d3 = require('d3')
const fs = require('fs');
const moment = require('moment');
const d3n = new D3Node({ canvasModule }); // pass it node-canvas
const settings_json = require('./settings-large')

/*
change index in hal... as in hal[0] or hal[2]
0 = Mid north coast
1 = Sydney
2 = North and gold coast
3 = Brisbane
4 = South coast
5 = Adelaide and K Island
6 = Snowy to Eden
7 = Gong to Moruya
8 = East Gippsland
*/

var thisone = 3
var settings = settings_json[thisone]
var interval1 = null;
var firstRun = true;
var currentDate = null;
var projection = null;

// fs.mkdirSync(settings_json[thisone]['feature']);

function makeMap(data, places, image) {

	var width = settings.width
	// var ratio = settings.width / settings.height

	// console.log("picWidth",settings.width, "picHeight",settings.height, "ratio", ratio)

	var height = settings.height

	// var mobile = (width < 861) ? true : false;

	var margin = { top: 0, right: 0, bottom: 0, left: 0 }

	var active = d3.select(null);

	var parseDate = d3.timeParse("%Y-%m-%d");

	var formatDate = d3.timeFormat("%Y-%m-%d");

	// var ratio = settings.width / settings.height

	var gradientLocal = d3.scaleLinear()
						.range(['rgba(255, 0, 0, 0.9)', 'rgba(0, 0, 0, 0.2)'])
						.domain([0,14])

	var gradientOS = d3.scaleLinear()
						.range(['rgba(0, 0, 255, 0.9)', 'rgba(0, 0, 0, 0.2)'])
						.domain([0,14])	

	projection = d3.geoMercator()
	                .scale(1)
	                .translate([0,0])	

	projection.fitSize([width, settings.height], settings.bbox); 

	// var imageObj = new canvasModule.Image

	// imageObj.src = `.data/satellite/${settings.image}`

	var canvas = d3n.createCanvas(width, height)                     

	var context = canvas.getContext("2d"); 	              

	var filterPlaces = places.features.filter((d) => ( d.properties.scalerank < 2));

	var path = d3.geoPath()
		    .projection(projection)
		    .context(context);

	var graticule = d3.geoGraticule();  	    

	// if small

	// var rCircle = 1.5

	// if big

	var rCircle = 4

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

        context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);  

	    filterPlaces.forEach(function(d,i) {
			context.beginPath();
			context.save();
			context.fillStyle="#000";
			context.shadowColor="white";
			context.shadowBlur=5;
			context.font = "40px Arial";
			context.fillText(d.properties.name,projection([d.properties.longitude,d.properties.latitude])[0],projection([d.properties.longitude,d.properties.latitude])[1]);
		  context.closePath();
		  context.restore();

		})

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


	// var loop = true;
	function updateCircles(dateUpto) {
		// console.log(dateUpto)
		context.clearRect(0,0,width,height);

		drawMap()
		var twoWeeks = dateUpto.clone().subtract(14, 'days'); 
		// var uptoDate = parseDate(dateUpto);
		var filterData = data.filter((d) => (d.date <= dateUpto) && (d.date >= twoWeeks));
		// console.log(filterData)
		filterData.forEach(function(d,i) {
	
			context.beginPath();
			context.arc(projection([d.lon,d.lat])[0], projection([d.lon,d.lat])[1], rCircle, 0, 2 * Math.PI);
			context.fillStyle = fillGradient(d.date, dateUpto, d.combined)
		    context.fill();
		    context.closePath();
		})


		// context.beginPath();
		// context.arc(1800, 900, 40, 0, 2 * Math.PI);
		// context.fillStyle = "#FFF"
	 //    context.fill();
	 //    context.closePath();

		// 	context.beginPath();

		// context.fillStyle="#000";
		// context.font = "16px Arial";
		// context.fillText(dateUpto.local().format("MMM D"),1800,900);
		// context.fillText(dateUpto.local().format("YYYY"),1800,920);
	 //    context.closePath();

	}

	var startDate = moment.utc(data[0].time, "YYYY-MM-DD HHmm")
	
	var endDate = moment.utc(data[data.length-1].time, "YYYY-MM-DD HHmm")
	var currentDate = moment.utc(data[0].time, "YYYY-MM-DD HHmm")
	// currentDate = moment.utc("2019-12-09 0000", "YYYY-MM-DD HHmm")
	
	var counter = 0;

	// updateCircles(currentDate);

	function loop() {
		console.log(currentDate.local().format("MMM D HH:mm"))
 		console.log(endDate.local().format("MMM D HH:mm"))

 		if (currentDate.isSameOrAfter(endDate)) {
			console.log("stop")
			// loop = false
		}

		else {
			updateCircles(currentDate);
			const out = fs.createWriteStream(`./${settings_json[thisone]['feature']}/${currentDate.local().format("Y-M-D-HH")}.png`)
			canvas.pngStream().pipe(out);
			out.on('finish', () =>  { 
				console.log('The PNG file was created.')
				console.log(currentDate.local().format("MMM D HH:mm"))
				currentDate.add(1, 'days'); 
				loop()
			})
			
			
		}

	}

	loop()

	// while (loop) {

 // 		console.log(currentDate.local().format("MMM D HH:mm"))
 // 		console.log(endDate.local().format("MMM D HH:mm"))
 // 		if (currentDate.isSameOrAfter(endDate)) {
	// 		console.log("stop")
	// 		loop = false
	// 	}

	// 	updateCircles(currentDate);

	// 	loop = false
	// 	const out = fs.createWriteStream(`./output/${currentDate.local().format("M-D-HH")}.png`)
	// 	canvas.pngStream().pipe(out);
	// 	out.on('finish', () =>  { 
	// 		loop = true
	// 		console.log('The PNG file was created.')

	// 	})
		
	// 	console.log(currentDate.local().format("MMM D HH:mm"))
	// 	currentDate.add(1, 'hours'); 

	// }

}


const mapData = d3.csvParse(fs.readFileSync(`./data/${settings.csv}`, 'UTF-8').toString())
const places = require('./data/places.json')

canvasModule.loadImage(`./data/satellite/${settings.image}`).then((image) => {
  	
  makeMap(mapData, places, image)	

  // ctx.drawImage(image, 50, 0, 70, 70)

  // console.log('<img src="' + canvas.toDataURL() + '" />')

})





// // draw on your canvas, then output canvas to png
// canvas.pngStream().pipe(fs.createWriteStream('output.png'));