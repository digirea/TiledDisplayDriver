/*jslint devel:true*/
/*global io, socket, WebSocket, Blob, URL, FileReader, DataView, Uint8Array */

(function (metabinary) {
	"use strict";

	console.log(location);
	var client = new WebSocket("ws://" + location.hostname + ":8081/v1/"),
		updateType = "all",
		timer,
		windowData = null;
	
	function getWindowSize() {
		return {
			width : document.documentElement.clientWidth,
			height : document.documentElement.clientHeight
		};
	}
	
	function registerWindow() {
		var wh = getWindowSize();
		client.send(JSON.stringify({ command : 'reqRegisterWindow', width : wh.width, height : wh.height}));
	}
	
	function updateWindow() {
		var wh = getWindowSize();
		if (windowData && windowData.hasOwnProperty("id")) {
			windowData.command = 'reqUpdateWindow';
			client.send(JSON.stringify(windowData));
		}
	}
	
	client.onopen = function () {
		client.send("view");
		if (!windowData) {
			registerWindow();
		}
	};
	
	client.onclose = function () {
		console.log('close');
	};

	/// update all contants
	function update() {
		var previewArea = document.getElementById('preview_area');
		
		if (updateType === 'all') {
			console.log("update all");
			previewArea.innerHTML = "";
			client.send(JSON.stringify({ command : 'reqGetContent', type: 'all', id: ''}));
		} else if (updateType === 'window') {
			client.send(JSON.stringify({ command : 'reqGetWindow', id : windowData.id}));
		} else {
			console.log("update transform");
			client.send(JSON.stringify({ command : 'reqGetMetaData', type: 'all', id: ''}));
		}
	}
	
	function assignMetaData(elem, metaData) {
		elem.style.left = Number(metaData.posx) + "px";
		elem.style.top = Number(metaData.posy) + "px";
		elem.style.width = Number(metaData.width) + "px";
		elem.style.height = Number(metaData.height) + "px";
		if (metaData.width < 10) {
			elem.style.width = "";
		}
		if (metaData.height < 10) {
			elem.style.height = "";
		}
	}
	
	function assignMetaBinary(metaData, contentData) {
		var previewArea = document.getElementById('preview_area'),
			tagName,
			blob,
			elem,
			mime = "image/jpeg";
		
		console.log("id=" + metaData.id);

		if (metaData.type === 'text') {
			tagName = 'div';
		} else {
			tagName = 'img';
		}
		if (document.getElementById(metaData.id)) {
			elem = document.getElementById(metaData.id);
		} else {
			elem = document.createElement(tagName);
			elem.id = metaData.id;
			elem.style.position = "absolute";
			previewArea.appendChild(elem);
		}
		if (metaData.type === 'text') {
			// contentData is text
			elem.innerHTML = contentData;
		} else {
			// contentData is blob
			if (metaData.hasOwnProperty('mime')) {
				mime = metaData.mime;
			}
			blob = new Blob([contentData], {type: mime});
			if (elem && blob) {
				elem.src = URL.createObjectURL(blob);
			}
		}
		assignMetaData(elem, metaData);
	}
	
	function setWindowOffset(windowData) {
		//console.log("setWindowOffset:" + JSON.stringify(windowData));
	}
	
	client.onmessage = function (message) {
		var json;
		//console.log('> got message');
		if (typeof message.data === "string") {
			if (message.data === "update") {
				// recieve update request
				console.log("update");
				updateType = 'all';
				update();
			} else if (message.data === "updateTransform") {
				// recieve update transfrom request
				//console.log("updateTransform");
				updateType = 'transform';
				update();
			} else if (message.data === "updateWindow") {
				updateType = 'window';
				update();
			} else {
				// recieve metadata
				json = JSON.parse(message.data);
				if (json.hasOwnProperty('command')) {
					if (json.command === "doneRegisterWindow") {
						windowData = json;
						return;
					} else if (json.command === "doneGetWindow") {
						windowData = json;
						setWindowOffset(windowData);
						return;
					}
				}
				assignMetaData(document.getElementById(json.id), json);
			}
		} else if (message.data instanceof Blob) {
			//console.log("found blob");
			metabinary.loadMetaBinary(message.data, function (metaData, contentData) {
				assignMetaBinary(metaData, contentData);
			});
		}
	};
	
	/// initialize.
	/// setup gui events
	function init() {
		
		// resize event
		window.onresize = function () {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(function () {
				updateWindow();
			}, 200);
		};
	}
	
	window.onload = init;
}(window.metabinary));
