/*jslint devel:true*/
/*global module, require, socket */

(function () {
	"use strict";
	
	var Operator = function () {},
		redis = require("redis"),
		client = redis.createClient(6379, '127.0.0.1', {'return_buffers': true}),
		textClient = redis.createClient(6379, '127.0.0.1', {'return_buffers': false}),
		contentIDStr = "content_id",
		metadataPrefix = "metadata:",
		contentPrefix = "content:",
		metabinary = require('./metabinary.js'),
		util = require('./util.js'),
		Command = require('./command.js'),
		path = require('path'),
		fs = require('fs'),
		phantomjs = require('phantomjs'),
		frontPrefix = "tiled_server:",
		uuidPrefix = "invalid:";
	
	client.on('error', function (err) {
		console.log('Error ' + err);
	});
	
	function renderURL(url, endCallback) {
		var output = "out.png",
			command = [ phantomjs.path,
				path.normalize("./capture.js"),
				output,
				url ];
		util.launchApp(command, null, function () {
			if (fs.existsSync(output)) {
				console.log("output found");
				endCallback(fs.readFileSync(output));
			} else {
				endCallback(null);
			}
		});
	}
	
	function setMetaData(type, id, data, endCallback) {
		var metaData = data;
		if (!metaData) {
			metaData = {
				"id" : id,
				"type" : type,
				"posx" : "0",
				"posy" : "0",
				"width" : "0",
				"height" : "0"
			};
		}
		if (metaData.hasOwnProperty('command')) {
			delete metaData.command;
		}
		textClient.hmset(metadataPrefix + id, metaData, function (err) {
			if (err) {
				console.log(err);
			} else {
				endCallback(metaData);
			}
		});
	}
	
	function getMetaData(type, id, endCallback) {
		if (type === 'all') {
			textClient.keys(metadataPrefix + '*', function (err, replies) {
				replies.forEach(function (id, index) {
					textClient.hgetall(id, function (err, data) {
						endCallback(data);
					});
				});
			});
			/*
			textClient.keys(metadataPrefix + '*', function (err, replies) {
				var multi = textClient.multi();
				replies.forEach(function (reply, index) {
					multi.hgetall(reply);
				});
				multi.exec(function (err, data) {
					endCallback(data);
				});
			});
			*/
		} else {
			textClient.hgetall(metadataPrefix + id, function (err, data) {
				if (data) {
					endCallback(data);
				}
			});
		}
	}
	
	function addContent(metaData, data, endCallback) {
		var contentData = null;
		if (metaData.type === 'text') {
			contentData = data;
			metaData.mime = "text/plain";
		} else if (metaData.type === 'image') {
			contentData = data;
			metaData.mime = util.detectImageType(data);
		} else if (metaData.type === 'url') {
			contentData = data;
			metaData.mime = util.detectImageType(data);
		} else {
			console.log("Error undefined type:" + metaData.type);
		}
		
		console.log("mime:" + metaData.mime);
		
		textClient.incr(contentIDStr, function (err, id) {
			if (err) {
				console.log(err);
			} else {
				client.set(contentPrefix + id, contentData, function (err, reply) {
					if (err) {
						console.log("Error on addContent:" + err);
					} else {
						redis.print(err, reply);
						metaData.id = id;
						setMetaData(metaData.type, id, metaData, function (metaData) {
							endCallback(metaData, contentData);
						});
					}
				});
			}
		});
	}
	
	function getContent(type, id, endCallback) {
		if (type === 'all') {
			client.keys(contentPrefix + '*', function (err, replies) {
				replies.forEach(function (id, index) {
					client.get(id, function (err, reply) {
						if (!err) {
							endCallback(reply);
						} else {
							console.log(err);
						}
					});
				});
			});
		} else {
			client.get(contentPrefix + id, function (err, reply) {
				if (!err) {
					endCallback(reply);
				} else {
					console.log(err);
				}
			});
		}
	}
	
	function deleteContent(id, endCallback) {
		client.exists(contentPrefix + id, function (err, doesExist) {
			if (!err && doesExist) {
				client.del(metadataPrefix + id, function (err) {
					client.del(contentPrefix + id, function (err) {
						endCallback(id);
					});
				});
			} else {
				console.log(err);
			}
		});
	}
	
	function updateContent(id, data, endCallback) {
		console.log("updateContent:" + id);
		client.set(contentPrefix + id, data, function (err, reply) {
			if (err) {
				console.log("Error on updateContent:" + err);
			} else {
				redis.print(err, reply);
				endCallback(id);
			}
		});
	}
	
	function getSessionList() {
		client.smembers('sessions', function (err, replies) {
			replies.forEach(function (id, index) {
				console.log(id + ":" + index);
			});
		});
	}
	
	/// send metadata with command using socket.io or ws.
	function sendMetaData(command, metaData, socket, ws_connection) {
		metaData.command = command;
		if (socket) {
			socket.emit(command, JSON.stringify(metaData));
		} else if (ws_connection) {
			ws_connection.sendUTF(JSON.stringify(metaData));
		}
	}
	
	/// send binary with command using socket.io or ws.
	function sendBinary(command, binary, socket, ws_connection) {
		if (socket) {
			socket.emit(command, binary);
		} else if (ws_connection) {
			ws_connection.sendBytes(binary);
		}
	}
	
	/// do addContent command
	function commandAddContent(socket, ws_connection, metaData, binaryData, endCallback) {
		console.log("commandAddContent");
		if (metaData.type === 'url') {
			renderURL(binaryData, function (image) {
				if (image) {
					//console.log(Command.doneAddContent);
					addContent(metaData, image, function (metaData, contentData) {
						sendMetaData(Command.doneAddContent, metaData, socket, ws_connection);
						endCallback();
					});
				}
			});
		} else {
			//console.log(Command.reqAddContent + ":" + metaData);
			addContent(metaData, binaryData, function (metaData, contentData) {
				sendMetaData(Command.doneAddContent, metaData, socket, ws_connection);
				endCallback();
			});
		}
	}
	
	/// do GetContent command
	function commandGetContent(socket, ws_connection, json, endCallback) {
		//console.log("commandGetContent:" + json.id);
		getMetaData(json.type, json.id, function (meta) {
			if (meta) {
				meta.command = Command.doneGetContent;
				getContent(meta.type, meta.id, function (reply) {
					var binary = metabinary.createMetaBinary(meta, reply);
					sendBinary(Command.doneGetContent, binary, socket, ws_connection);
					endCallback();
				});
			}
		});
	}
	
	/// do GetMetaData command
	function commandGetMetaData(socket, ws_connection, json, endCallback) {
		//console.log("commandGetMetaData:" + json.type + "/" + json.id);
		getMetaData(json.type, json.id, function (metaData) {
			sendMetaData(Command.doneGetMetaData, metaData, socket, ws_connection);
			endCallback();
		});
	}
	
	/// do DeleteContent command
	function commandDeleteContent(socket, ws_connection, json, endCallback) {
		//console.log("commandDeleteContent:" + json.id);
		deleteContent(json.id, function (id) {
			socket.emit(Command.doneDeleteContent, JSON.stringify({"id" : id}));
			endCallback();
		});
	}
	
	/// do UpdateContent command
	function commandUpdateContent(socket, ws_connection, metaData, binaryData, endCallback) {
		//console.log("commandUpdateContent");
		updateContent(metaData.id, binaryData, function (id) {
			socket.emit(Command.doneUpdateContent, JSON.stringify({"id" : id}));
			endCallback();
		});
	}
	
	/// do UpdateTransform command
	function commandUpdateTransform(socket, ws_connection, json, endCallback) {
		//console.log("commandUpdateTransform:" + json.id);
		setMetaData(json.type, json.id, json, function () {
			socket.emit(Command.doneUpdateTransform, JSON.stringify(json));
			endCallback();
		});
	}
	
	/// register socket.io events
	/// @param socket
	/// @param io
	/// @param ws display's ws connection
	function registerEvent(socket, io, ws) {
		
		function update() {
			ws.broadcast(Command.update);
			io.sockets.emit(Command.update);
		}
		
		function updateTransform() {
			ws.broadcast(Command.updateTransform);
			io.sockets.emit(Command.updateTransform);
		}
		
		socket.on(Command.reqAddContent, function (data) {
			metabinary.loadMetaBinary(data, function (metaData, binaryData) {
				commandAddContent(socket, null, metaData, binaryData, update);
			});
		});
		
		socket.on(Command.reqGetContent, function (data) {
			var json = JSON.parse(data);
			commandGetContent(socket, null, JSON.parse(data), function () {});
		});
		
		socket.on(Command.reqGetMetaData, function (data) {
			commandGetMetaData(socket, null, JSON.parse(data), function () {});
		});

		socket.on(Command.reqDeleteContent, function (data) {
			commandDeleteContent(socket, null, JSON.parse(data), update);
		});
		
		socket.on(Command.reqUpdateContent, function (data) {
			metabinary.loadMetaBinary(data, function (metaData, binaryData) {
				commandUpdateContent(socket, null, metaData, binaryData, updateTransform);
			});
		});
		
		socket.on(Command.reqUpdateTransform, function (data) {
			commandUpdateTransform(socket, null, JSON.parse(data), updateTransform);
		});
		
		getSessionList();
	}
	
	/// register websockets events
	/// @param ws_connection controller's ws connection
	/// @param io
	/// @param ws display's ws instance
	function registerWSEvent(ws_connection, io, ws) {
		
		function update() {
			ws.broadcast(Command.update);
			io.sockets.emit(Command.update);
		}
		
		function updateTransform() {
			ws.broadcast(Command.updateTransform);
			io.sockets.emit(Command.updateTransform);
		}
		
		ws_connection.on('message', function (message) {
			var request;
			if (message.type === 'utf8' && message.utf8Data === 'view') { return; }
			
			if (message.type === 'utf8') {
				// json
				request = JSON.parse(message.utf8Data);
				if (request.command === Command.reqGetMetaData) {
					commandGetMetaData(null, ws_connection, request, function () {});
				} else if (request.command === Command.reqGetContent) {
					commandGetContent(null, ws_connection, request, function () {});
				} else if (request.command === Command.reqUpdateTransform) {
					commandUpdateTransform(null, ws_connection, request, updateTransform);
				}
			} else {
				// binary
				metabinary.loadMetaBinary(message.binaryData, function (metaData, binaryData) {
					if (metaData && metaData.hasOwnProperty('command')) {
						request = metaData.command;
						if (request === Command.reqAddContent) {
							console.log(Command.reqAddContent);
							commandAddContent(null, ws_connection, metaData, binaryData, update);
						} else if (request === Command.reqDeleteContent) {
							commandDeleteContent(null, ws_connection, metaData, update);
						} else if (request === Command.reqUpdateContent) {
							commandUpdateContent(null, ws_connection, metaData, binaryData, updateTransform);
						}
					}
				});
			}
		});
	}
	
	function registerUUID(id) {
		uuidPrefix = id + ":";
		client.sadd(frontPrefix + 'sessions', id);
		contentIDStr = frontPrefix + "s:" + uuidPrefix + contentIDStr;
		contentPrefix = frontPrefix + "s:" + uuidPrefix + contentPrefix;
		metadataPrefix = frontPrefix + "s:" + uuidPrefix + metadataPrefix;
		console.log("idstr;" + contentIDStr);
		console.log("idstr;" + contentPrefix);
		console.log("idstr;" + metadataPrefix);
		textClient.setnx(contentIDStr, 0);
	}
	
	Operator.prototype.registerEvent = registerEvent;
	Operator.prototype.registerWSEvent = registerWSEvent;
	Operator.prototype.registerUUID = registerUUID;
	Operator.prototype.commandGetContent = commandGetContent;
	Operator.prototype.commandGetMetaData = commandGetMetaData;
	module.exports = new Operator();
}());
