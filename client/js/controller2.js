/*jslint devel:true */
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
		//windowDataDict = {},
		displayScale = 0.5;
	
	socket.on('connect', function () {
		console.log("connect");
		socket.emit('reqRegisterEvent', "v1");
	});
	
	
	/// get image from server
	function update() {
		socket.emit('reqGetContent', JSON.stringify({type: "all", id: ""}));
		socket.emit('reqGetWindow', JSON.stringify({type: "all", id: ""}));
	}
	
	/// delete content
	function deleteContent() {
		var contentID = document.getElementById('delete_content_id');
		socket.emit('reqDeleteContent', JSON.stringify({id : contentID.innerHTML}));
	}
	
	function addContent(binary) {
		socket.emit('reqAddContent', binary);
	}
	
	function updateTransform(metaData) {
		//console.log(JSON.stringify(metaData));
		if (metaData.type === "window") {
			// window
			//console.log("reqUpdateWindow");
			socket.emit('reqUpdateWindow', JSON.stringify(metaData));
		} else {
			//console.log("reqUpdateTransform");
			socket.emit('reqUpdateTransform', JSON.stringify(metaData));
		}
	}
	
	function updateContent(binary) {
		socket.emit('reqUpdateContent', binary);
	}
	
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
		//console.log("assingcontent:" + JSON.stringify(metaData));
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
			metaDataTransed;
		if (draggingManip && lastDraggingID) {
			elem = document.getElementById(lastDraggingID);
			metaData = metaDataDict[lastDraggingID];
			metaDataTransed = trans(metaData);
			lastx = metaDataTransed.posx;
			lasty = metaDataTransed.posy;
			lastw = metaDataTransed.width;
			lasth = metaDataTransed.height;
			
			if (draggingManip.id === '_manip_0' || draggingManip.id === '_manip_1') {
				px = evt.clientX - dragOffsetLeft;
				py = evt.clientY - dragOffsetTop;
				currentw = lastw - (px - lastx);
			} else {
				px = evt.clientX - lastw - dragOffsetLeft;
				py = evt.clientY - dragOffsetTop;
				currentw = lastw + (px - lastx);
			}
			if (currentw < 20) { return; }
			currenth = lasth * (currentw / lastw);
			ydiff = lasth * (currentw / lastw - 1.0);
			
			metaDataTransed.width = currentw;
			metaDataTransed.height = lasth * (currentw / lastw);
			if (draggingManip.id === '_manip_0') {
				metaDataTransed.posx = px;
				metaDataTransed.posy = (lasty - ydiff);
			} else if (draggingManip.id === '_manip_1') {
				metaDataTransed.posx = px;
			} else if (draggingManip.id === '_manip_3') {
				metaDataTransed.posy = (lasty - ydiff);
			}
			metaData = transInv(metaDataTransed);
			assignMetaData(elem, metaData);
			console.log("lastDraggingID:" + lastDraggingID);
			metaDataDict[lastDraggingID] = metaData;
			updateTransform(metaData);
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
	}
	
	// add content mousedown event
	window.document.addEventListener("mousedown", function (evt) {
		var elem,
			metaData;
		// erase last border
		if (lastDraggingID && !draggingManip) {
			elem = document.getElementById(lastDraggingID);
			metaData = metaDataDict[lastDraggingID];
			if (metaData.type !== "window") {
				elem.style.border = "";
			}
			elem.style.zIndex = 0;
			lastDraggingID = null;
			removeManipulator();
		}
	});
	
	// add content mousemove event
	window.document.addEventListener("mousemove", function (evt) {
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

			updateTransform(metaTemp);
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
	});
	
	// add content mouseup event
	window.document.addEventListener("mouseup", function () {
		var previewArea = document.getElementById('preview_area'),
			metaData,
			elem;
		if (draggingID) {
			metaData = metaDataDict[draggingID];
			updateTransform(metaData);
		}
		if (draggingManip && lastDraggingID) {
			metaData = metaDataDict[lastDraggingID];
			updateTransform(metaData);
		} else {
			lastDraggingID = draggingID;
			draggingID = null;
		}
		draggingManip = null;
		dragOffsetTop = 0;
		dragOffsetLeft = 0;
	});
	
	function setupWindow(elem, id) {
		elem.onmousedown = function (evt) {
			var previewArea = document.getElementById('preview_area'),
				elem,
				offset;
			//document.getElementById('delete_content_id').innerHTML = id;
			//document.getElementById('update_content_id').innerHTML = id;
			//document.getElementById('content_id').innerHTML = id;
			document.getElementById('content_delete_button').disabled = true;
			document.getElementById('update_image_input').disabled = true;
			console.log(JSON.stringify(metaDataDict));
			console.log(id);
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
			console.log(elem);
			dragOffsetTop = evt.clientY - elem.offsetTop;
			dragOffsetLeft = evt.clientX - elem.offsetLeft;
			elem.style.border = "solid 2px black";
			elem.style.zIndex = 1;
			showManipulator(elem);
			evt.stopPropagation();
			evt.preventDefault();
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
		
		addContent(binary);
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
		
		addContent(binary);
	}
	
	/// send image to server
	function sendImage(imagebinary, width, height) {
		var metaData = {type : "image", posx : 0, posy : 0, width : width, height: height},
			binary = metabinary.createMetaBinary(metaData, imagebinary);
		console.log("sendImage");
		addContent(binary);
	}
	
	/// meta data updated
	socket.on('doneGetMetaData', function (data) {
		var json = JSON.parse(data);
		if (json.type === "window") { return; }
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
				blob,
				mime = "image/jpeg";
			
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
				if (metaData.hasOwnProperty('mime')) {
					mime = metaData.mime;
					console.log("mime:" + mime);
				}
				blob = new Blob([contentData], {type: mime});
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
						//console.log("onload:" + JSON.stringify(metaData));
						assignMetaData(elem, metaData);
					};
				}
			}
			//console.log(metaData);
		});
	});
	
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
				updateContent(binary);
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
		
		console.log("screens:" + JSON.stringify(vscreen));
		
		wholeElem.style.border = 'solid';
		wholeElem.style.zIndex = -1;
		wholeElem.className = "screen";
		assignScreenRect(wholeElem, whole);
		document.body.appendChild(wholeElem);
		
		for (s in screens) {
			if (screens.hasOwnProperty(s)) {
				screenElem = document.createElement('div');
				screenElem.className = "screen";
				screenElem.id = s;
				console.log("screenElemID:" + screenElem.id);
				screenElem.style.border = 'solid';
				screenElem.style.zIndex = -1;
				assignScreenRect(screenElem, screens[s]);
				document.body.appendChild(screenElem);
				setupWindow(screenElem, s);
			}
		}
	}
	
	function updateScreen(scale) {
		var resolutionWidth = document.getElementById('resolution_width'),
			resolutionHeight = document.getElementById('resolution_height'),
			w = parseInt(resolutionWidth.value, 10),
			h = parseInt(resolutionHeight.value, 10),
			cx = document.documentElement.clientWidth / 2,
			cy = document.documentElement.clientHeight / 2,
			screens = document.body.getElementsByClassName('screen'),
			ww = w,
			i,
			metaData,
			elem;
		
		if (w !== ww) {
			return "NaN";
		}
		vscreen.createWhole(resolutionWidth.value, resolutionHeight.value, cx, cy, scale);
		for (i = screens.length - 1; i >= 0; i = i - 1) {
			document.body.removeChild(screens.item(i));
		}
		for (i in metaDataDict) {
			if (metaDataDict.hasOwnProperty(i)) {
				metaData = metaDataDict[i];
				if (metaData.type !== "window") {
					elem = document.getElementById(metaData.id);
					if (elem) {
						assignMetaData(elem, metaData);
					}
				}
			}
		}
		addScreenRect();
	}
	
	function init() {
		var textSendButton = document.getElementById('text_send_button'),
			urlSendButton = document.getElementById('url_send_button'),
			contentDeleteButton = document.getElementById('content_delete_button'),
			fileInput = document.getElementById('file_input'),
			dropZone = document.getElementById('drop_zone'),
			updateImageInput = document.getElementById('update_image_input'),
			displayTab = document.getElementById('display_tab'),
			displayTabTitle = document.getElementById('display_tab_title'),
			contentTab = document.getElementById('content_tab'),
			contentTabTitle = document.getElementById('content_tab_title'),
			resolutionWidth = document.getElementById('resolution_width'),
			resolutionHeight = document.getElementById('resolution_height'),
			displayScaleElem = document.getElementById('display_scale'),
			deleteAllWindow = document.getElementById('delete_all_window'), // for debug
			timer = null;
			
		resolutionWidth.value = 1000;
		resolutionHeight.value = 900;
		textSendButton.onclick = sendText;
		urlSendButton.onclick = sendURL;
		contentDeleteButton.onclick = deleteContent;
		updateImageInput.addEventListener('change', replaceImage, false);
		fileInput.addEventListener('change', openImage, false);
		
		displayTabTitle.onclick = function () {
			contentTab.style.display = "none";
			displayTab.style.display = "block";
			contentTabTitle.className = "";
			displayTabTitle.className = "active";
		};
		contentTabTitle.onclick = function () {
			displayTab.style.display = "none";
			contentTab.style.display = "block";
			contentTabTitle.className = "active";
			displayTabTitle.className = "";
		};
		resolutionWidth.onchange = function () {
			updateScreen(displayScale);
		};
		resolutionHeight.onchange = function () {
			updateScreen(displayScale);
		};
		displayScaleElem.onchange = function () {
			displayScale = parseFloat(displayScaleElem.value);
			if (displayScale < 0) {
				displayScale = 0.01;
			} else if (displayScale > 1.0) {
				displayScale = 1.0;
			}
			updateScreen(displayScale);
		};
		
		// for debug
		deleteAllWindow.onclick = function () {
			socket.emit('debugDeleteWindowAll');
		};
		
		// resize event
		window.onresize = function () {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(function () {
				removeManipulator();
				updateScreen(displayScale);
			}, 200);
		};
		
		console.log("clientHeight:" + document.documentElement.clientHeight);
		updateScreen(displayScale);
		vscreen.dump();
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
	
	socket.on('doneGetWindow', function (reply) {
		var windowData = JSON.parse(reply);
		console.log('doneGetWindow:' + reply);
		
		if (windowData.hasOwnProperty('posx')) {
			windowData.posx = parseInt(windowData.posx, 10);
		} else {
			windowData.posx = 0;
		}
		if (windowData.hasOwnProperty('posy')) {
			windowData.posy = parseInt(windowData.posy, 10);
		} else {
			windowData.posy = 0;
		}
		metaDataDict[windowData.id] = windowData;
		vscreen.addScreen(windowData.id, windowData.posx, windowData.posy, windowData.width, windowData.height);
		updateScreen(displayScale);
	});
	
	socket.on('updateTransform', function () {
		socket.emit('reqGetMetaData', JSON.stringify({type: "all", id: ""}));
	});
	
	socket.on('updateWindow', function () {
		console.log('updateWindow');
		//update();
	});
	
	socket.on('update', function () {
		update();
	});
	
	
	window.onload = init;

}(window.metabinary, window.vscreen));
