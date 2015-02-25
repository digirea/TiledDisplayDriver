/*jslint devel:true*/
/*global process, require, socket */

var fs = require('fs'),
	http = require('http'),
	WebSocket = require('websocket'),
	util = require('./util'),
	operator = require('./operator.js'),
	sender = require('./sender.js'),
	port = 8080;

console.log(operator);

/*
util.generateUUID(function (err, uuid) {
	'use strict';
	var id = uuid.slice(0, 8);
	console.log(id);
	operator.registerUUID(id);
});
*/

operator.registerUUID("default");

//----------------------------------------------------------------------------------------
// websocket sender
//----------------------------------------------------------------------------------------
/// http server instance for sender
var seserver = http.createServer(function (req, res) {
	'use strict';
	console.log('REQ>', req.url);
	res.end("websocket sender");
});
seserver.listen(port + 1);

/// web socket server instance
var ws = new WebSocket.server({ httpServer : seserver,
		maxReceivedFrameSize : 0x1000000, // more receive buffer!! default 65536B
		autoAcceptConnections : false});

ws.on('request', function (request) {
	"use strict";
	var connection = request.accept(null, request.origin);
	console.log((new Date()) + " ServerImager Connection accepted.");
	
	connection.on('message', function (message) {
		if (message.type === 'utf8') {
			//console.log("got text" + data);
			if (message.utf8Data === "view") {
				sender.setOperator(operator);
				console.log("register" + message.utf8Data);
				sender.registerEvent(connection);
				ws.broadcast("update");
			}
		}
	});
	
	connection.on('close', function () {
		console.log('connection closed');
	});
	
});

//----------------------------------------------------------------------------------------
// socket.io operator
//----------------------------------------------------------------------------------------
/// http server instance for operation
var opsever = http.createServer(function (req, res) {
	'use strict';
	console.log('REQ>', req.url);
	var file,
		fname,
		ext,
		url = req.url;
	if (url === '/') {
		file = fs.readFileSync('../client/index.html');
		res.end(file);
	} else {
		fs.readFile('../client/' + url, function (err, data) {
			if (err) {
				res.writeHead(404, {'Content-Type': 'text/html', charaset: 'UTF-8'});
				res.end("<h1>not found<h1>");
				return;
			}
			ext = util.getExtention(url);
			if (ext === "css") {
				res.writeHead(200, {'Content-Type': 'text/css', charaset: 'UTF-8'});
			} else if (ext === "html" || ext === "htm") {
				res.writeHead(200, {'Content-Type': 'text/html', charaset: 'UTF-8'});
			} else if (ext === "js" || ext === "json") {
				res.writeHead(200, {'Content-Type': 'text/javascript', charaset: 'UTF-8'});
			} else {
				res.writeHead(200);
			}
			res.end(data);
		}); // fs.readFile
	}
});
if (process.argv.length > 2) {
	port = process.argv[2];
}
opsever.listen(port);

/// socekt.io server instance
var io = require('socket.io').listen(opsever);

io.sockets.on('connection', function (socket) {
	"use strict";
	console.log("[CONNECT] ID=" + socket.id);
	
	socket.on('reqRegisterEvent', function (page) {
		if (page === 'controller') {
			operator.registerEvent(socket, io, ws);
			io.sockets.emit('update');
		}
	});
	
	/*
	socket.on("update", function (type) {
		//console.log("UPDATE!");
		if (type === 'transform') {
			ws.broadcast("updateTransform");
			io.sockets.emit('updateTransform');
		} else {
			ws.broadcast("update");
			io.sockets.emit('update');
		}
	});
	*/
	
	socket.on('disconnect', function () {
		console.log("disconnect:" + socket.id);
	});
});


//----------------------------------------------------------------------------------------
// websocket operator
//----------------------------------------------------------------------------------------
/// http server instance for websocket operator
var wsopserver = http.createServer(function (req, res) {
	'use strict';
	console.log('REQ>', req.url);
	res.end("websocket operator");
});
wsopserver.listen(port + 2);

/// web socket server instance
var ws2 = new WebSocket.server({ httpServer : wsopserver,
		maxReceivedFrameSize : 0x1000000, // more receive buffer!! default 65536B
		autoAcceptConnections : false});

ws2.on('request', function (request) {
	"use strict";
	var connection = request.accept(null, request.origin);
	console.log((new Date()) + " ServerImager Connection accepted.");
	
	connection.on('message', function (message) {
		if (message.type === 'utf8') {
			//console.log("got text" + data);
			if (message.utf8Data === "view") {
				console.log("register" + message.utf8Data);
				operator.registerWSEvent(connection, io, ws);
			}
		}
	});
	
	connection.on('close', function () {
		console.log('connection closed');
	});
	
});

//----------------------------------------------------------------------------------------

console.log('start server "http://localhost:' + port + '/"');
console.log('start ws sender server "ws://localhost:' + (port + 1) + '/"');
console.log('start ws operate server "ws://localhost:' + (port + 2) + '/"');

