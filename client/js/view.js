/*jslint devel:true*/
/*global io, socket, WebSocket, Blob, URL, FileReader, DataView, Uint8Array */

(function (metabinary) {
	"use strict";

	console.log(location);
	var client = new WebSocket("ws://" + location.hostname + ":8081/"),
		updateType = "all";
	
	client.onopen = function () {
		client.send("view");
	};
	
	client.onclose = function () {
		console.log('close');
	};

	/// update all contants
	function update() {
		var previewArea = document.getElementById('preview_area');
		console.log("update");
		if (updateType === 'all') {
			previewArea.innerHTML = "";
		}
		client.send(JSON.stringify({ name: 'reqGetContent', type: 'all', id: ''}));
	}
	
	/// initialize.
	/// setup gui events
	function init() {
		var updateButton = document.getElementById('update_button');
		updateButton.onclick = update;
	}
	
	window.onload = init;

	function assignMetaData(elem, metaData) {
		elem.style.left = Number(metaData.posx) + "px";
		elem.style.top = Number(metaData.posy) + "px";
		elem.style.width = Number(metaData.width) + "px";
		elem.style.height = Number(metaData.height) + "px";
	}
	
	function assignMetaBinary(metaData, contentData) {
		var previewArea = document.getElementById('preview_area'),
			tagName,
			blob,
			elem;
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
			blob = new Blob([contentData], {type: "image/jpeg"});
			if (elem && blob) {
				elem.src = URL.createObjectURL(blob);
			}
		}
		assignMetaData(elem, metaData);
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
			} else {
				// recieve metadata
				json = JSON.parse(message.data);
				assignMetaData(document.getElementById(json.id), json);
			}
		} else if (message.data instanceof Blob) {
			//console.log("found blob");
			metabinary.loadMetaBinary(message.data, function (metaData, contentData) {
				assignMetaBinary(metaData, contentData);
			});
		}
	};
}(window.metabinary));
