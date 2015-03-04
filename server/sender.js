/*jslint devel:true*/
/*global require, socket, module, Buffer */

(function () {
	"use strict";
	
	var Sender = function () {},
		operator,
		metabinary = require('./metabinary.js'),
		Command = require('./command.js');
	
	function setOperator(ope) {
		operator = ope;
	}
	
	function registerEvent(ws_connection) {
		ws_connection.on('message', function (message) {
			var request;
			if (message.type === 'utf8' && message.utf8Data === 'view') { return; }
			
			if (message.type === 'utf8') {
				request = JSON.parse(message.utf8Data);

				if (request.command === Command.reqGetMetaData) {
					operator.commandGetMetaData(null, ws_connection, request, function () {});
				} else if (request.command === Command.reqGetContent) {
					operator.commandGetContent(null, ws_connection, request, function () {});
				} else if (request.command === Command.reqGetWindow) {
					operator.commandGetWindow(null, ws_connection, request, function () {});
				} else if (request.command === Command.reqRegisterWindow) {
					operator.commandRegisterWindow(null, ws_connection, request, function () {});
				}
			}
		});
	}
	
	Sender.prototype.registerEvent = registerEvent;
	Sender.prototype.setOperator = setOperator;
	module.exports = new Sender();
}());
