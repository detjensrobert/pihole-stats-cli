console.log("Pi-Hole ip graph, detjensrobert 2019");

const http = require('http');

// ansi module for colored text, etc
const ansi = require('ansi');
const cursor = ansi(process.stdout);


/* To keep track of non-active clients that dont show up in the latest topClients
 * the last known number of queries for each IP needs to be stored
 * 
 * a Map is used since we already know what IP we need the old data for.
 */
var oldTopQs = new Map(Array(
  [ '001', 356 ],
  [ '065', 16 ],
  [ '067', 19 ],
  [ '073', 112 ],
  [ '100', 1359 ],
  [ '102', 2300 ],
  [ '208', 788 ],
  [ '216', 1631 ],
  [ '232', 1335 ]
));


main();

function main () {
	
	getNewStats();
	setInterval(getNewStats, 1000 * 60 * 10);
	
}



// Returns JSON object of ips and their latest query totals 
function getNewStats () {
	http.get("http://pi.hole/admin/api.php?topClients=100", (res) => {
		const { statusCode } = res;
		const contentType = res.headers['content-type'];

		let error;
		if (statusCode !== 200) {
			error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
		} else if (!/^application\/json/.test(contentType)) {
			error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`);
		}
		if (error) {
			console.error(error.message);
			// Consume response data to free up memory
			res.resume();
			return;
		}
		res.setEncoding('utf8');
		let rawData = '';
		res.on('data', (chunk) => { rawData += chunk; });
		res.on('end', () => {
			
			try {
				const parsedData = JSON.parse(rawData);
				
				// return back the parsed data
				getDeltas(parsedData.top_sources);
				
				
			} catch (e) {
				console.error(e.message);
			}
		});
		
	}).on('error', (e) => {
		console.error(`Got error: ${e.message}`);
	});
}


/* Recent activity is calculated based on newTop - oldTop
 * where oldTop is the value from the map of old data
 */
// Returns array of deltas, sorted by ip
function getDeltas (newTopQs) {
	//~ console.log(newTopQs);
	let deltas = new Map();
	
	// array of all ips (long form)
	const ips = Object.keys(newTopQs);
	
	
	ips.forEach( (elem) => {
		//~ console.log(elem, newTopQs[elem]);
		
		//trim all ips in newTopQs except for last digits
		let trimmedIP = elem.slice(elem.lastIndexOf(".")+1).padStart(3, "0");
		//~ console.log(trimmedIP);
		
		// if this is a new ip (not seen before), old data is 0 queries
		let oldTotal = oldTopQs.has(trimmedIP) ? oldTopQs.get(trimmedIP) : 0;
		
		// if value changed
		if (newTopQs[elem] > oldTotal) {
			deltas.set(trimmedIP, newTopQs[elem] - oldTotal );
		
			// save new value for next time
			oldTopQs.set(trimmedIP, newTopQs[elem])
		}

	});
	
	//~ console.log(deltas);
	printGraph(deltas);
}

/* Given the recent activity for each ip (array: [ [ip, queries]... ] ),
 * make & print bar graph, colored by ip
 */
function printGraph (activityUnsorted) {
	
	/* graph looks something like this:
	 *  | 13:20 █████░░░░░░░▒▒▒▒▒▓▓▓▓▓▓▓▓▓       |
	 *  | 13:30 ████████░░░░░░▒▒▒▒▒▒▒▓▓▓         |
	 *  | ██ .052   ░░ .100   ▒▒ .102   ▓▓ .216  |
	 */
	
	

	const time = new Date();
	let timeStr = ("" + time.getHours()).padStart(2, "0") + ":" 
				+ ("" + time.getMinutes()).padStart(2, "0");
	
	const graphWidth = process.stdout.columns - timeStr.length - 3; // -3 for spaces
	const queryWidth = 500; // enough for 10 mins, probably
	
	const charsPerQuery = graphWidth / queryWidth;
	
		
	//sort by ip
	let activity = Array.from(activityUnsorted).sort((a, b) => {
		// a[0], b[0] is the key of the map
		return a[0] - b[0];
	});
	
	//~ console.log("window is " + graphWidth + " chars wide");
	//~ console.log("time is " + timeStr);
	//~ console.log("chars per query " + charsPerQuery);
	
	cursor.horizontalAbsolute(0).eraseLine();
	cursor.reset().write(" " + timeStr + " ");
	
	let chars = ["█", "▓", "▒"];
	let shade = 0; // 0-2, light to dark, will wrap
	let color = 0; // 0-2, white blue red, based on ip
		
	for (let i = 0; i < activity.length; i++) {
		let data = activity[i];
		
		if (data[0].charAt(0) != color) {
			color = data[0].charAt(0);
			shade = 0;
		}
				
		// set color
		switch (color) {
			case "0":
				cursor.white();
				break;
			case "1":
				cursor.blue();
				break;
			case "2":
				cursor.red();
				break;
			default:
				cursor.reset();
				break;
		}
		
		let charsToPrint = Math.ceil(data[1] * charsPerQuery);
		
		//~ console.log("printing", charsToPrint, "chars in color shade", color, shade);
		
		for (let j = 0; j < charsToPrint; j++) {
			cursor.write(chars[shade]);
		}
		
		// increment shade
		shade++;
		if (shade > 2) {shade = 0;}
		
	}
	
	cursor.reset().write("\n" + activity);
}
