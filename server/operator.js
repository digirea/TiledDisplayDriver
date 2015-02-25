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
				"width" : "100",
				"height" : "100"
			};
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
		} else if (metaData.type === 'image') {
			contentData = data;
		} else if (metaData.type === 'url') {
			contentData = data;
		} else {
			console.log("Error undefined type:" + metaData.type);
		}
		
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
	
	/// register socket.io events
	function registerEvent(socket, io, ws) {
		
		function update() {
			ws.broadcast("update");
			io.sockets.emit('update');
		}
		
		function updateTransform() {
			ws.broadcast("updateTransform");
			io.sockets.emit('updateTransform');
		}
		
		socket.on('reqAddContent', function (data) {
			metabinary.loadMetaBinary(data, function (metaData, content) {
				if (metaData.type === 'url') {
					renderURL(content, function (image) {
						if (image) {
							console.log("doneAddContent");
							addContent(metaData, image, function (metaData, contentData) {
								socket.emit('doneAddContent', JSON.stringify(metaData));
								update();
							});
						}
					});
				} else {
					console.log("addcontent:" + metaData);
					addContent(metaData, content, function (metaData, contentData) {
						socket.emit('doneAddContent', JSON.stringify(metaData));
						update();
					});
				}
			});
		});
		
		socket.on('reqGetContent', function (data) {
			var json = JSON.parse(data);
			console.log("reqGetContent:" + json.id);
			getMetaData(json.type, json.id, function (meta) {
				var metaStr = "";
				if (meta) {
					metaStr = JSON.stringify(meta);
					getContent(meta.type, meta.id, function (reply) {
						var binary = metabinary.createMetaBinary(metaStr, reply);
						socket.emit('doneGetContent', binary);
					});
				}
			});
		});
		
		socket.on('reqGetMetaData', function (data) {
			var json = JSON.parse(data);
			//console.log("reqGetMetaData:" + type + '/' + id);
			getMetaData(json.type, json.id, function (reply) {
				socket.emit('doneGetMetaData', JSON.stringify(reply));
			});
		});

		socket.on('reqDeleteContent', function (data) {
			var json = JSON.parse(data);
			console.log("reqDeleteContent:" + json.id);
			deleteContent(json.id, function (id) {
				socket.emit('doneDeleteContent', JSON.stringify({"id" : id}));
				update();
			});
		});
		
		socket.on('reqUpdateContent', function (data) {
			console.log("reqUpdateContent");
			metabinary.loadMetaBinary(data, function (metaData, binaryData) {
				updateContent(metaData.id, binaryData, function (id) {
					socket.emit('doneUpdateContent', JSON.stringify({"id" : id}));
					updateTransform();
				});
			});
		});
		
		socket.on('reqUpdateTransform', function (data) {
			var json = JSON.parse(data);
			//console.log("reqUpdateTransform:" + id);
			textClient.exists(metadataPrefix + json.id, function (err, exist) {
				if (exist) {
					textClient.hmset(metadataPrefix + json.id, json, function () {
						socket.emit('doneUpdateTransform', JSON.stringify(json));
						updateTransform();
					});
				}
			});
		});
		
		getSessionList();
	}
	
	/// register websockets events
	function registerWSEvent(connection) {
		connection.on('message', function (message) {
			var request;
			if (message.type === 'utf8' && message.utf8Data === 'view') { return; }
			
			if (message.type === 'utf8') {
				request = JSON.parse(message.utf8Data);
				//console.log(request);

				if (request.name === 'reqGetMetaData') {
					//console.log("reqGetMetaData:" + request.type + '/' + request.id);
					getMetaData(request.type, request.id, function (reply) {
						if (reply) {
							connection.send(JSON.stringify(reply));
						}
					});
				} else if (request.name === 'reqGetContent') {
					console.log("reqGetContent:" + request.type + ":" + request.id);
					getMetaData(request.type, request.id, function (meta) {
						var metaStr = "";
						if (meta) {
							metaStr = JSON.stringify(meta);
							getContent(meta.type, meta.id, function (data) {
								var buffer;
								if (data) {
									buffer = metabinary.createMetaBinary(metaStr, data);
									connection.sendBytes(buffer);
								}
							});
						}
					});
				}
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
	Operator.prototype.getContent = getContent;
	Operator.prototype.getMetaData = getMetaData;
	module.exports = new Operator();
}());
