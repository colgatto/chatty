const fs = require('fs');
const https = require('https');
const net = require('net');
const dgram = require('dgram');
const ws = require('ws');
const url = require('url');
const os = require('os');
const Netmask = require('netmask').Netmask;
const sServ = require('node-static').Server;
const open = require('open');
const _crypto = require('crypto');
const crypto = require('./crypto');
const config = require('./config');

let portIndex = config.room_port_start;

//ROOM

class Room{
	
	constructor(opt){
		this.data = {
			id: opt.id,
			name: opt.name,
			ip: opt.ip,
			port: opt.port
		};
		this.clients = [];
		this.server = null;
		this.idAI = 0;
	}
	
	open(){
		
		this.server = net.createServer((socket) => {
			this.idAI++;

			socket._id = this.idAI;
			socket.nickname = "Guest" + socket._id;
			
			this.clients.push(socket);
			console.log(socket.nickname + ' joined this chat.');
			
			this.broadcast(socket, socket.nickname + ' join');
			
			socket.write(crypto.encrypt("Welcome!\n" + this.clients.length + " user online"));
		
			socket.on('data', (data) => {
				//console.log(data.toString());
				let msg = crypto.decrypt(data.toString());
				if(msg.match(/^:username [\w\d]+$/)){
					let newName = msg.slice(10);
					let text = socket.nickname + ' change name to ' + newName;
					socket.nickname = newName;
					console.log(text);
					this.broadcast(socket, '[' + text + ']');
					return;
				}
				if(msg == ':q'){
					socket.end();
					return;
				}
				let text = socket.nickname + '> ' + msg;
				console.log(text);
				this.broadcast(socket, text);
			});
		
			socket.on('end', () => this.closeSocket(socket));
		
			socket.on('error', (error) => {
				console.log('Socket got problems: ', error.message);
				socket.end();
			});

		});
		
		this.server.on('error', (error) => {
			console.log("So we got problems!", error.message);
		});

		this.server.listen(this.data.port, () => {
			console.log("Run Room `" + this.data.name + "` on 0.0.0.0:" + this.data.port);
		});

		return this;
	}

	broadcast(from, message){
		if (this.clients.length === 0) {
			console.log('Everyone left the chat');
			return this;
		}
		this.clients.forEach((socket, index, array) => {
			if(socket._id === from._id) return;
			console.log('invio ' + message);
			socket.write(crypto.encrypt(message));
		});
		return this;
	}

	closeSocket(socket){
		let message = socket.nickname + ' left this chat';
		for (let i = 0; i < this.clients.length; i++) {
			const cl = this.clients[i];
			if(cl._id == socket._id){
				this.clients.splice(i,1);
				break;
			}
		}
		console.log(message);
		this.broadcast(socket, '[' + message + ']');
	}
}

const my_rooms = [];
const available_rooms = [];

//API UTILS

const getIps = ()=>{
	const nets = os.networkInterfaces();
	const results = [];
	for (const name of Object.keys(nets)) {
		for (const net of nets[name]) {
			// Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
			if (net.family === 'IPv4' && !net.internal) {
				let b = new Netmask(net.cidr);
				results.push({
					ip: net.address,
					cidr: net.cidr,
					broadcast: b.broadcast
				});
			}
		}
	}
	return results;
}

const getRoom = id => {
	for (let i = 0; i < available_rooms.length; i++) {
		const room = available_rooms[i];
		if(room.id == id) return room;
	}
	return false;
}

const send_json = (res, data) => {
	res.writeHead(200, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(data));
}

const sendRoom = (ip, cb = ()=>{}) => {
	const server = dgram.createSocket("udp4");
	server.bind(() => {
		server.setBroadcast(true);
		let message = Buffer.from( crypto.encrypt( ":rooms " + JSON.stringify(my_rooms.map( r => r.data )) ) );
		server.send(message, 0, message.length, config.update_port, ip, cb);
	});
}

const join = ()=>{

}

//UPDATER

const updateListener = dgram.createSocket('udp4');
updateListener.on('message', (msg, info) => {
	let data = crypto.decrypt(msg.toString());
	//console.log('ricevuto ' + data);
	if(data.match(/^:update$/) && my_rooms.length > 0){
		sendRoom(info.address);
	}else if(data.match(/^:rooms [\w\W]+$/)){
		let r = JSON.parse(data.slice(7).trim());
		let available_ids = available_rooms.map(v => v.data.id);
		r.forEach(roomData => {
			if(available_ids.includes(roomData.id)) return;
			roomData.ip = info.address;
			available_rooms.push(new Room(roomData));
			available_ids.push(roomData.id);
		});
	}
});
updateListener.on('listening', function(){
    let addr = updateListener.address();
    console.log("Run UpdateListener on " + addr.address + ":" + addr.port);
});
updateListener.bind(config.update_port);

//WEB CLIENT
const www = new sServ(__dirname+'/www');
const server = https.createServer({
	cert: fs.readFileSync(__dirname + '/.keys/cert.pem'),
	key: fs.readFileSync(__dirname + '/.keys/key.pem')
}, (req, res) => {

	let u = url.parse(req.url,true);
		
	if(u.pathname.match(/^\/roomlist/)){

		var ips = getIps();
		ips.forEach(ip => {
			const tmp_server = dgram.createSocket("udp4");
			tmp_server.bind(() => {
				tmp_server.setBroadcast(true);
				let message = Buffer.from(crypto.encrypt(":update"));
				tmp_server.send(message, 0, message.length, config.update_port, ip.broadcast, () => {
					//console.log("Sent '" + message + "'");
				});
			});
		});
		setTimeout(()=>{
			return send_json(res, available_rooms.map(r => r.data));
		}, 3000);

	}else if(u.pathname.match(/^\/join/)){
		
		if(typeof u.query.id != 'string') return send_json(res, { err: 'no id' });
		let room = getRoom(u.query.id);
		if(!room) return send_json(res, { err: 'not found' });

		join(room);
		return send_json(res, { todo: 'TODO' });

	}else if(u.pathname.match(/^\/createRoom/)){

		if(typeof u.query.name != 'string') return send_json(res, {err: 'no name'});
		let room = new Room({
			id: _crypto.randomBytes(16).toString('hex'),
			port: portIndex++,
			name: u.query.name,
			ip: 'local'
		});
		room.open();
		my_rooms.push(room);
		available_rooms.push(room);
		return send_json(res, room.data);

	}else{
		return www.serve(req, res);
	}
});

//SOCKET SERVER X WEB CLIENT
const wss = new ws.WebSocketServer({ server });

wss.on('connection', (sock) => {
	sock.on('message', (data) => {
		let msg = data.toString();
		//console.log( msg );
	});
	sock.send('helo');
});

server.listen(config.webgui_port);

console.log('Run Web Server on https://127.0.0.1:' + config.webgui_port);

//open('https://127.0.0.1:' + config.webgui_port);