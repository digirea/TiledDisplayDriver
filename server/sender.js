/*jslint devel:true*/
/*global require, socket, module, Buffer */

(function () {
	"use strict";
	
	var Sender = function () {},
		operator,
		metabinary = require('./metabinary.js');
	
	function setOperator(ope) {
		operator = ope;
	}
	
	function registerEvent(connection) {
		connection.on('message', function (message) {
			var request;
			if (message.type === 'utf8' && message.utf8Data === 'view') { return; }
			
			if (message.type === 'utf8') {
				request = JSON.parse(message.utf8Data);

				if (request.name === 'reqGetMetaData') {
					//console.log("reqGetMetaData:" + request.type + '/' + request.id);
					operator.getMetaData(request.type, request.id, function (type, id, reply) {
						if (reply) {
							connection.send(JSON.stringify(reply));
						}
					});
				} else if (request.name === 'reqGetContent') {
					//console.log("reqGetContent:" + request.type + ":" + request.id);
					operator.getMetaData(request.type, request.id, function (meta) {
						var metaStr = "";
						if (meta) {
							metaStr = JSON.stringify(meta);
							operator.getContent(meta.type, meta.id, function (data) {
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
	
	Sender.prototype.registerEvent = registerEvent;
	Sender.prototype.setOperator = setOperator;
	module.exports = new Sender();
}());
