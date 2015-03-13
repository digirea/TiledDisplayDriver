/*jslint devel:true */
/*global io, socket, FileReader, Uint8Array, Blob, URL, event */

(function (metabinary, vscreen, vsutil, manipulator) {
	"use strict";
	
	var socket = io.connect(),
		currentContent = null,
		draggingID = 0,
		lastDraggingID = null,
		dragOffsetTop = 0,
		dragOffsetLeft = 0,
		metaDataDict = {},
		windowType = "window",
		onContentArea = false,
		wholeWindowID = "onlist:whole_window",
		wholeSubWindowID = "whole_sub_window",
		initialWholeWidth = 1000,
		initialWholeHeight = 900,
		initialDisplayScale = 0.5,
		snapSetting = "free";
	
	socket.on('connect', function () {
		console.log("connect");
		socket.emit('reqRegisterEvent', "v1");
	});
	
	function draggingOffsetFunc(top, left) {
		dragOffsetTop = top;
		dragOffsetLeft = left;
	}
	
	function isVisible(metaData) {
		return (metaData.hasOwnProperty('visible') && metaData.visible === "true");
	}
	
	function isFreeMode() {
		return snapSetting === 'free';
	}
	
	function isUnvisibleID(id) {
		return (id.indexOf("onlist:") >= 0);
	}
	
	function isContentArea(px, py) {
		var contentArea = document.getElementById('left_main_area');
		return (px < (contentArea.scrollWidth) && py > 100 && py < (100 + contentArea.offsetTop + contentArea.scrollHeight));
	}
	
	function changeLeftTab(type) {
		var displayTabTitle = document.getElementById('display_tab_title'),
			contentTabTitle = document.getElementById('content_tab_title');
		if (type === windowType) {
			displayTabTitle.onclick();
		} else {
			contentTabTitle.onclick();
		}
	}
	
	function getElem(id) {
		var elem,
			uid,
			previewArea = document.getElementById('preview_area'),
			child;
		
		if (id === wholeWindowID) { return null; }
		if (isUnvisibleID(id)) {
			uid = id.split('onlist:').join('');
			if (document.getElementById(uid)) {
				return document.getElementById(uid);
			} else {
				elem = document.getElementById(id).cloneNode();
				elem.id = uid;
				child = document.getElementById(id).childNodes[0].cloneNode();
				child.innerHTML = document.getElementById(id).childNodes[0].innerHTML;
				elem.appendChild(child);
				previewArea.appendChild(elem);
				setupContent(elem, uid);
				elem.style.marginTop = "0px";
				return elem;
			}
		}
		return document.getElementById(id);
	}
	
	function toIntMetaData(metaData) {
		metaData.posx = parseInt(metaData.posx, 10);
		metaData.posy = parseInt(metaData.posy, 10);
		metaData.width = parseInt(metaData.width, 10);
		metaData.height = parseInt(metaData.height, 10);
		return metaData;
	}
	
	/// get image from server
	function update() {
		vscreen.clearScreenAll();
		socket.emit('reqGetContent', JSON.stringify({type: "all", id: ""}));
		socket.emit('reqGetWindow', JSON.stringify({type: "all", id: ""}));
	}
	
	/// delete content
	function deleteContent() {
		var contentID = document.getElementById('content_id');
		socket.emit('reqDeleteContent', JSON.stringify({id : contentID.innerHTML}));
	}
	
	function deleteDisplay() {
		var displayID = document.getElementById('content_id');
		console.log('reqDeleteWindow' + displayID.innerHTML);
		socket.emit('reqDeleteWindow', JSON.stringify({id : displayID.innerHTML}));
	}
	
	function addContent(binary) {
		socket.emit('reqAddContent', binary);
	}
	
	function updateTransform(metaData) {
		//console.log(JSON.stringify(metaData));
		if (metaData.type === windowType) {
			// window
			socket.emit('reqUpdateWindow', JSON.stringify(metaData));
		} else {
			//console.log("reqUpdateTransform");
			socket.emit('reqUpdateTransform', JSON.stringify(metaData));
		}
	}
	
	function updateContent(binary) {
		socket.emit('reqUpdateContent', binary);
	}
	
	function addInputProperty(id, leftLabel, rightLabel, value) {
		/*
			<div class="input-group">
				<span class="input-group-addon">x</span>
				<input type="text" class="form-control" id="content_transform_x" value="0">
				<span class="input-group-addon">px</span>
			</div>
		*/
		var transInput = document.getElementById('transform_input'),
			group = document.createElement('div'),
			leftSpan = document.createElement('span'),
			rightSpan = document.createElement('span'),
			input = document.createElement('input');
		
		group.className = "input-group";
		leftSpan.className = "input-group-addon";
		leftSpan.innerHTML = leftLabel;
		rightSpan.className = "input-group-addon";
		rightSpan.innerHTML = rightLabel;
		input.className = "form-control";
		input.id = id;
		input.value = value;
		input.nodeType = "text";
		
		group.appendChild(leftSpan);
		group.appendChild(input);
		if (rightLabel) {
			group.appendChild(rightSpan);
		}
		transInput.appendChild(group);
	}
	
	function assignSplitWholes(splitWholes) {
		var screenElem,
			i,
			w,
			previewArea = document.getElementById('preview_area');
			
		console.log(splitWholes);
		for (i in splitWholes) {
			if (splitWholes.hasOwnProperty(i)) {
				w = splitWholes[i];
				console.log(w.id);
				screenElem = document.createElement('div');
				screenElem.style.position = "absolute";
				screenElem.className = "screen";
				screenElem.id = w.id;
				screenElem.style.border = 'solid';
				screenElem.style.borderWidth = '1px';
				screenElem.style.borderColor = "gray";
				screenElem.style.zIndex = -99;
				vsutil.assignScreenRect(screenElem, vscreen.transformScreen(w));
				previewArea.appendChild(screenElem);
				setupWindow(screenElem, w.id);
			}
		}
	}
	
	function changeWholeSplit(x, y) {
		var ix = parseInt(x, 10),
			iy = parseInt(y, 10),
			splitWholes,
			elem,
			i,
			previewArea = document.getElementById('preview_area');
		
		if (isNaN(ix) || isNaN(iy)) {
			return;
		}
		
		for (i = previewArea.childNodes.length - 1; i >= 0; i = i - 1) {
			elem = previewArea.childNodes[i];
			if (elem.hasOwnProperty('id')) {
				if (elem.id.indexOf(wholeSubWindowID) >= 0) {
					previewArea.removeChild(elem);
				}
			}
		}
		vscreen.clearSplitWholes();
		vscreen.splitWhole(ix, iy);
		assignSplitWholes(vscreen.getSplitWholes());
	}
	
	function initPropertyArea(id, type) {
		var contentX,
			contentY,
			contentW,
			contentH,
			contentZ,
			wholeW,
			wholeH,
			wholeScale,
			wholeSplitX,
			wholeSplitY,
			transInput = document.getElementById('transform_input'),
			idlabel = document.getElementById('content_id_label'),
			idtext = document.getElementById('content_id'),
			donwloadButton = document.getElementById('download_button'),
			rectChangeFunc = function () {
				changeRect(this.id, parseInt(this.value, 10));
			};
		console.log("initPropertyArea");
		if (id) {
			document.getElementById('content_id').innerHTML = id;
		}
		transInput.innerHTML = "";
		if (type === "content") {
			idlabel.innerHTML = "Content ID:";
			addInputProperty('content_transform_x', 'x', 'px', '0');
			addInputProperty('content_transform_y', 'y', 'px', '0');
			addInputProperty('content_transform_w', 'w', 'px', '0');
			addInputProperty('content_transform_h', 'h', 'px', '0');
			addInputProperty('content_transform_z', 'z', 'index', '0');
			contentX = document.getElementById('content_transform_x');
			contentY = document.getElementById('content_transform_y');
			contentW = document.getElementById('content_transform_w');
			contentH = document.getElementById('content_transform_h');
			contentZ = document.getElementById('content_transform_z');
			contentX.onchange = rectChangeFunc;
			contentY.onchange = rectChangeFunc;
			contentW.onchange = rectChangeFunc;
			contentH.onchange = rectChangeFunc;
			contentZ.onchange = function () {
				var val = parseInt(contentZ.value, 10);
				changeZIndex(val);
			};
			donwloadButton.style.display = "block";
		}
		if (type === "display") {
			idlabel.innerHTML = "Display ID:";
			addInputProperty('content_transform_x', 'x', 'px', '0');
			addInputProperty('content_transform_y', 'y', 'px', '0');
			addInputProperty('content_transform_w', 'w', 'px', '0');
			addInputProperty('content_transform_h', 'h', 'px', '0');
			contentX = document.getElementById('content_transform_x');
			contentY = document.getElementById('content_transform_y');
			contentW = document.getElementById('content_transform_w');
			contentH = document.getElementById('content_transform_h');
			contentX.onchange = rectChangeFunc;
			contentY.onchange = rectChangeFunc;
			contentW.onchange = rectChangeFunc;
			contentH.onchange = rectChangeFunc;
			donwloadButton.style.display = "none";
		}
		if (type === "whole_window") {
			idlabel.innerHTML = "Virtual Display Setting";
			idtext.innerHTML = "";
			addInputProperty('whole_width', 'w', 'px', '1000');
			addInputProperty('whole_height', 'h', 'px', '900');
			addInputProperty('whole_scale', 'scale', '', '0');
			addInputProperty('whole_split_x', 'split x', '', '1');
			addInputProperty('whole_split_y', 'split y', '', '1');
			wholeW = document.getElementById('whole_width');
			wholeH = document.getElementById('whole_height');
			wholeScale = document.getElementById('whole_scale');
			wholeSplitX = document.getElementById('whole_split_x');
			wholeSplitY = document.getElementById('whole_split_y');
			wholeW.onchange = function () {
				updateScreen();
			};
			wholeH.onchange = function () {
				updateScreen();
			};
			wholeSplitX.onchange = function () {
				changeWholeSplit(this.value, wholeSplitY.value);
			};
			wholeSplitY.onchange = function () {
				changeWholeSplit(wholeSplitX.value, this.value);
			};
			wholeScale.onchange = function () {
				var displayScale = parseFloat(this.value);
				if (displayScale < 0) {
					displayScale = 0.01;
				} else if (displayScale > 1.0) {
					displayScale = 1.0;
				}
				vscreen.setWholeScale(displayScale);
				updateScreen();
			};
			donwloadButton.style.display = "none";
		}
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
	
	function assignWholeWindowProperty() {
		var whole = vscreen.getWhole(),
			scale = vscreen.getWholeScale(),
			wholeW = document.getElementById('whole_width'),
			wholeH = document.getElementById('whole_height'),
			wholeScale = document.getElementById('whole_scale');
		
		wholeW.value = parseInt(whole.orgW, 10);
		wholeH.value = parseInt(whole.orgH, 10);
		wholeScale.value = scale;
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
			draggingManip = manipulator.getDraggingManip(),
			invAspect;
		
		if (draggingManip && lastDraggingID) {
			elem = document.getElementById(lastDraggingID);
			metaData = metaDataDict[lastDraggingID];
			if (metaData.type !== windowType && !isVisible(metaData)) {
				return;
			}
			vsutil.trans(metaData);
			lastx = metaData.posx;
			lasty = metaData.posy;
			lastw = metaData.width;
			lasth = metaData.height;
			invAspect = metaData.orgHeight / metaData.orgWidth;
			
			if (draggingManip.id === '_manip_0' || draggingManip.id === '_manip_1') {
				px = evt.clientX - dragOffsetLeft;
				py = evt.clientY - dragOffsetTop;
				currentw = lastw - (px - lastx);
			} else {
				px = evt.clientX - lastw - dragOffsetLeft;
				py = evt.clientY - dragOffsetTop;
				currentw = lastw + (px - lastx);
			}
			if (isNaN(invAspect)) {
				invAspect = lasth / lastw;
				console.log("aspect NaN" + invAspect);
			}
			
			if (currentw < 20) { return; }
			currenth = currentw * invAspect;
			ydiff = currentw * invAspect - lasth;
			
			metaData.width = currentw;
			metaData.height = currentw * invAspect;
			if (draggingManip.id === '_manip_0') {
				metaData.posx = px;
				metaData.posy = (lasty - ydiff);
			} else if (draggingManip.id === '_manip_1') {
				metaData.posx = px;
			} else if (draggingManip.id === '_manip_3') {
				metaData.posy = (lasty - ydiff);
			}
			vsutil.transInv(metaData);
			vsutil.assignMetaData(elem, metaData, true);
			console.log("lastDraggingID:" + lastDraggingID);
			metaDataDict[lastDraggingID] = metaData;
			updateTransform(metaData);
		}
	}
	
	function enableDeleteButton(isEnable) {
		if (isEnable) {
			document.getElementById('content_delete_button').className = "btn btn-success";
		} else {
			document.getElementById('content_delete_button').className = "btn btn-success disabled";
		}
	}
	
	function enableDisplayDeleteButton(isEnable) {
		if (isEnable) {
			document.getElementById('display_delete_button').className = "btn btn-primary";
		} else {
			document.getElementById('display_delete_button').className = "btn btn-primary disabled";
		}
	}
	
	function enableUpdateImageButton(isEnable) {
		if (isEnable) {
			document.getElementById('update_image_input').disabled = false;
		} else {
			document.getElementById('update_image_input').disabled = true;
		}
	}
	
	/// select content or window
	function select(id) {
		var elem,
			metaData;
		
		if (id === wholeWindowID) {
			initPropertyArea(id, "whole_window");
			assignWholeWindowProperty();
			document.getElementById(wholeWindowID).style.borderColor = "orange";
			changeLeftTab(windowType);
			return;
		}
		if (id.indexOf(wholeSubWindowID) >= 0) {
			return;
		}
		document.getElementById(wholeWindowID).style.borderColor = "white";
		elem = getElem(id);
		if (elem.id !== id) {
			id = elem.id;
		}
		if (document.getElementById("onlist:" + id)) {
			document.getElementById("onlist:" + id).style.borderColor = "orange";
		}
		metaData = metaDataDict[id];
		draggingID = id;
		console.log("draggingID = id:" + draggingID);
		elem.style.border = "solid 2px black";
		if (metaData.type === windowType) {
			initPropertyArea(id, "display");
			assignContentProperty(metaDataDict[id]);
			enableDeleteButton(false);
			enableDisplayDeleteButton(true);
			enableUpdateImageButton(false);
			changeLeftTab(windowType);
		} else {
			initPropertyArea(id, "content");
			assignContentProperty(metaDataDict[id]);
			enableDeleteButton(true);
			enableUpdateImageButton(true);
			enableDisplayDeleteButton(false);
			document.getElementById('update_content_id').innerHTML = id;
			changeLeftTab(metaData.type);
		}
		if (elem.style.zIndex === "") {
			elem.style.zIndex = 0;
		}
		//document.getElementById('content_transform_z').value = elem.style.zIndex;
		//console.log("showManipulator" , elem);
		manipulator.showManipulator(elem);
		manipulator.moveManipulator(elem);
	}
	
	/// unselect content or window
	function unselect() {
		var elem,
			metaData;
		
		if (lastDraggingID) {
			elem = document.getElementById(lastDraggingID);
			metaData = metaDataDict[lastDraggingID];
			if (metaData.type !== windowType && isVisible(metaData)) {
				elem.style.border = "";
			}
			if (document.getElementById("onlist:" + lastDraggingID)) {
				document.getElementById("onlist:" + lastDraggingID).style.borderColor = "white";
			}
			lastDraggingID = null;
		}
		manipulator.removeManipulator();
	}
	
	function getSelectedElem() {
		var targetID = document.getElementById('content_id').innerHTML;
		if (targetID) {
			return document.getElementById(targetID);
		}
		return null;
	}
	
	/// change zIndex
	function changeZIndex(index) {
		var elem = getSelectedElem();
		if (elem) {
			elem.style.zIndex = index;
			console.log("change zindex:" + index);
		}
	}
	
	/// change rect
	function changeRect(id, value) {
		var elem = getSelectedElem(),
			metaData,
			aspect = 1.0;
		if (elem) {
			metaData = metaDataDict[elem.id];
			if (metaData) {
				aspect = elem.naturalHeight / elem.naturalWidth;
				if (id === 'content_transform_x') {
					metaData.posx = value;
					updateTransform(metaData);
				} else if (id === 'content_transform_y') {
					metaData.posy = value;
					updateTransform(metaData);
				} else if (id === 'content_transform_w' && value > 10) {
					metaData.width = value;
					metaData.height = value * aspect;
					document.getElementById('content_transform_h').value = metaData.height;
					updateTransform(metaData);
				} else if (id === 'content_transform_h' && value > 10) {
					metaData.width = value / aspect;
					metaData.height = value;
					document.getElementById('content_transform_w').value = metaData.width;
					updateTransform(metaData);
				}
			}
		}
	}
	
	/// setup content
	function setupContent(elem, id) {
		elem.onmousedown = function (evt) {
			var previewArea = document.getElementById('preview_area'),
				rect = event.target.getBoundingClientRect();
			// erase last border
			unselect();
			select(id);
			evt = (evt) || window.event;
			dragOffsetTop = evt.clientY - rect.top;
			dragOffsetLeft = evt.clientX - rect.left;
			//dragOffsetTop = evt.clientY - elem.offsetTop;
			//dragOffsetLeft = evt.clientX - elem.offsetLeft;
			evt.stopPropagation();
			evt.preventDefault();
		};
	}
	
	///  setup window
	function setupWindow(elem, id) {
		setupContent(elem, id);
	}
	
	function snapToSplitWhole(elem, metaData, splitWhole) {
		console.log(metaData);
		var aspect = metaData.width / metaData.height;
		metaData.posx = splitWhole.x;
		metaData.posy = splitWhole.y;
		if (metaData.width > metaData.height) {
			metaData.width = splitWhole.w;
			metaData.height = splitWhole.w / aspect;
			console.log("a", metaData, aspect);
		} else {
			metaData.height = splitWhole.h;
			metaData.width = splitWhole.h * aspect;
			console.log("b", metaData, aspect);
		}
		manipulator.moveManipulator(elem);
	}
	
	function clearSplitHightlight() {
		var splitWholes,
			i;
		splitWholes = vscreen.getSplitWholes();
		for (i in splitWholes) {
			if (splitWholes.hasOwnProperty(i)) {
				document.getElementById(splitWholes[i].id).style.background = "transparent";
			}
		}
	}
	
	// add content mousedown event
	window.document.addEventListener("mousedown", function (evt) {
		var elem,
			metaData;
		// erase last border
		if (lastDraggingID && !manipulator.getDraggingManip()) {
			unselect();
		}
	});
	
	// add content mousemove event
	window.document.addEventListener("mousemove", function (evt) {
		var i,
			metaData,
			metaTemp,
			elem,
			pos,
			px,
			py,
			elemOnPos,
			onInvisibleContent,
			leftArea = document.getElementById('leftArea'),
			rect = event.target.getBoundingClientRect(),
			orgPos,
			splitWhole;
		
		evt = (evt) || window.event;
		
		if (draggingID) {
			// detect content list area
			px = evt.clientX + (document.body.scrollLeft || document.documentElement.scrollLeft);
			py = evt.clientY + (document.body.scrollTop || document.documentElement.scrollTop);
			if (isContentArea(px, py)) { return; }

			// clear splitwhole colors
			clearSplitHightlight();
			
			// detect spilt screen area
			if (!isFreeMode()) {
				orgPos = vscreen.transformOrgInv(vscreen.makeRect(px, py, 0, 0));
				splitWhole = vscreen.getSplitWholeByPos(orgPos.x, orgPos.y);
				if (splitWhole) {
					document.getElementById(splitWhole.id).style.background = "red";
				}
			}

			// translate
			elem = document.getElementById(draggingID);
			metaData = metaDataDict[draggingID];
			
			metaData.posx = evt.clientX - dragOffsetLeft;
			metaData.posy = evt.clientY - dragOffsetTop;
			vsutil.transPosInv(metaData);
			vsutil.assignMetaData(elem, metaData, true);
			
			if (metaData.type === windowType || isVisible(metaData)) {
				manipulator.moveManipulator(elem);
				updateTransform(metaData);
			}
			evt.stopPropagation();
			evt.preventDefault();
		} else if (lastDraggingID && manipulator.getDraggingManip()) {
			// scaling
			elem = document.getElementById(lastDraggingID);
			metaData = metaDataDict[lastDraggingID];
			if (metaData.type === windowType || isVisible(metaData)) {
				onManipulatorMove(evt);
				manipulator.moveManipulator(elem);
			}
			evt.stopPropagation();
			evt.preventDefault();
		}
	});
	
	// add content mouseup event
	window.document.addEventListener("mouseup", function (evt) {
		var previewArea = document.getElementById('preview_area'),
			contentArea = document.getElementById('content_area'),
			metaData,
			elem,
			px,
			py,
			orgPos,
			splitWhole;
		if (draggingID) {
			elem = document.getElementById(draggingID);
			metaData = metaDataDict[draggingID];
			px = evt.clientX + (document.body.scrollLeft || document.documentElement.scrollLeft);
			py = evt.clientY + (document.body.scrollTop || document.documentElement.scrollTop);
			if (!isContentArea(px, py)) {
				console.log("not onContentArea");
				metaData.visible = true;
				elem.style.color = "black";
				if (isFreeMode()) {
					vsutil.assignMetaData(elem, metaData, true);
					updateTransform(metaData);
				} else {
					orgPos = vscreen.transformOrgInv(vscreen.makeRect(px, py, 0, 0));
					splitWhole = vscreen.getSplitWholeByPos(orgPos.x, orgPos.y);
					console.log(splitWhole);
					if (splitWhole) {
						snapToSplitWhole(elem, metaData, splitWhole);
					}
					vsutil.assignMetaData(elem, metaData, true);
					updateTransform(metaData);
				}
			}
			clearSplitHightlight();
		}
		if (manipulator.getDraggingManip() && lastDraggingID) {
			metaData = metaDataDict[lastDraggingID];
			//updateTransform(metaData);
		} else {
			lastDraggingID = draggingID;
			draggingID = null;
		}
		manipulator.clearDraggingManip();
		dragOffsetTop = 0;
		dragOffsetLeft = 0;
	});
	
	/// send text to server
	function sendText(text) {
		var previewArea = document.getElementById('preview_area'),
			textInput = document.getElementById('text_input'),
			elem = document.createElement('pre'),
			width = (textInput.clientWidth + 1),
			height = (textInput.clientHeight + 1),
			textData = "",
			binary = null;
		
		if (text) {
			textData = text;
		} else {
			textData = textInput.value;
		}
		elem.style.position = "absolute";
		elem.style.top = "0px";
		elem.style.left = "0px";
		elem.innerHTML = textData;
		previewArea.appendChild(elem);
		
		// calculate width, height
		width = elem.offsetWidth / vscreen.getWholeScale();
		height = elem.offsetHeight / vscreen.getWholeScale();
		if (width > vscreen.getWhole().orgW) {
			width = vscreen.getWhole().orgW;
			elem.style.overflow = "auto";
		}
		if (height > vscreen.getWhole().orgH) {
			height = vscreen.getWhole().orgH;
			elem.style.overflow = "auto";
		}
		//console.log("sendtext- width, height", width, height);
		
		binary = metabinary.createMetaBinary({type : "text", posx : 0, posy : 0, width : width, height : height}, textData);

		currentContent = elem;
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
	
	/// open text file
	function openText(evt) {
		var files = evt.target.files,
			file,
			i,
			fileReader = new FileReader();
		
		console.log("openText");
		fileReader.onloadend = function (e) {
			var data = e.target.result;
			//console.log(data);
			sendText(data);
		};
		for (i = 0, file = files[i]; file; i = i + 1, file = files[i]) {
			if (file.type.match('text.*')) {
				fileReader.readAsText(file);
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
	function addScreenRect(windowData) {
		var whole = vscreen.getWhole(),
			screens = vscreen.getScreenAll(),
			split_wholes = vscreen.getSplitWholes(),
			s,
			wholeElem = document.createElement('span'),
			previewArea = document.getElementById('preview_area'),
			screenElem;
		
		if (windowData) {
			screenElem = document.getElementById(windowData.id);
			vsutil.assignScreenRect(screenElem, vscreen.transformScreen(screens[windowData.id]));
		} else {
			console.log("screens:" + JSON.stringify(vscreen));

			wholeElem.style.border = 'solid';
			wholeElem.style.zIndex = -100;
			wholeElem.className = "screen";
			wholeElem.style.color = "black";
			vsutil.assignScreenRect(wholeElem, whole);
			previewArea.appendChild(wholeElem);

			console.log("wholeElemwholeElem");

			for (s in screens) {
				if (screens.hasOwnProperty(s)) {
					screenElem = document.createElement('div');
					screenElem.className = "screen";
					screenElem.id = s;
					console.log("screenElemID:" + JSON.stringify(screens[s]));
					screenElem.style.border = 'solid';
					vsutil.assignScreenRect(screenElem, vscreen.transformScreen(screens[s]));
					previewArea.appendChild(screenElem);
					setupWindow(screenElem, s);
				}
			}
			
			assignSplitWholes(vscreen.getSplitWholes());
		}
	}
	
	/// update all screens
	function updateScreen(windowData) {
		var whole = vscreen.getWhole(),
			wholeWidth = document.getElementById('whole_width'),
			wholeHeight = document.getElementById('whole_height'),
			w,
			h,
			cx = document.body.scrollWidth / 2,
			cy = document.body.scrollHeight / 2,
			previewArea = document.getElementById('preview_area'),
			screens = previewArea.getElementsByClassName('screen'),
			scale = vscreen.getWholeScale(),
			ww = w,
			i,
			metaData,
			elem;
		
		if (w !== ww) {
			return "NaN";
		}
		
		if (windowData) {
			elem = document.getElementById(windowData.id);
			if (elem) {
				console.log("assignScreenRect");
				vsutil.assignMetaData(elem, windowData, true);
			}
		} else {
			// recreate all screens
			if (!wholeWidth || !whole.hasOwnProperty('w')) {
				w = initialWholeWidth;
			} else {
				w = parseInt(wholeWidth.value, 10);
			}
			if (!wholeHeight || !whole.hasOwnProperty('h')) {
				h = initialWholeHeight;
			} else {
				h = parseInt(wholeHeight.value, 10);
			}
			vscreen.assignWhole(w, h, cx, cy, scale);
			for (i = screens.length - 1; i >= 0; i = i - 1) {
				previewArea.removeChild(screens.item(i));
			}
			for (i in metaDataDict) {
				if (metaDataDict.hasOwnProperty(i)) {
					metaData = metaDataDict[i];
					if (isVisible(metaData)) {
						if (metaData.type !== windowType) {
							elem = document.getElementById(metaData.id);
							if (elem) {
								vsutil.assignMetaData(elem, metaData, true);
							}
						}
					}
				}
			}
		}
		addScreenRect(windowData);
		//changeWholeSplit(wholeSplitX.value, this.value);
	}
	
	function importContentToView(metaData, contentData) {
		var previewArea = document.getElementById('preview_area'),
			elem,
			tagName,
			blob,
			mime = "image/jpeg";

		if (isVisible(metaData)) {
			metaDataDict[metaData.id] = metaData;
			console.log("doneGetContent:" + JSON.stringify(metaData));

			if (metaData.type === 'text') {
				tagName = 'pre';
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
				vsutil.assignMetaData(elem, metaData, true);
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
						vsutil.assignMetaData(elem, metaData, true);
					};
				}
			}
		}
	}
	
	function importContentToList(metaData, contentData) {
		var hasVisible = metaData.hasOwnProperty('visible'),
			contentArea = document.getElementById('content_area'),
			contentElem,
			divElem,
			tagName,
			blob,
			mime = "image/jpeg",
			onlistID = "onlist:" + metaData.id;
		
		metaDataDict[metaData.id] = metaData;
		if (metaData.type === 'text') {
			tagName = 'pre';
		} else {
			tagName = 'img';
		}
		if (document.getElementById(onlistID)) {
			divElem = document.getElementById(onlistID);
			contentElem = divElem.childNodes[0];
			//console.log("found " + json.type);
		} else {
			contentElem = document.createElement(tagName);
			
			divElem = document.createElement('div');
			divElem.id = onlistID;
			setupContent(divElem, onlistID);
			divElem.appendChild(contentElem);
			contentArea.appendChild(divElem);
		}
		//console.log("id=" + metaData.id);
		if (metaData.type === 'text') {
			// contentData is text
			contentElem.innerHTML = contentData;
			divElem.style.width = "200px";
			divElem.style.height = "50px";
		} else {
			// contentData is blob
			if (metaData.hasOwnProperty('mime')) {
				mime = metaData.mime;
				//console.log("mime:" + mime);
			}
			divElem.style.width = "200px";
			blob = new Blob([contentData], {type: mime});
			if (contentElem && blob) {
				contentElem.src = URL.createObjectURL(blob);

				contentElem.onload = function () {
					if (contentElem.offsetHeight > 200) {
						divElem.style.width = "";
						divElem.style.height = "100px";
					}
				};
			}
		}
		contentElem.style.width = "100%";
		contentElem.style.height = "100%";
		divElem.style.position = "relative";
		divElem.style.top = "5px";
		divElem.style.left = "20px";
		divElem.style.border = "solid";
		divElem.style.borderColor = "white";
		divElem.style.marginTop = "5px";
		divElem.style.color = "white";
	}
	
	/// import content
	function importContent(metaData, contentData) {
		importContentToList(metaData, contentData);
		importContentToView(metaData, contentData);
	}
	
	function importWindowToView(windowData) {
		if (windowData.type !== windowType) {
			return;
		}
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
		vscreen.assignScreen(windowData.id, windowData.orgX, windowData.orgY, windowData.orgWidth, windowData.orgHeight);
		vscreen.setScreenSize(windowData.id, windowData.width, windowData.height);
		vscreen.setScreenPos(windowData.id, windowData.posx, windowData.posy);
		//console.log("import windowsc:", vscreen.getScreen(windowData.id));
		updateScreen();
	}
	
	function importWindowToList(windowData) {
		var displayArea = document.getElementById('display_area'),
			divElem = document.createElement("div"),
			onlistID = "onlist:" + windowData.id;
		
		divElem.innerHTML = "ID:" + windowData.id;
		divElem.id = onlistID;
		divElem.style.position = "relative";
		divElem.style.top = "5px";
		divElem.style.left = "20px";
		divElem.style.width = "200px";
		divElem.style.height = "50px";
		divElem.style.border = "solid";
		divElem.style.borderColor = "white";
		divElem.style.marginTop = "5px";
		divElem.style.color = "white";
		setupContent(divElem, onlistID);
		displayArea.appendChild(divElem);
	}
	
	function addWholeWindowToList() {
		var displayArea = document.getElementById('display_area'),
			divElem = document.createElement("div"),
			onlistID = "onlist:" + "whole_window";
		
		divElem.innerHTML = "Virtual Display";
		divElem.id = onlistID;
		divElem.style.position = "relative";
		divElem.style.top = "5px";
		divElem.style.left = "20px";
		divElem.style.width = "200px";
		divElem.style.height = "50px";
		divElem.style.border = "solid";
		divElem.style.borderColor = "white";
		divElem.style.marginTop = "5px";
		divElem.style.color = "white";
		setupContent(divElem, onlistID);
		displayArea.appendChild(divElem);
	}
	
	function clearWindowList() {
		var displayArea = document.getElementById('display_area');
		displayArea.innerHTML = "";
	}
	
	/// import window
	function importWindow(windowData) {
		importWindowToView(windowData);
		importWindowToList(windowData);
	}
	
	function initAddContentArea() {
		var textSendButton = document.getElementById('text_send_button'),
			urlSendButton = document.getElementById('url_send_button'),
			imageFileInput = document.getElementById('image_file_input'),
			textFileInput = document.getElementById('text_file_input'),
			deleteAllWindow = document.getElementById('delete_all_window'), // for debug
			updateImageInput = document.getElementById('update_image_input');
		
		urlSendButton.onclick = sendURL;
		updateImageInput.addEventListener('change', function (evt) {
			replaceImage(evt);
			updateImageInput.value = "";
		}, false);
		imageFileInput.addEventListener('change', function (evt) {
			openImage(evt);
			imageFileInput.value = "";
		}, false);
		textFileInput.addEventListener('change', function (evt) {
			openText(evt);
			textFileInput.value = "";
		}, false);
		textSendButton.onclick = function (evt) {
			sendText(null);
		};
		
		// for debug
		deleteAllWindow.onclick = function () {
			socket.emit('debugDeleteWindowAll');
		};
	}
	
	function initWholeSettingArea() {
		var dropDownCurrent = document.getElementById('dropdown_current'),
			dropDownItem1 = document.getElementById('dropdown_item1'),
			displaySettingItem = document.getElementById('virtual_display_setting');
			
		dropDownItem1.onclick = function () {
			var selected;
			// swap curent
			selected = dropDownItem1.innerHTML;
			dropDownItem1.innerHTML = dropDownCurrent.innerHTML;
			dropDownCurrent.innerHTML = selected;
			if (selected === "Free") {
				console.log("free mode");
				snapSetting = 'free';
			} else if (selected === "Display") {
				console.log("display mode");
				snapSetting = 'display';
			}
		};
		displaySettingItem.onclick = function () {
			select(wholeWindowID);
		};
	}
	
	function initContentArea(bottomfunc) {
		var addButton = document.getElementById('content_add_button'),
			contentDeleteButton = document.getElementById('content_delete_button');
		
		addButton.onclick = function () {
			bottomfunc(true);
		};
		contentDeleteButton.onclick = deleteContent;
	}
	
	function initDisplayArea() {
		var displayDeleteButton = document.getElementById('display_delete_button');
		displayDeleteButton.onclick = deleteDisplay;
	}
	
	
	function initLeftArea(bottomfunc) {
		var displayArea = document.getElementById('display_area'),
			displayTabTitle = document.getElementById('display_tab_title'),
			displayTabLink = document.getElementById('display_tab_link'),
			displayButtonArea = document.getElementById('display_button_area'),
			contentArea = document.getElementById('content_area'),
			contentButtonArea = document.getElementById('content_button_area'),
			contentTabTitle = document.getElementById('content_tab_title'),
			contentTabLink = document.getElementById('content_tab_link');
			
		displayTabTitle.onclick = function () {
			displayArea.style.display = "block";
			contentArea.style.display = "none";
			contentButtonArea.style.display = "none";
			displayButtonArea.style.display = "block";
			displayTabTitle.className = "display_tab_title active";
			contentTabTitle.className = "content_tab_title";
			displayTabLink.className = "active";
			contentTabLink.className = "";
		};
		contentTabTitle.onclick = function () {
			displayArea.style.display = "none";
			contentArea.style.display = "block";
			contentButtonArea.style.display = "block";
			displayButtonArea.style.display = "none";
			displayTabTitle.className = "display_tab_title";
			contentTabTitle.className = "content_tab_title active";
			contentTabLink.className = "active";
			displayTabLink.className = "";
		};
		initContentArea(bottomfunc);
		initDisplayArea();
	}
	
	/// initialize elemets, events
	function init() {
		var timer = null,
			bottomfunc = window.animtab.create('bottom',
				{'bottomTab' : { min : '0px', max : 'auto' }},
				{ 'bottomArea' : { min : '0px', max : '400px' }}, 'AddContent');
		
		manipulator.setDraggingOffsetFunc(draggingOffsetFunc);
		bottomfunc(false);
		// initial select
		initPropertyArea(wholeWindowID, "whole_window");
		//assignWholeWindowProperty();
		//document.getElementById(wholeWindowID).style.borderColor = "orange";
		
		initLeftArea(bottomfunc);
		initAddContentArea();
		initWholeSettingArea();
		
		// resize event
		window.onresize = function () {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(function () {
				manipulator.removeManipulator();
				updateScreen();
			}, 200);
		};
		
		console.log("clientHeight:" + document.documentElement.clientHeight);
		updateScreen();
		vscreen.dump();
	}
	
	///------------------------------------------------------------------------
	
	/// meta data updated
	socket.on('doneGetMetaData', function (data) {
		var json = JSON.parse(data);
		if (json.type === windowType) { return; }
		metaDataDict[json.id] = json;
		if (isVisible(json)) {
			vsutil.assignMetaData(document.getElementById(json.id), json, true);
			if (draggingID === json.id) {
				assignContentProperty(json);
			}
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
	
	socket.on('doneUpdateWindow', function (reply) {
		console.log("doneUpdateWindow");
		//console.log(reply);
		var windowData = JSON.parse(reply);
		vscreen.assignScreen(windowData.id, windowData.orgX, windowData.orgY, windowData.orgWidth, windowData.orgHeight);
		vscreen.setScreenSize(windowData.id, windowData.width, windowData.height);
		vscreen.setScreenPos(windowData.id, windowData.posx, windowData.posy);
		updateScreen(windowData);
	});
	
	socket.on('doneDeleteContent', function (reply) {
		console.log("doneDeleteContent");
		var json = JSON.parse(reply),
			contentArea = document.getElementById('content_area'),
			previewArea = document.getElementById('preview_area'),
			contentID = document.getElementById('content_id'),
			deleted = document.getElementById(json.id);
		previewArea.removeChild(deleted);
		if (document.getElementById("onlist:" + json.id)) {
			contentArea.removeChild(document.getElementById("onlist:" + json.id));
		}
		contentID.innerHTML = "No Content Selected.";
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
		currentContent = null;
	});
	
	socket.on('doneGetWindow', function (reply) {
		console.log('doneGetWindow:');
		var windowData = JSON.parse(reply);
		importWindow(windowData);
	});
	
	socket.on('updateTransform', function () {
		socket.emit('reqGetMetaData', JSON.stringify({type: "all", id: ""}));
	});
	
	socket.on('updateWindow', function () {
		console.log('updateWindow');
		//clearWindowList();
		//socket.emit('reqGetWindow', JSON.stringify({type: "all", id: ""}));
	});
	
	socket.on('update', function () {
		manipulator.removeManipulator();
		update();
		
		clearWindowList();
		addWholeWindowToList();
		updateScreen();
	});
	
	window.onload = init;

}(window.metabinary, window.vscreen, window.vscreen_util, window.manipulator));
