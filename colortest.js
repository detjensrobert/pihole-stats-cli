// Packages to get
const request = require('request-promise-native');
const { setIntervalAsync } = require('set-interval-async/legacy');
const ansi = require('ansi');

const cursor = ansi(process.stdout);

//color sets with a colors related to <color>
//~ var reds = ['#ef9a9a', '#ef5350', '#f44336', '#e53935', '#ff0a0a'];
//~ var blues = [ '#87CCF1', '#00B9FF', '#47B2EB' , '#00A1F8', '#3C78C8'];

//color 'sequence' from white to <color>
//~ var reds = ['#FFC9C9', '#FFA4A4', '#FF7575', '#FF3F3F', '#ff0a0a'];
var reds = ['#FFff00', '#FFcc00', '#FF9900', '#FF6600', '#ff3300', '#ff0000'];
var blues = ['#00ffFF', '#00ccff', '#0099FF', '#0066ff', '#0033ff'];

var greys = ['#FFFFFF', '#dadada', '#9e9e9e', '#606060', '#444444'];

reds.forEach(function(elem){
	cursor.hex(elem).write("██").reset();
});

console.log("");

blues.forEach(function(elem){
	cursor.hex(elem).write("██").reset();
});

console.log("")

greys.forEach(function(elem){
	cursor.hex(elem).write("██").reset();
});

console.log("");
