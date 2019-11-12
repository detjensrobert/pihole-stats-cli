console.log("Pi-Hole ip graph, detjensrobert 2019");

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

var oldTops = new Map();

//colors to print the ip ranges in
var availReds = ['#FFff00', '#FFcc00', '#FF9900', '#FF6600', '#ff3300', '#ff0000'];
var availBlues = ['#00ffFF', '#00ccff', '#0099FF', '#0066ff', '#0033ff'];
var availGreys = ['#FFFFFF', '#dadada', '#9e9e9e', '#606060', '#444444'];

// map to store ip->color associations
var colors = new Map();

var legendHeight = 0;


main();


async function main () {
	
	//run once and dont print to update old top data
	await runner(true);
	
	//now run every $interval mins
	await runner();
	setIntervalAsync( async () => { await runner(); } , updateInterval);
	
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
function getDeltas (newTops) {
	//~ console.log(newTops);
	let deltas = new Map();
	
	// array of all ips (long form)
	const ips = Object.keys(newTops);
	
	
	ips.forEach( (elem) => {
		//~ console.log(elem, newTops[elem]);
		
		//trim all ips in newTops except for last digits
		let trimmedIP = elem.slice(elem.lastIndexOf(".")+1).padStart(3, "0");
		//~ console.log(trimmedIP);
		
		// if this is a new ip (not seen before), old data is 0 queries
		let oldTotal = oldTops.has(trimmedIP) ? oldTops.get(trimmedIP) : 0;
		
		// if value changed
		if (newTops[elem] > oldTotal) {
			deltas.set(trimmedIP, newTops[elem] - oldTotal );
		
			// save new value for next time
			oldTops.set(trimmedIP, newTops[elem])
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
	
	const termWidth = process.stdout.columns;
	const graphWidth = termWidth - timeStr.length - 3; // -3 for spaces
	const queryWidth = 500; // enough for 10 mins, probably
	
	const charsPerQuery = graphWidth / queryWidth;
			
	//sort by ip
	let activity = Array.from(activityUnsorted).sort((a, b) => {
		// a[0], b[0] is the key of the map
		return a[0] - b[0];
	});
	
	
	// if last legend was multiline
	for (let i = 0; i < legendHeight; i++) {
		cursor.up().horizontalAbsolute(0).eraseLine();
	}
	
	cursor.reset().write(" " + timeStr + " ");
	
	//print bar graph
	for (let i = 0; i < activity.length; i++) {
		let data = activity[i]; // pull ip and amount out of big array

		let charsToPrint = Math.ceil(data[1] * charsPerQuery);
		
		setColor(data[0]); // set color by ip
		
		for (let j = 0; j < charsToPrint; j++) { // print 'em
			cursor.write("█");
		}
	}
	
	
	cursor.reset().write("\n");
	
	//print legend
	legendHeight = 1;
	let location = 0;
	
	colors.forEach( (color, ip) => {
		let str = "  ██ ." + ip + " ";
		
		//check if gonna need a new line
		if (location + str.length >= termWidth) {
			cursor.reset().write("\n");
			location = 0;
			legendHeight++;
		}
		
		setColor(ip); // set color by ip
		cursor.write(str);
		location += str.length;
		
	});
	
	cursor.reset().write("\n");
	
}

function timeAMPM (date) {
	let hours = date.getHours();
	let minutes = date.getMinutes();
	let ampm = hours >= 12 ? 'p' : 'a';
	
	//get hours in proper format
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	
	//to string
	hours = hours.toString();
	minutes = minutes.toString();
	
	//pad strings
	hours.padStart(2);
	minutes.padStart(2, '0');
		
	//form time from components
	return hours + ':' + minutes + ampm;
}



function setColor (ip) {
	
	let origin = Number(ip.charAt(0));
	
	//~ console.log("device #: " + device);
	
	switch (origin) {
		case 0:
			
			if (!colors.has(ip)) {
				colors.set(ip, availGreys.pop() || '#00ff00');
			}
			cursor.hex(greys.get(ip));
			
			break;
		case 1:
			
			if (!colors.has(ip)) {
				colors.set(ip, availBlues.pop() || '#00ff00');
			}
			cursor.hex(colors.get(ip));
			
			break;
		case 2:
			
			if (!colors.has(ip)) {
				colors.set(ip, availReds.pop() || '#00ff00');
			}
			cursor.hex(colors.get(ip));
			
			break;
		default:
			cursor.reset();
			console.log("ERR: Somehow you've got an invalid ip:", ip);
	}
	
}

