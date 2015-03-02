/*jslint devel:true*/
/*global io, socket, FileReader, Uint8Array, Blob, URL, event */

(function (metabinary, vscreen) {
	"use strict";
	
	var socket = io.connect(),
		lastContentID = 0,
		currentContent = null,
		draggingID = 0,
		lastDraggingID = null,
		manipulators = [],
		draggingManip = null,
		dragOffsetTop = 0,
		dragOffsetLeft = 0,
		metaDataDict = {},
		imageScale = 1.0 / 2.0;
	
	socket.on('connect', function () {
		console.log("connect");
		socket.emit('reqRegisterEvent', "v1");
	});
	
	
	/// get image from server
	function update() {
		socket.emit('reqGetContent', JSON.stringify({type: "all", id: ""}));
	}
	
	socket.on('doneUpdateTransform', function (reply) {
	});
	
	socket.on('doneDeleteContent', function (reply) {
		console.log("doneDeleteContent");
		var json = JSON.parse(reply),
			previewArea = document.getElementById('preview_area'),
			contentID = document.getElementById('delete_content_id'),
			deleted = document.getElementById(json.id);
		previewArea.removeChild(deleted);
		contentID.innerHTML = "No Content Selected.";
		document.getElementById('content_delete_button').disabled = true;
	});
	
	socket.on('doneUpdateContent', function (reply) {
		var updateContentID = document.getElementById('update_content_id');
		updateContentID.innerHTML = "No Content Selected.";
		document.getElementById('update_image_input').disabled = true;
		update();
	});
	
	/// move manipulator rects on elem
	/// @param manips list of manipulator elements
	/// @param targetElem manipulator target
	/// @param posx left position of target
	/// @param posy top position of target
	function moveManipulator(manips, targetElem) {
		var left,
			top,
			width,
			height,
			manipHalfWidth = 5,
			manipHalfHeight = 5,
			posx = Number(targetElem.style.left.split("px").join("")),
			posy = Number(targetElem.style.top.split("px").join(""));
		
		left = (posx - manipHalfWidth);
		top = (posy - manipHalfHeight);
		width = targetElem.offsetWidth;
		height = targetElem.offsetHeight;
		
		// left top
		manips[0].style.left = left + "px";
		manips[0].style.top = top + "px";
		// left bottom
		manips[1].style.left = left + "px";
		manips[1].style.top = (top + height) + "px";
		// right bottom
		manips[2].style.left = (left + width) + "px";
		manips[2].style.top = (top + height) + "px";
		// right top
		manips[3].style.left = (left + width) + "px";
		manips[3].style.top = top + "px";
	}
	
	function assignScreenRect(elem, rect) {
		elem.style.position = 'absolute';
		elem.style.left = parseInt(rect.x, 10) + 'px';
		elem.style.top = parseInt(rect.y, 10) + 'px';
		elem.style.width = parseInt(rect.w, 10) + 'px';
		elem.style.height = parseInt(rect.h, 10) + 'px';
		console.log("assignScreenRect:" + JSON.stringify(rect));
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
		//console.log("assignRect:" + JSON.stringify(rect));
	}
	
	function assignContentProperty(metaData) {
		var transx = document.getElementById('content_transform_x'),
			transy = document.getElementById('content_transform_y'),
			transw = document.getElementById('content_transform_w'),
			transh = document.getElementById('content_transform_h');
		
		transx.value = parseInt(metaData.posx, 10);
		transy.value = parseInt(metaData.posy, 10);
		transw.value = parseInt(metaData.width, 10);
		transh.value = parseInt(metaData.height, 10);
	}
	
	function assignMetaData(elem, metaData) {
		var rect = vscreen.transform(
			parseInt(metaData.posx, 10),
			parseInt(metaData.posy, 10),
			parseInt(metaData.width, 10),
			parseInt(metaData.height, 10)
		);
		
		assignRect(elem, rect, (metaData.width < 10), (metaData.height < 10));
		//console.log("assignMetaData:" + JSON.stringify(metaData));
	}
	
	function trans(metaData) {
		var result = JSON.parse(JSON.stringify(metaData)),
			rect = vscreen.transform(parseFloat(metaData.posx, 10),
				parseFloat(metaData.posy, 10),
				parseFloat(metaData.width),
				parseFloat(metaData.height));
		result.posx = rect.x;
		result.posy = rect.y;
		result.width = rect.w;
		result.height = rect.h;
		return result;
	}
	
	function transInv(metaData) {
		var result = JSON.parse(JSON.stringify(metaData)),
			rect = vscreen.transform_inv(parseFloat(metaData.posx, 10),
				parseFloat(metaData.posy, 10),
				parseFloat(metaData.width),
				parseFloat(metaData.height));
		result.posx = rect.x;
		result.posy = rect.y;
		result.width = rect.w;
		result.height = rect.h;
		return result;
	}
	
	function transPosInv(metaData) {
		var result = JSON.parse(JSON.stringify(metaData)),
			rect = vscreen.transform_inv(parseFloat(metaData.posx, 10), parseFloat(metaData.posy, 10), 0, 0);
		result.posx = rect.x;
		result.posy = rect.y;
		result.width = metaData.width;
		result.height = metaData.height;
		return result;
	}
	
	function onManipulatorMove(evt) {
		var px, py,
			lastx, lasty,
			lastw, lasth,
			currentw,
			currenth,
			ydiff,
			elem,
			metaData,
			metaDataTransed,
			temp,
			temp2;
		if (draggingManip && lastDraggingID) {
			elem = document.getElementById(lastDraggingID);
			metaData = metaDataDict[lastDraggingID];
			//console.log("metaData:" + JSON.stringify(metaData));
			metaDataTransed = trans(metaData);
			lastx = metaDataTransed.posx;
			lasty = metaDataTransed.posy;
			lastw = metaDataTransed.width;
			lasth = metaDataTransed.height;
			
			if (draggingManip.id === '_manip_0' || draggingManip.id === '_manip_1') {
				temp = vscreen.transform(evt.clientX, evt.clientY);
				px = temp.x - dragOffsetLeft;
				py = temp.y - dragOffsetTop;
				currentw = lastw - (px - lastx);
			} else {
				temp = vscreen.transform(evt.clientX, evt.clientY);
				px = (temp.x - lastw) - dragOffsetLeft;
				py = (temp.y) - dragOffsetTop;
				currentw = lastw + (px - lastx);
			}
			//console.log("currentw:" + currentw);
			
			if (currentw < 20) { return; }
			currenth = lasth * (currentw / lastw);
			ydiff = lasth * (currentw / lastw - 1.0);
			
			metaDataTransed.width = currentw;
			metaDataTransed.height = lasth * (currentw / lastw);
			if (draggingManip.id === '_manip_0') {
				metaDataTransed.posx = (lastx + (px - lastx));
				metaDataTransed.posy = (lasty - ydiff);
			} else if (draggingManip.id === '_manip_1') {
				metaDataTransed.posx = (lastx + (px - lastx));
			} else if (draggingManip.id === '_manip_3') {
				metaDataTransed.posy = (lasty - ydiff);
			}
			//console.log("lasth:" + lasth);
			//console.log("lastw:" + lastw);
			//console.log("metaDataTransed:" + JSON.stringify(metaDataTransed));
			metaData = transInv(metaDataTransed);
			assignMetaData(elem, metaData);
			metaDataDict[lastDraggingID] = metaData;
			socket.emit('reqUpdateTransform', JSON.stringify(metaData));
		}
	}
	
	function setupManipulator(manip) {
		var manipHalfWidth = 5,
			manipHalfHeight = 5,
			cursor,
			isdragging = false;
		
		manip.style.position = "absolute";
		manip.style.border = "solid 2px black";
		manip.style.zIndex = '10';
		manip.style.width = manipHalfWidth * 2 + "px";
		manip.style.height = manipHalfHeight * 2 + "px";
		manip.style.background = "#000";
		if (manip.id === '_manip_0') {
			cursor = "nw-resize";
		} else if (manip.id === '_manip_1') {
			cursor = "sw-resize";
		} else if (manip.id === '_manip_2') {
			cursor = "se-resize";
		} else if (manip.id === '_manip_3') {
			cursor = "ne-resize";
		}
		manip.onmousedown = function (evt) {
			dragOffsetTop = evt.clientY - manip.offsetTop;
			dragOffsetLeft = evt.clientX - manip.offsetLeft;
			draggingManip = manip;
		};
		manip.onmousemove = function (evt) {
			manip.style.cursor = cursor;
		};
	}
	
	function removeManipulator() {
		var i,
			previewArea = document.getElementById('preview_area');
		for (i = 0; i < manipulators.length; i = i + 1) {
			previewArea.removeChild(manipulators[i]);
		}
		manipulators = [];
	}
	
	/// show manipulator rects on elem
	function showManipulator(elem) {
		var manips = [
				document.createElement('span'),
				document.createElement('span'),
				document.createElement('span'),
				document.createElement('span')
			],
			manip,
			previewArea = document.getElementById('preview_area'),
			i,
			posx,
			posy;
		
		moveManipulator(manips, elem, posx, posy);
		removeManipulator();
		
		for (i = 0; i < manips.length; i = i + 1) {
			manip = manips[i];
			manip.id = "_manip_" + i;
			setupManipulator(manip);
			previewArea.appendChild(manip);
			manipulators.push(manip);
		}
	}
	
	function setupContent(elem, id) {
		elem.onmousedown = function (evt) {
			var previewArea = document.getElementById('preview_area'),
				elem,
				offset;
			document.getElementById('delete_content_id').innerHTML = id;
			document.getElementById('update_content_id').innerHTML = id;
			document.getElementById('content_id').innerHTML = id;
			document.getElementById('content_delete_button').disabled = false;
			document.getElementById('update_image_input').disabled = false;
			assignContentProperty(metaDataDict[id]);
			// erase last border
			if (lastDraggingID) {
				elem = document.getElementById(lastDraggingID);
				elem.style.border = "";
				elem.style.zIndex = 0;
				lastDraggingID = null;
			}
			draggingID = id;
			elem = document.getElementById(id);
			evt = (evt) || window.event;
			//offset = vscreen.transform(evt.clientY - elem.offsetTop, evt.clientX - elem.offsetLeft);
			dragOffsetTop = evt.clientY - elem.offsetTop;
			dragOffsetLeft = evt.clientX - elem.offsetLeft;
			elem.style.border = "solid 2px black";
			elem.style.zIndex = 1;
			showManipulator(elem);
			evt.stopPropagation();
			evt.preventDefault();
		};
		window.document.onmousedown = function (evt) {
			// erase last border
			if (lastDraggingID && !draggingManip) {
				elem = document.getElementById(lastDraggingID);
				elem.style.border = "";
				elem.style.zIndex = 0;
				lastDraggingID = null;
				removeManipulator();
			}
		};
		window.document.onmousemove = function (evt) {
			var i,
				metaData,
				metaTemp,
				elem,
				pos;
			evt = (evt) || window.event;
			if (draggingID) {
				// translate
				elem = document.getElementById(draggingID);
				metaData = metaDataDict[draggingID];
				metaData.posx = evt.clientX - dragOffsetLeft;
				metaData.posy = evt.clientY - dragOffsetTop;
				
				//console.log("onmousemove:" + JSON.stringify(metaData));
				metaTemp = transPosInv(metaData);
				
				//console.log("onmousemove" + JSON.stringify(metaTemp));
				assignMetaData(elem, metaTemp);
				moveManipulator(manipulators, elem);
				
				socket.emit('reqUpdateTransform', JSON.stringify(metaTemp));
				evt.stopPropagation();
				evt.preventDefault();
			} else if (lastDraggingID) {
				// scaling
				elem = document.getElementById(lastDraggingID);
				onManipulatorMove(evt);
				moveManipulator(manipulators, elem);
				evt.stopPropagation();
				evt.preventDefault();
			}
		};
		window.document.onmouseup = function () {
			var previewArea = document.getElementById('preview_area'),
				metaData,
				elem;
			if (draggingID) {
				metaData = metaDataDict[draggingID];
				socket.emit('reqUpdateTransform', JSON.stringify(metaData));
			}
			if (draggingManip && lastDraggingID) {
				metaData = metaDataDict[lastDraggingID];
				socket.emit('reqUpdateTransform', JSON.stringify(metaData));
			} else {
				lastDraggingID = draggingID;
				draggingID = null;
			}
			draggingManip = null;
			dragOffsetTop = 0;
			dragOffsetLeft = 0;
		};
	}
	
	socket.on('doneAddContent', function (reply) {
		var json = JSON.parse(reply);
		console.log("doneAddContent:" + json.id + ":" + json.type);
		
		if (currentContent) {
			currentContent.id = json.id;
			setupContent(currentContent, json.id);
			//console.log(currentContent);
		}
		lastContentID = json.id;
		currentContent = null;
	});
	
	/// send text to server
	function sendText() {
		console.log("sendtest");
		var previewArea = document.getElementById('preview_area'),
			textInput = document.getElementById('text_input'),
			elem = document.createElement('span'),
			binary = metabinary.createMetaBinary({type : "text"}, textInput.value);
		
		elem.style.position = "absolute";
		elem.style.top = "0px";
		elem.style.left = "0px";
		elem.innerHTML = textInput.value;
		previewArea.appendChild(elem);
		currentContent = elem;
		console.log(textInput.value);
		
		socket.emit('reqAddContent', binary);
	}
	
	/// send url to server
	function sendURL() {
		console.log("sendurl");
		var previewArea = document.getElementById('preview_area'),
			urlInput = document.getElementById('url_input'),
			img = document.createElement('img'),
			binary = metabinary.createMetaBinary({type : "url"}, urlInput.value);

		img.style.position = "absolute";
		img.style.top = "0px";
		img.style.left = "0px";
		previewArea.appendChild(img);
		currentContent = img;
		console.log(urlInput.value);
		
		socket.emit('reqAddContent', binary);
	}
	
	/// send image to server
	function sendImage(imagebinary, width, height) {
		var metaData = {type : "image", posx : 0, posy : 0, width : width, height: height},
			binary = metabinary.createMetaBinary(metaData, imagebinary);
		console.log("sendImage");
		socket.emit('reqAddContent', binary);
	}
	
	/// meta data updated
	socket.on('doneGetMetaData', function (data) {
		var json = JSON.parse(data);
		metaDataDict[json.id] = json;
		assignMetaData(document.getElementById(json.id), json);
		if (draggingID === json.id) {
			assignContentProperty(json);
		}
	});
	
	/// content data updated
	socket.on('doneGetContent', function (data) {
		metabinary.loadMetaBinary(new Blob([data]), function (metaData, contentData) {
			var previewArea = document.getElementById('preview_area'),
				elem,
				tagName,
				blob;
			
			metaDataDict[metaData.id] = metaData;
			console.log("doneGetContent:" + JSON.stringify(metaData));
			
			if (metaData.type === 'text') {
				tagName = 'div';
			} else {
				tagName = 'img';
			}
			if (document.getElementById(metaData.id)) {
				elem = document.getElementById(metaData.id);
				//console.log("found " + json.type);
			} else {
				elem = document.createElement(tagName);
				elem.id = metaData.id;
				elem.style.position = "absolute";
				setupContent(elem, metaData.id);
				previewArea.appendChild(elem);
			}
			console.log("id=" + metaData.id);
			if (metaData.type === 'text') {
				// contentData is text
				elem.innerHTML = contentData;
				assignMetaData(elem, metaData);
			} else {
				// contentData is blob
				blob = new Blob([contentData], {type: "image/jpeg"});
				if (elem && blob) {
					elem.src = URL.createObjectURL(blob);
					
					elem.onload = function () {
						if (metaData.width < 10) {
							console.log("naturalWidth:" + elem.naturalWidth);
							metaData.width = elem.naturalWidth;
						}
						if (metaData.height < 10) {
							console.log("naturalHeight:" + elem.naturalHeight);
							metaData.height = elem.naturalHeight;
						}
						console.log("onload:" + JSON.stringify(metaData));
						assignMetaData(elem, metaData);
					};
				}
			}
			//console.log(metaData);
		});
	});
	
	socket.on('updateTransform', function () {
		socket.emit('reqGetMetaData', JSON.stringify({type: "all", id: ""}));
	});
	
	socket.on('update', function () {
		update();
	});
	
	/// delete content
	function deleteContent() {
		var contentID = document.getElementById('delete_content_id');
		socket.emit('reqDeleteContent', JSON.stringify({id : contentID.innerHTML}));
	}
	
	/// open image file
	function openImage(evt) {
		var files = evt.target.files,
			file,
			i,
			fileReader = new FileReader(),
			buffer,
			blob;

		fileReader.onloadend = function (e) {
			var data = e.target.result,
				img;
			if (data) {
				img = document.createElement('img');
				buffer = new Uint8Array(e.target.result);
				blob = new Blob([buffer], {type: "image/jpeg"});
				img.src = URL.createObjectURL(blob);
				img.style.position = "absolute";
				img.style.left = "0px";
				img.style.right = "0px";
				img.onload = function () {
					img.style.width = img.naturalWidth + "px";
					img.style.height = img.naturalHeight + "px";
					sendImage(e.target.result, img.naturalWidth, img.naturalHeight);
				};
			}
		};
		for (i = 0, file = files[i]; file; i = i + 1, file = files[i]) {
			if (file.type.match('image.*')) {
				fileReader.readAsArrayBuffer(file);
			}
		}
	}
	
	/// replace image file
	function replaceImage(evt) {
		var files = evt.target.files,
			file,
			i,
			fileReader = new FileReader(),
			binary,
			id = document.getElementById('update_content_id').innerHTML;

		fileReader.onloadend = function (e) {
			if (e.target.result) {
				binary = metabinary.createMetaBinary({type : "image", id : id}, e.target.result);
				socket.emit('reqUpdateContent', binary);
			}
		};
		for (i = 0, file = files[i]; file; i = i + 1, file = files[i]) {
			if (file.type.match('image.*')) {
				fileReader.readAsArrayBuffer(file);
			}
		}
	}
	
	function addScreenRect() {
		var whole = vscreen.getWhole(),
			screens = vscreen.getScreenAll(),
			s,
			wholeElem = document.createElement('span'),
			screenElem;
		
		wholeElem.style.border = 'solid';
		wholeElem.style.zIndex = -1;
		assignScreenRect(wholeElem, whole);
		document.body.appendChild(wholeElem);
		
		for (s in screens) {
			if (screens.hasOwnProperty(s)) {
				screenElem = document.createElement('span');
				screenElem.style.border = 'solid';
				screenElem.style.zIndex = -1;
				assignScreenRect(screenElem, screens[s]);
				document.body.appendChild(screenElem);
			}
		}
	}
	
	function init() {
		var textSendButton = document.getElementById('text_send_button'),
			urlSendButton = document.getElementById('url_send_button'),
			reloadButton = document.getElementById('reload_button'),
			contentDeleteButton = document.getElementById('content_delete_button'),
			fileInput = document.getElementById('file_input'),
			dropZone = document.getElementById('drop_zone'),
			updateImageInput = document.getElementById('update_image_input');
		
		textSendButton.onclick = sendText;
		urlSendButton.onclick = sendURL;
		reloadButton.onclick = update;
		contentDeleteButton.onclick = deleteContent;
		updateImageInput.addEventListener('change', replaceImage, false);
		fileInput.addEventListener('change', openImage, false);
		
		console.log("clientHeight:" + document.documentElement.clientHeight);
		vscreen.createWhole(1000, 2500, document.documentElement.clientWidth / 2, document.documentElement.clientHeight / 2, 0.3);
		//vscreen.addScreen('hoge', 100, 0, 800, 600);
		//vscreen.addScreen('moga', 300, 300, 800, 600);
		vscreen.dump();
		addScreenRect();
	}
	
	window.onload = init;

}(window.metabinary, window.vscreen));
