/*jslint devel:true*/
/*global io, socket, WebSocket, Blob, URL, FileReader, DataView, Uint8Array */

(function (metabinary, vscreen) {
	"use strict";

	console.log(location);
	var client = new WebSocket("ws://" + location.hostname + ":8081/v1/"),
		updateType = "all",
		timer,
		windowData = null,
		metaDataDict = {},
		windowType = "window";
	
	function getWindowSize() {
		return {
			width : document.documentElement.clientWidth,
			height : document.documentElement.clientHeight
		};
	}
	
	function registerWindow() {
		var wh = getWindowSize(),
			cx = wh.width / 2.0,
			cy = wh.height / 2.0;
		vscreen.assignWhole(wh.width, wh.height, cx, cy, 1.0);
		client.send(JSON.stringify({ command : 'reqAddWindow', posx : 0, posy : 0, width : wh.width, height : wh.height}));
	}
	
	function resizeText(elem, rect) {
		var lineCount = 1,
			fsize;
		lineCount = elem.innerHTML.split("\n").length;
		fsize = parseInt((parseInt(rect.h, 10) - 1) / lineCount, 10);
		elem.style.fontSize = fsize + "px";
		if (fsize < 9) {
			elem.style.fontSize = "9px";
			elem.style.overflow = "auto";
		}
		elem.style.width = rect.w + 'px';
		elem.style.height = rect.h + 'px';
	}
	
	/*
	function updateWholeWindow() {
		var wh = getWindowSize(),
			cx = wh / 2.0,
			cy = wh / 2.0;
		vscreen.assignWhole(wh.width, wh.height, cx, cy, 1.0);
	}
	*/
	
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
	
	function assignRect(elem, rect, withoutWidth, withoutHeight) {
		elem.style.position = 'absolute';
		elem.style.left = parseInt(rect.x, 10) + 'px';
		elem.style.top = parseInt(rect.y, 10) + 'px';
		if (!withoutWidth && rect.w) {
			elem.style.width = parseInt(rect.w, 10) + 'px';
		}
		if (!withoutHeight && rect.h) {
			elem.style.height = parseInt(rect.h, 10) + 'px';
		}
	}
	
	function assignMetaData(elem, metaData) {
		//console.log("transformByScreen" + JSON.stringify(vscreen.getScreen(windowData.id)));
		var rect = vscreen.transform(
			vscreen.makeRect(
				parseInt(metaData.posx, 10),
				parseInt(metaData.posy, 10),
				parseInt(metaData.width, 10),
				parseInt(metaData.height, 10)
			)
		);
		
		if (metaData.type === windowType) { return; }
		//console.log("assingrect" + JSON.stringify(rect));
		assignRect(elem, rect, (metaData.width < 10), (metaData.height < 10));
		
		if (metaData.type === "text") {
			resizeText(elem, rect);
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
			tagName = 'pre';
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
	
	function updateWindow(metaData) {
		var cx = parseFloat(metaData.posx, 10),
			cy = parseFloat(metaData.posy, 10),
			w = parseFloat(metaData.width),
			h = parseFloat(metaData.height),
			orgW = parseFloat(vscreen.getWhole().orgW),
			scale = orgW / w;
		
		console.log("scale:" + scale);
		
		// scale
		vscreen.setPosWhole(0, 0);
		vscreen.setCenterWhole(0, 0);
		vscreen.setScaleWhole(scale);
		
		// trans
		vscreen.translateWhole(-cx, -cy);
	}
	
	function resizeViewport(windowData) {
		var wh = getWindowSize(),
			cx = wh.width / 2.0,
			cy = wh.height / 2.0,
			scale,
			id,
			metaTemp;

		updateWindow(windowData);
		
		for (id in metaDataDict) {
			if (metaDataDict.hasOwnProperty(id)) {
				if (document.getElementById(id)) {
					assignMetaData(document.getElementById(id), metaDataDict[id]);
				} else {
					delete metaDataDict[id];
				}
			}
		}
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
				console.log("updateWindow");
				update();
			} else {
				// recieve metadata
				json = JSON.parse(message.data);
				metaDataDict[json.id] = json;
				if (json.hasOwnProperty('command')) {
					if (json.command === "doneAddWindow") {
						windowData = json;
						updateWindow(windowData);
						return;
					} else if (json.command === "doneGetWindow") {
						console.log("doneGetWindow");
						windowData = json;
						resizeViewport(windowData);
						return;
					}
				}
				assignMetaData(document.getElementById(json.id), json);
				resizeViewport(windowData);
			}
		} else if (message.data instanceof Blob) {
			//console.log("found blob");
			metabinary.loadMetaBinary(message.data, function (metaData, contentData) {
				metaDataDict[metaData.id] = metaData;
				assignMetaBinary(metaData, contentData);
			});
		}
	};
	
	/// initialize.
	/// setup gui events
	function init() {
		
		// resize event
		/*
		window.onresize = function () {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(function () {
				updateWholeWindow();
			}, 200);
		};
		*/
	}
	
	window.onload = init;
}(window.metabinary, window.vscreen));
