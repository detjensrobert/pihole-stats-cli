// Packages to get
const request = require('request-promise-native');
const { setIntervalAsync } = require('set-interval-async/legacy');
const ansi = require('ansi');

const cursor = ansi(process.stdout);

//var reds = ['#ef9a9a', '#e57373', '#ef5350', '#f44336', '#e53935', '#FF3333', '#E11B1B', '#B32000', '#8E1F07'];

var reds = ['#ffbebe', '#ffb2b2', '#ffa6a6', '#ff9a9a', '#ff8e8e', '#ff8282', '#ff7676', '#ff6a6a', '#ff5e5e', '#ff5252', '#ff4646', '#ff3a3a', '#ff2e2e', '#ff2222', '#ff1616', '#ff0a0a'];
reds.forEach(function(elem){
	cursor.hex(elem);
	process.stdout.write("█");
	cursor.fg.reset();
});

