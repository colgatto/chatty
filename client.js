const fs = require('fs');
const net = require('net');
const readline = require('readline');
const crypto = require('./crypto');
const config = require('./config');

const usernames = ['ugo', 'igor', 'ettore', 'trumpone', 'ciccia99', 'admin12', 'wewe', 'giovanni', 'aldo', 'qwerty', 'guardiani', 'della', 'galassia'];
const username = usernames[Math.floor(Math.random()*usernames.length)];

const client = net.createConnection(1201, '10.9.1.152', () => {
	console.log('connected to server!');
	client.write(crypto.encrypt(':username ' + username));
});

client.on('data', (data) => {
	console.log(crypto.decrypt(data.toString()));
});

client.on('end', () => {
	console.log('disconnected from server');
	setTimeout(()=>process.exit(0), 1000);
});


const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const waitText = ()=> {
	rl.question('', function (msg) {
		client.write(crypto.encrypt(msg));
		waitText();
	});
}

waitText();
