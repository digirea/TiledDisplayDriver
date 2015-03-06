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
		displayScale = 0.5,
		windowType = "window";
	
	socket.on('connect', function () {
		console.log("connect");
		socket.emit('reqRegisterEvent', "v1");
	});
	
	
	/// get image from server
	function update() {
		vscreen.clearScreenAll();
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
		if (metaData.type === windowType) {
			// window
			//console.log("reqUpdateWindow");
			console.log("JSON.stringify(metaData)" + JSON.stringify(metaData));
			socket.emit('reqUpdateWindow', JSON.stringify(metaData));
		} else {
			//console.log("reqUpdateTransform");
			socket.emit('reqUpdateTransform', JSON.stringify(metaData));
		}
	}
	
	function updateContent(binary) {
		socket.emit('reqUpdateContent', binary);
	}
	
	function resizeText(elem, rect) {
		if (rect.h - 1 > 9) {
			elem.style.fontSize = rect.h - 1 + "px";
		} else {
			elem.style.fontSize = "9px";
			elem.style.width = "";
			elem.style.height = "";
		}
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
		console.log("assignContentProperty:" + JSON.stringify(metaData));
		var transx = document.getElementById('content_transform_x'),
			transy = document.getElementById('content_transform_y'),
			transw = document.getElementById('content_transform_w'),
			transh = document.getElementById('content_transform_h');
		
		transx.value = parseInt(metaData.posx, 10);
		transy.value = parseInt(metaData.posy, 10);
		transw.value = parseInt(metaData.width, 10);
		transh.value = parseInt(metaData.height, 10);
	}
	
	function toFloatRect(metaData) {
		return vscreen.makeRect(
			parseFloat(metaData.posx),
			parseFloat(metaData.posy),
			parseFloat(metaData.width),
			parseFloat(metaData.height)
		);
	}
	
	function toIntRect(metaData) {
		return vscreen.makeRect(
			parseInt(metaData.posx, 10),
			parseInt(metaData.posy, 10),
			parseInt(metaData.width, 10),
			parseInt(metaData.height, 10)
		);
	}
	
	function assignMetaData(elem, metaData) {
		var rect = vscreen.transformOrg(toIntRect(metaData));
		assignRect(elem, rect, (metaData.width < 10), (metaData.height < 10));
		if (metaData.type === "text") {
			resizeText(elem, rect);
		}
		console.log("assignMetaData:" + JSON.stringify(metaData));
	}
	
	function trans(metaData) {
		var rect = vscreen.transformOrg(toFloatRect(metaData));
		metaData.posx = rect.x;
		metaData.posy = rect.y;
		metaData.width = rect.w;
		metaData.height = rect.h;
		return metaData;
	}
	
	function transInv(metaData) {
		var rect = vscreen.transformOrgInv(toFloatRect(metaData));
		metaData.posx = rect.x;
		metaData.posy = rect.y;
		metaData.width = rect.w;
		metaData.height = rect.h;
		return metaData;
	}
	
	function transPosInv(metaData) {
		var rect = vscreen.transformOrgInv(
			vscreen.makeRect(parseFloat(metaData.posx, 10), parseFloat(metaData.posy, 10), 0, 0)
		);
		metaData.posx = rect.x;
		metaData.posy = rect.y;
	}
	
	function onManipulatorMove(evt) {
		var px, py,
			lastx, lasty,
			lastw, lasth,
			currentw,
			currenth,
			ydiff,
			elem,
			metaData;
		if (draggingManip && lastDraggingID) {
			elem = document.getElementById(lastDraggingID);
			metaData = metaDataDict[lastDraggingID];
			trans(metaData);
			lastx = metaData.posx;
			lasty = metaData.posy;
			lastw = metaData.width;
			lasth = metaData.height;
			
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
			
			metaData.width = currentw;
			metaData.height = lasth * (currentw / lastw);
			if (draggingManip.id === '_manip_0') {
				metaData.posx = px;
				metaData.posy = (lasty - ydiff);
			} else if (draggingManip.id === '_manip_1') {
				metaData.posx = px;
			} else if (draggingManip.id === '_manip_3') {
				metaData.posy = (lasty - ydiff);
			}
			transInv(metaData);
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
	
	/// select content or window
	function select(id) {
		var elem,
			metaData = metaDataDict[id];
		
		assignContentProperty(metaDataDict[id]);
		draggingID = id;
		elem = document.getElementById(id);
		elem.style.border = "solid 2px black";
		if (metaData.type === windowType) {
			document.getElementById('content_delete_button').disabled = true;
			document.getElementById('update_image_input').disabled = true;
		} else {
			document.getElementById('delete_content_id').innerHTML = id;
			document.getElementById('update_content_id').innerHTML = id;
			document.getElementById('content_id').innerHTML = id;
			document.getElementById('content_delete_button').disabled = false;
			document.getElementById('update_image_input').disabled = false;
		}
		if (elem.style.zIndex === "") {
			elem.style.zIndex = 0;
		}
		document.getElementById('content_transform_z').value = elem.style.zIndex;
		showManipulator(elem);
	}
	
	/// unselect content or window
	function unselect() {
		var elem,
			metaData;
		if (lastDraggingID) {
			elem = document.getElementById(lastDraggingID);
			metaData = metaDataDict[lastDraggingID];
			if (metaData.type !== windowType) {
				elem.style.border = "";
			}
			lastDraggingID = null;
		}
	}
	
	/// change zIndex
	function changeZIndex(index) {
		var id = document.getElementById('content_id').innerHTML,
			elem;
		console.log("id:" + id);
		if (id) {
			elem = document.getElementById(id);
			elem.style.zIndex = index;
			console.log("change zindex:" + index);
		}
	}
	
	/// setup content
	function setupContent(elem, id) {
		elem.onmousedown = function (evt) {
			var previewArea = document.getElementById('preview_area');
			// erase last border
			unselect();
			select(id);
			evt = (evt) || window.event;
			dragOffsetTop = evt.clientY - elem.offsetTop;
			dragOffsetLeft = evt.clientX - elem.offsetLeft;
			evt.stopPropagation();
			evt.preventDefault();
		};
	}
	
	///  setup window
	function setupWindow(elem, id) {
		setupContent(elem, id);
	}
	
	// add content mousedown event
	window.document.addEventListener("mousedown", function (evt) {
		var elem,
			metaData;
		// erase last border
		if (lastDraggingID && !draggingManip) {
			unselect();
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
			
			console.log("metaData.posx:" + metaData.posx);
			metaData.posx = evt.clientX - dragOffsetLeft;
			metaData.posy = evt.clientY - dragOffsetTop;
			transPosInv(metaData);
			
			assignMetaData(elem, metaData);
			moveManipulator(manipulators, elem);

			updateTransform(metaData);
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
			//updateTransform(metaData);
		}
		if (draggingManip && lastDraggingID) {
			metaData = metaDataDict[lastDraggingID];
			//updateTransform(metaData);
		} else {
			lastDraggingID = draggingID;
			draggingID = null;
		}
		draggingManip = null;
		dragOffsetTop = 0;
		dragOffsetLeft = 0;
	});
	
	/// send text to server
	function sendText() {
		console.log("sendtest");
		var previewArea = document.getElementById('preview_area'),
			textInput = document.getElementById('text_input'),
			elem = document.createElement('span'),
			width = (textInput.clientWidth + 1),
			height = (textInput.clientHeight + 1),
			binary = metabinary.createMetaBinary({type : "text", width : width, height : height}, textInput.value);
		
		elem.style.position = "absolute";
		elem.style.top = "0px";
		elem.style.left = "0px";
		elem.innerHTML = textInput.value;
		previewArea.appendChild(elem);
		currentContent = elem;
		console.log(textInput.value);
		console.log(textInput.style);
		
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
	
	/// add all screens
	function addScreenRect() {
		var whole = vscreen.getWhole(),
			screens = vscreen.getScreenAll(),
			s,
			wholeElem = document.createElement('span'),
			previewArea = document.getElementById('preview_area'),
			screenElem;
		
		console.log("screens:" + JSON.stringify(vscreen));
		
		wholeElem.style.border = 'solid';
		wholeElem.style.zIndex = -100;
		wholeElem.className = "screen";
		assignScreenRect(wholeElem, whole);
		previewArea.appendChild(wholeElem);
		
		for (s in screens) {
			if (screens.hasOwnProperty(s)) {
				screenElem = document.createElement('div');
				screenElem.className = "screen";
				screenElem.id = s;
				console.log("screenElemID:" + JSON.stringify(screens[s]));
				screenElem.style.border = 'solid';
				assignScreenRect(screenElem, vscreen.transformScreen(screens[s]));
				previewArea.appendChild(screenElem);
				setupWindow(screenElem, s);
			}
		}
	}
	
	/// update all screens
	function updateScreen(scale) {
		var resolutionWidth = document.getElementById('resolution_width'),
			resolutionHeight = document.getElementById('resolution_height'),
			w = parseInt(resolutionWidth.value, 10),
			h = parseInt(resolutionHeight.value, 10),
			cx = document.documentElement.clientWidth / 2,
			cy = document.documentElement.clientHeight / 2,
			previewArea = document.getElementById('preview_area'),
			screens = previewArea.getElementsByClassName('screen'),
			ww = w,
			i,
			metaData,
			elem;
		
		if (w !== ww) {
			return "NaN";
		}
		
		vscreen.assignWhole(resolutionWidth.value, resolutionHeight.value, cx, cy, scale);
		for (i = screens.length - 1; i >= 0; i = i - 1) {
			previewArea.removeChild(screens.item(i));
		}
		for (i in metaDataDict) {
			if (metaDataDict.hasOwnProperty(i)) {
				metaData = metaDataDict[i];
				if (metaData.type !== windowType) {
					elem = document.getElementById(metaData.id);
					if (elem) {
						assignMetaData(elem, metaData);
					}
				}
			}
		}
		addScreenRect();
	}
	
	/// import content
	function importContent(metaData, contentData) {
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
	}
	
	/// import window
	function importWindow(windowData) {
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
		console.log("import window:" + JSON.stringify(windowData));
		metaDataDict[windowData.id] = windowData;
		vscreen.assignScreen(windowData.id, windowData.posx, windowData.posy, windowData.width, windowData.height);
		updateScreen(displayScale);
	}
	
	/// initialize elemets, events
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
			contentZ = document.getElementById('content_transform_z'),
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
		contentZ.onchange = function () {
			var val = parseInt(contentZ.value, 10);
			changeZIndex(val);
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
	
	///------------------------------------------------------------------------
	
	/// meta data updated
	socket.on('doneGetMetaData', function (data) {
		var json = JSON.parse(data);
		if (json.type === windowType) { return; }
		metaDataDict[json.id] = json;
		assignMetaData(document.getElementById(json.id), json);
		if (draggingID === json.id) {
			assignContentProperty(json);
		}
	});
	
	/// content data updated
	socket.on('doneGetContent', function (data) {
		metabinary.loadMetaBinary(new Blob([data]), function (metaData, contentData) {
			importContent(metaData, contentData);
		});
	});
	
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
	
	socket.on('doneGetWindow', function (reply) {
		var windowData = JSON.parse(reply);
		console.log('doneGetWindow:' + reply);
		importWindow(windowData);
	});
	
	socket.on('updateTransform', function () {
		socket.emit('reqGetMetaData', JSON.stringify({type: "all", id: ""}));
	});
	
	socket.on('updateWindow', function () {
		console.log('updateWindow');
		//update();
	});
	
	socket.on('update', function () {
		removeManipulator();
		update();
		updateScreen(displayScale);
	});
	
	window.onload = init;

}(window.metabinary, window.vscreen));
