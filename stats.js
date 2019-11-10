console.log("pi-hole-stats");

const http = require('http');



/* To keep track of non-active clients that dont show up in the latest topClients
 * the last known number of queries for each IP needs to be stored
 * 
 * a Map is used since we already know what IP we need the old data for.
 */
var oldTopQs = new Map();

getNewStats();


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
				
				// once data is recieved and parsed, move on to next step
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
function getDeltas (newTopQs) {
	//~ console.log(newTopQs);
	let deltas = new Map();
	
	// array of all ips (long form)
	const ips = Object.keys(newTopQs);
	
	
	ips.forEach( (elem) => {
		//~ console.log(elem, newTopQs[elem]);
		
		//trim all ips in newTopQs except for last digits
		let trimmedIP = elem.slice(elem.lastIndexOf(".")+1);
		//~ console.log(trimmedIP);
		
		// if this is a new ip (not seen before), old data is 0 queries
		let oldTotal = oldTopQs.has(trimmedIP) ? oldTopQs.get(trimmedIP) : 0;
		
		deltas.set(trimmedIP, newTopQs[elem] - oldTotal );
		
		// save new value for next time
		oldTopQs.set(trimmedIP, newTopQs[elem])
	});
	
	//~ console.log(deltas);
	printGraph(deltas);
}

/* Given the recent activity for each ip (map: ip => #queries),
 * make & print bar graph, colored by ip
 */
function printGraph (activityUnsorted) {
	const termWidth = 
	
	
	//sort by ip
	let activity = new Map(Array.from(activityUnsorted).sort((a, b) => {
		// a[0], b[0] is the key of the map
		return a[0] - b[0];
	}));
	
	console.log(activity);
	
}
