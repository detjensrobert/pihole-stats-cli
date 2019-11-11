oconsole.log("Pi-Hole ip graph, detjensrobert 2019");

// Packages to get
const request = require('request-promise-native');
const { setIntervalAsync } = require('set-interval-async/legacy');
const ansi = require('ansi');

const cursor = ansi(process.stdout);

const updateInterval = 1000 * 60 * 10;


/* To keep track of non-active clients that dont show up in the latest topClients
 * the last known number of queries for each IP needs to be stored
 * 
 * a Map is used since we already know what IP we need the old data for.
 */

var oldTopQs = new Map();

main();

async function main () {
	
	//run once and dont print to update old top data
	await runner(true);
	
	//now run every $interval mins
	await runner();
	setIntervalAsync( async () => {await runner();} , updateInterval);
	
	
}

async function runner (noPrint) {
	let dataPromise = getDataPromise();
	let data = await dataPromise;
	let deltas = getDeltas(data);
	if (!noPrint) {printGraph(deltas);}
}


//return Promise that becomes JSON object of IPs
function getDataPromise () {
	return new Promise( (resolve, reject) => {
		
		request( {uri: 'http://pi.hole/admin/api.php?topClients=100', json: true} )
		.then(function (response) {
			
			// on get
			resolve(response.top_sources);
			
		})
		.catch(function (err) {
			// API call failed...
			reject(err);
		});
		
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
	return deltas;
}

/* Given the recent activity for each ip (array: [ [ip, queries]... ] ),
 * make & print bar graph, colored by ip
 */
function printGraph (activityUnsorted) {
	
	/* graph looks something like this:
	 *  | 01:20p █████░░░░░░░▒▒▒▒▒▓▓▓▓▓▓▓▓▓       |
	 *  | 01:30p ████████░░░░░░▒▒▒▒▒▒▒▓▓▓         |
	 *  | ██ .052   ░░ .100   ▒▒ .102   ▓▓ .216   |
	 */
	
	let timeStr = timeAMPM(new Date());
	
	const graphWidth = process.stdout.columns - timeStr.length - 3; // -3 for spaces
	const queryWidth = 500; // enough for 10 mins, probably
	
	const charsPerQuery = graphWidth / queryWidth;
			
	//sort by ip
	let activity = Array.from(activityUnsorted).sort((a, b) => {
		// a[0], b[0] is the key of the map
		return a[0] - b[0];
	});
		
	cursor.horizontalAbsolute(0).eraseLine();
	cursor.reset().write(" " + timeStr + " ");
	
	//print bar graph
	for (let i = 0; i < activity.length; i++) {
		let data = activity[i]; // pull ip and amount out of big array
		
		let char = setColor(data[0]); // get shade and set color by ip

		let charsToPrint = Math.ceil(data[1] * charsPerQuery);
		
		for (let j = 0; j < charsToPrint; j++) { // print 'em
			cursor.write(char);
		}
	}
	
	
	cursor.reset().write("\n");
	//print legend
	for (let i = 0; i < activity.length; i++) {
		let data = activity[i]; // pull ip and amount out of big array
		
		let char = setColor(data[0]); // get shade and set color by ip
				
		cursor.write("  " + char + char + " ." + data[0] + " (" + data[1] + ") ");
	}
	cursor.reset();
	
}

function timeAMPM (date) {
	let hours = date.getHours();
	let minutes = date.getMinutes();
	let ampm = hours >= 12 ? 'p' : 'a';
	
	//get hours in proper format
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	
	//pad those
	minutes = minutes < 10 ? '0' + minutes : minutes;
	hours = hours < 10 ? '0' + hours : hours;
	
	//form time from components
	let strTime = hours + ':' + minutes + ampm;
	return strTime;
}


function setColor (ip) {
	
	let shades = "█▓▒░█▓▒░";
	
	let origin = Number(ip.charAt(0));
	let device = Number(ip.slice(1));
	
	//~ console.log("device #: " + device);
	
	let charIdx = Math.floor(device/2) % 6;
		
	switch (origin) {
		case 0:
			cursor.white();
			break;
		case 1:
			cursor.blue();
			if (charIdx > 2) { cursor.cyan(); }
			break;
		case 2:
			cursor.red();
			if (charIdx > 2) { cursor.yellow(); }
			break;
		default:
			cursor.reset();
	}
	
	return shades.charAt(charIdx);
}

