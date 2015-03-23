/*jslint devel:true */
/*global io, socket, FileReader, Uint8Array, Blob, URL, event, unescape */

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
		wholeWindowID = "whole_window",
		wholeWindowListID = "onlist:whole_window",
		wholeSubWindowID = "whole_sub_window",
		initialWholeWidth = 1000,
		initialWholeHeight = 900,
		initialDisplayScale = 0.5,
		snapSetting = "free",
		contentSelectColor = "#04B431",
		windowSelectColor = "#0080FF";
	
	socket.on('connect', function () {
		console.log("connect");
		socket.emit('reqRegisterEvent', "v1");
	});
	
	/**
	 * Description
	 * @method draggingOffsetFunc
	 * @param {} top
	 * @param {} left
	 */
	function draggingOffsetFunc(top, left) {
		dragOffsetTop = top;
		dragOffsetLeft = left;
	}
	
	/**
	 * Description
	 * @method isVisible
	 * @param {} metaData
	 * @return LogicalExpression
	 */
	function isVisible(metaData) {
		return (metaData.hasOwnProperty('visible') && metaData.visible === "true");
	}
	
	/**
	 * Description
	 * @method isFreeMode
	 * @return BinaryExpression
	 */
	function isFreeMode() {
		return snapSetting === 'free';
	}
	
	/**
	 * Description
	 * @method isUnvisibleID
	 * @param {} id
	 * @return BinaryExpression
	 */
	function isUnvisibleID(id) {
		return (id.indexOf("onlist:") >= 0);
	}
	
	/**
	 * Description
	 * @method isContentArea
	 * @param {} px
	 * @param {} py
	 * @return LogicalExpression
	 */
	function isContentArea(px, py) {
		var contentArea = document.getElementById('left_main_area');
		return (px < (contentArea.scrollWidth) && py > 100 && py < (100 + contentArea.offsetTop + contentArea.scrollHeight));
	}
	
	/**
	 * Description
	 * @method isDisplayTabSelected
	 * @return BinaryExpression
	 */
	function isDisplayTabSelected() {
		return (document.getElementById('display_tab_link').className.indexOf("active") >= 0);
	}
	
	/**
	 * Description
	 * @method getCookie
	 * @param {} key
	 * @return Literal
	 */
	function getCookie(key) {
		var i,
			pos,
			cookies;
		if (document.cookie.length > 0) {
			console.log("all cookie", document.cookie);
			cookies = [document.cookie];
			if (document.cookie.indexOf(';') >= 0) {
				cookies = document.cookie.split(';');
			}
			for (i = 0; i < cookies.length; i = i + 1) {
				pos = cookies[i].indexOf(key + "=");
				if (pos >= 0) {
					return unescape(cookies[i].substring(pos + key.length + 1));
				}
			}
		}
		return "";
	}
	
	/**
	 * Description
	 * @method saveCookie
	 */
	function saveCookie() {
		var displayScale = vscreen.getWholeScale();
		console.log("saveCookie");
		document.cookie = 'display_scale=' + displayScale;
		document.cookie = 'snap_setting=' + snapSetting;
	}
	
	/**
	 * Description
	 * @method changeLeftTab
	 * @param {} type
	 */
	function changeLeftTab(type) {
		var displayTabTitle = document.getElementById('display_tab_title'),
			contentTabTitle = document.getElementById('content_tab_title');
		if (type === windowType) {
			displayTabTitle.onclick();
		} else {
			contentTabTitle.onclick();
		}
	}
	
	/**
	 * Description
	 * @method getElem
	 * @param {} id
	 * @return CallExpression
	 */
	function getElem(id) {
		var elem,
			uid,
			previewArea,
			child;
		
		if (id === wholeWindowListID) { return null; }
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
				
				if (isDisplayTabSelected()) {
					previewArea = document.getElementById('display_preview_area');
				} else {
					previewArea = document.getElementById('content_preview_area');
				}
				
				previewArea.appendChild(elem);
				setupContent(elem, uid);
				elem.style.marginTop = "0px";
				return elem;
			}
		}
		return document.getElementById(id);
	}
	
	/**
	 * Description
	 * @method getSelectedID
	 * @return MemberExpression
	 */
	function getSelectedID() {
		var contentID = document.getElementById('content_id');
		return contentID.innerHTML;
	}
	
	/**
	 * Description
	 * @method toIntMetaData
	 * @param {} metaData
	 * @return metaData
	 */
	function toIntMetaData(metaData) {
		metaData.posx = parseInt(metaData.posx, 10);
		metaData.posy = parseInt(metaData.posy, 10);
		metaData.width = parseInt(metaData.width, 10);
		metaData.height = parseInt(metaData.height, 10);
		return metaData;
	}
	
	/// get image from server
	/**
	 * Description
	 * @method update
	 */
	function update() {
		vscreen.clearScreenAll();
		socket.emit('reqGetVirtualDisplay', JSON.stringify({type: "all", id: ""}));
		socket.emit('reqGetContent', JSON.stringify({type: "all", id: ""}));
		socket.emit('reqGetWindow', JSON.stringify({type: "all", id: ""}));
	}
	
	/// delete content
	/**
	 * Description
	 * @method deleteContent
	 */
	function deleteContent() {
		socket.emit('reqDeleteContent', JSON.stringify({id : getSelectedID()}));
	}
	
	/**
	 * Description
	 * @method deleteDisplay
	 */
	function deleteDisplay() {
		console.log('reqDeleteWindow' + getSelectedID());
		socket.emit('reqDeleteWindow', JSON.stringify({id : getSelectedID()}));
	}
	
	/**
	 * Description
	 * @method deleteDisplayAll
	 */
	function deleteDisplayAll() {
		socket.emit('reqDeleteWindow', JSON.stringify({type : "all", id : ""}));
	}
	
	/**
	 * Description
	 * @method addContent
	 * @param {} binary
	 */
	function addContent(binary) {
		socket.emit('reqAddContent', binary);
	}
	
	/**
	 * Description
	 * @method updateTransform
	 * @param {} metaData
	 */
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
	
	/**
	 * Description
	 * @method updateContent
	 * @param {} binary
	 */
	function updateContent(binary) {
		socket.emit('reqUpdateContent', binary);
	}
	
	/**
	 * Description
	 * @method updateWindowData
	 */
	function updateWindowData() {
		var windowData,
			whole = vscreen.getWhole(),
			split = vscreen.getSplitCount();
			
		windowData = {
			orgWidth : whole.orgW,
			orgHeight : whole.orgH,
			splitX : split.x,
			splitY : split.y,
			scale : vscreen.getWholeScale()
		};
		socket.emit('reqUpdateVirtualDisplay', JSON.stringify(windowData));
	}
	
	/**
	 * Description
	 * @method addInputProperty
	 * @param {} id
	 * @param {} leftLabel
	 * @param {} rightLabel
	 * @param {} value
	 */
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
		//input.nodeType = "text";
		
		group.appendChild(leftSpan);
		group.appendChild(input);
		if (rightLabel) {
			group.appendChild(rightSpan);
		}
		transInput.appendChild(group);
	}
	
	/**
	 * Description
	 * @method addButtonProperty
	 * @param {} id
	 * @param {} value
	 * @param {} func
	 */
	function addButtonProperty(id, value, func) {
		/*
			<div class="btn btn-success" id="content_add_button">Add</div>
		*/
		var transInput = document.getElementById('transform_input'),
			group = document.createElement('div'),
			button = document.createElement('div');
		
		group.className = "input-group";
		button.className = "btn btn-primary property_button";
		button.innerHTML = value;
		button.id = id;
		button.onclick = func;
		group.appendChild(button);
		transInput.appendChild(group);
	}
	
	/**
	 * Description
	 * @method addScaleDropdown
	 * @param {} id
	 * @param {} value
	 */
	function addScaleDropdown(id, value) {
		/*
			<li role="presentation">
				<a role="menuitem" tabindex="-1" href="#" id="scale_dropdown_item1">Display</a>
			</li>
		*/
		var dropDown = document.getElementById('scale_drop_down'),
			current = document.getElementById('scale_dropdown_current'),
			li = document.createElement('li'),
			a = document.createElement('a');
		
		li.role = "presentation";
		a.role = "menuitem";
		a.tabindex = "-1";
		a.href = "#";
		a.id = id;
		a.innerHTML = value;
		/**
		 * Description
		 * @method onclick
		 * @param {} evt
		 */
		a.onclick = function (evt) {
			var displayScale = parseFloat(this.innerHTML);
			if (displayScale < 0) {
				displayScale = 0.01;
			} else if (displayScale > 1.0) {
				displayScale = 1.0;
			}
			vscreen.setWholeScale(displayScale, true);
			saveCookie();
			current.innerHTML = displayScale;
			updateScreen();
		};
		li.appendChild(a);
		dropDown.appendChild(li);
	}
	
	/**
	 * Description
	 * @method assignSplitWholes
	 * @param {} splitWholes
	 */
	function assignSplitWholes(splitWholes) {
		var screenElem,
			i,
			w,
			previewArea = document.getElementById('display_preview_area');
			
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
				screenElem.style.zIndex = -100000;
				vsutil.assignScreenRect(screenElem, vscreen.transformScreen(w));
				previewArea.appendChild(screenElem);
				setupWindow(screenElem, w.id);
			}
		}
	}
	
	/**
	 * Description
	 * @method changeWholeSplit
	 * @param {} x
	 * @param {} y
	 * @param {} withoutUpdate
	 */
	function changeWholeSplit(x, y, withoutUpdate) {
		var ix = parseInt(x, 10),
			iy = parseInt(y, 10),
			splitWholes,
			elem,
			i,
			previewArea = document.getElementById('display_preview_area');
		
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
		if (!withoutUpdate) {
			updateWindowData();
		}
	}
	
	/**
	 * Description
	 * @method initPropertyArea
	 * @param {} id
	 * @param {} type
	 */
	function initPropertyArea(id, type) {
		var contentX,
			contentY,
			contentW,
			contentH,
			contentZ,
			wholeW,
			wholeH,
			wholeSplitX,
			wholeSplitY,
			transInput = document.getElementById('transform_input'),
			idlabel = document.getElementById('content_id_label'),
			idtext = document.getElementById('content_id'),
			downloadButton = document.getElementById('download_button'),
			extension,
			rectChangeFunc = function () {
				changeRect(this.id, parseInt(this.value, 10));
			};
		console.log("initPropertyArea");
		if (id) {
			document.getElementById('content_id').innerHTML = id;
		} else {
			document.getElementById('content_id').innerHTML = "";
		}
		transInput.innerHTML = "";
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
			downloadButton.style.display = "none";
			
		} else if (type === "whole_window") {
			idlabel.innerHTML = "Virtual Display Setting";
			idtext.innerHTML = "";
			addInputProperty('whole_width', 'w', 'px', '1000');
			addInputProperty('whole_height', 'h', 'px', '900');
			addInputProperty('whole_split_x', 'split x', '', '1');
			addInputProperty('whole_split_y', 'split y', '', '1');
			wholeW = document.getElementById('whole_width');
			wholeH = document.getElementById('whole_height');
			wholeSplitX = document.getElementById('whole_split_x');
			wholeSplitY = document.getElementById('whole_split_y');
			wholeW.onchange = function () {
				changeDisplayValue();
			};
			wholeH.onchange = function () {
				changeDisplayValue();
			};
			wholeSplitX.onchange = function () {
				changeWholeSplit(this.value, wholeSplitY.value);
			};
			wholeSplitY.onchange = function () {
				changeWholeSplit(wholeSplitX.value, this.value);
			};
			downloadButton.style.display = "none";
		} else { // content (text, image, url... )
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
			downloadButton.style.display = "block";
			downloadButton.href = "download?" + id;
			downloadButton.target = "_blank";
			if (type === "text") {
				downloadButton.download = id + ".txt";
			} else {
				// image or url
				if (metaDataDict[id].hasOwnProperty('mime')) {
					extension = metaDataDict[id].mime.split('/')[1];
					downloadButton.download = id + "." + extension;
				} else {
					downloadButton.download = id + ".img";
				}
			}
		}
	}
	
	/**
	 * Description
	 * @method assignContentProperty
	 * @param {} metaData
	 */
	function assignContentProperty(metaData) {
		console.log("assignContentProperty:" + JSON.stringify(metaData));
		var transx = document.getElementById('content_transform_x'),
			transy = document.getElementById('content_transform_y'),
			transw = document.getElementById('content_transform_w'),
			transh = document.getElementById('content_transform_h'),
			transz = document.getElementById('content_transform_z');
		
		transx.value = parseInt(metaData.posx, 10);
		transy.value = parseInt(metaData.posy, 10);
		transw.value = parseInt(metaData.width, 10);
		transh.value = parseInt(metaData.height, 10);
		if (metaData.hasOwnProperty('zIndex')) {
			transz.value = parseInt(metaData.zIndex, 10);
		}
	}
	
	function clearProperty() {
		var transx = document.getElementById('content_transform_x'),
			transy = document.getElementById('content_transform_y'),
			transw = document.getElementById('content_transform_w'),
			transh = document.getElementById('content_transform_h'),
			transz = document.getElementById('content_transform_z'),
			content_id = document.getElementById('content_id');
		if (transx) { transx.value = 0; }
		if (transy) { transy.value = 0; }
		if (transw) { transw.value = 0; }
		if (transh) { transh.value = 0; }
		if (transz) { transz.value = 0; }
		if (content_id) { content_id.innerHTML = ""; }
	}
	
	/**
	 * Description
	 * @method assignVirtualDisplayProperty
	 */
	function assignVirtualDisplayProperty() {
		var whole = vscreen.getWhole(),
			splitCount = vscreen.getSplitCount(),
			wholeWidth = document.getElementById('whole_width'),
			wholeHeight = document.getElementById('whole_height'),
			wholeSplitX = document.getElementById('whole_split_x'),
			wholeSplitY = document.getElementById('whole_split_y');

		if (wholeWidth) {
			wholeWidth.value = parseInt(whole.orgW, 10);
		}
		if (wholeHeight) {
			wholeHeight.value = parseInt(whole.orgH, 10);
		}
		if (wholeSplitX) {
			wholeSplitX.value = splitCount.x;
		}
		if (wholeSplitY) {
			wholeSplitY.value = splitCount.y;
		}
	}
	
	/**
	 * Description
	 * @method assignViewSetting
	 */
	function assignViewSetting() {
		var scale = vscreen.getWholeScale(),
			scale_current = document.getElementById('scale_dropdown_current'),
			snap_current = document.getElementById('snap_dropdown_current');
		
		scale_current.innerHTML = scale;
		if (isFreeMode()) {
			snap_current.innerHTML = 'Free';
		} else {
			snap_current.innerHTML = 'Display';
		}
	}
	
	/**
	 * Description
	 * @method onManipulatorMove
	 * @param {} evt
	 */
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
			
			if (currentw < 20) {
				currentw = 20;
			}
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
	
	/**
	 * Description
	 * @method enableDeleteButton
	 * @param {} isEnable
	 */
	function enableDeleteButton(isEnable) {
		if (isEnable) {
			document.getElementById('content_delete_button').className = "btn btn-danger";
		} else {
			document.getElementById('content_delete_button').className = "btn btn-danger disabled";
		}
	}
	
	/**
	 * Description
	 * @method enableDisplayDeleteButton
	 * @param {} isEnable
	 */
	function enableDisplayDeleteButton(isEnable) {
		if (isEnable) {
			document.getElementById('display_delete_button').className = "btn btn-primary";
		} else {
			document.getElementById('display_delete_button').className = "btn btn-primary disabled";
		}
	}
	
	/**
	 * Description
	 * @method enableUpdateImageButton
	 * @param {} isEnable
	 */
	function enableUpdateImageButton(isEnable) {
		if (isEnable) {
			document.getElementById('update_image_input').disabled = false;
		} else {
			document.getElementById('update_image_input').disabled = true;
		}
	}
	
	/// select content or window
	/**
	 * Description
	 * @method select
	 * @param {} id
	 */
	function select(id) {
		var elem,
			metaData;
		
		if (id === wholeWindowListID || id === wholeWindowID) {
			initPropertyArea(id, "whole_window");
			assignVirtualDisplayProperty();
			document.getElementById(wholeWindowListID).style.borderColor = windowSelectColor;
			changeLeftTab(windowType);
			return;
		}
		if (id.indexOf(wholeSubWindowID) >= 0) {
			return;
		}
		document.getElementById(wholeWindowListID).style.borderColor = "white";
		elem = getElem(id);
		if (elem.id !== id) {
			id = elem.id;
		}
		metaData = metaDataDict[id];
		draggingID = id;
		console.log("draggingID = id:" + draggingID);
		elem.style.border = "solid 2px";
		if (metaData.type === windowType) {
			initPropertyArea(id, "display");
			assignContentProperty(metaDataDict[id]);
			enableDeleteButton(false);
			enableDisplayDeleteButton(true);
			enableUpdateImageButton(false);
			changeLeftTab(windowType);
			if (document.getElementById("onlist:" + id)) {
				document.getElementById("onlist:" + id).style.borderColor = windowSelectColor;
			}
			elem.style.borderColor = windowSelectColor;
			manipulator.showManipulator(elem, document.getElementById('display_preview_area'));
		} else {
			initPropertyArea(id, metaData.type);
			assignContentProperty(metaDataDict[id]);
			enableDeleteButton(true);
			enableUpdateImageButton(true);
			enableDisplayDeleteButton(false);
			document.getElementById('update_content_id').innerHTML = id;
			changeLeftTab(metaData.type);
			if (document.getElementById("onlist:" + id)) {
				document.getElementById("onlist:" + id).style.borderColor = contentSelectColor;
			}
			elem.style.borderColor = contentSelectColor;
			manipulator.showManipulator(elem, document.getElementById('content_preview_area'));
		}
		if (elem.style.zIndex === "") {
			elem.style.zIndex = 0;
		}
		manipulator.moveManipulator(elem);
	}
	
	/// unselect content or window
	/**
	 * Description
	 * @method unselect
	 */
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
			elem.style.borderColor = "black";
			lastDraggingID = null;
		}
		manipulator.removeManipulator();
		clearProperty();
	}
	
	/// close selected content or window
	/**
	 * Description
	 * @method closeFunc
	 */
	function closeFunc() {
		var id = getSelectedID(),
			metaData = null,
			elem,
			previewArea;
		
		console.log("closeFunc");
		if (metaDataDict.hasOwnProperty(id)) {
			unselect();
			elem = getElem(id);
			
			metaData = metaDataDict[id];
			metaData.visible = false;
			
			if (metaData.type === "window") {
				previewArea = document.getElementById('display_preview_area');
			} else {
				previewArea = document.getElementById('content_preview_area');
			}
			previewArea.removeChild(elem);
			
			updateTransform(metaData);
		}
	}
	
	/**
	 * Description
	 * @method getSelectedElem
	 * @return Literal
	 */
	function getSelectedElem() {
		var targetID = document.getElementById('content_id').innerHTML;
		if (targetID) {
			return document.getElementById(targetID);
		}
		return null;
	}
	
	/// change zIndex
	/**
	 * Description
	 * @method changeZIndex
	 * @param {} index
	 */
	function changeZIndex(index) {
		var elem = getSelectedElem(),
			metaData;
		if (elem) {
			metaData = metaDataDict[elem.id];
			elem.style.zIndex = index;
			metaData.zIndex = index;
			updateTransform(metaData);
			console.log("change zindex:" + index);
		}
	}
	
	/// change rect
	/**
	 * Description
	 * @method changeRect
	 * @param {} id
	 * @param {} value
	 */
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
	
	function isInsideElement(elem, x, y) {
		var posx = parseInt(elem.style.left.split("px").join(''), 10),
			posy = parseInt(elem.style.top.split("px").join(''), 10),
			width = parseInt(elem.style.width.split("px").join(''), 10),
			height = parseInt(elem.style.height.split("px").join(''), 10);
		
		if (metaDataDict.hasOwnProperty(elem.id)) {
			return (posx <= x && posy <= y &&
					(posx + width) > x &&
					(posy + height) > y);
		}
		return false;
	}

	/**
	 * Description
	 * @method setupContent
	 * @param {} elem
	 * @param {} id
	 */
	function setupContent(elem, id) {
		elem.onmousedown = function (evt) {
			var rect = evt.target.getBoundingClientRect(),
				metaData = null,
				otherPreviewArea = document.getElementById('content_preview_area'),
				childs,
				i,
				topElement = null,
				e;
			
			if (metaDataDict.hasOwnProperty(id)) {
				metaData = metaDataDict[id];
				if (metaData.type !== windowType) {
					otherPreviewArea = document.getElementById('display_preview_area');
				}
			}

			
			if (id === wholeWindowID ||
				(metaData && !isDisplayTabSelected() && metaData.type === windowType) ||
				(metaData && isDisplayTabSelected() && metaData.type !== windowType)) {
				console.log(metaData);
				childs = otherPreviewArea.childNodes;

				for (i = 0; i < childs.length; i = i + 1) {
					if (childs[i].onmousedown) {
						if (!topElement || topElement.zIndex < childs[i].zIndex) {
							if (isInsideElement(childs[i], evt.clientX, evt.clientY)) {
								topElement = childs[i];
							}
						}
					}
				}
				if (topElement) {
					//console.log("left", elem.offsetLeft - topElement.offsetLeft);
					//console.log("top", elem.offsetTop - topElement.offsetTop);
					topElement.onmousedown(evt);
					dragOffsetTop = evt.clientY - topElement.getBoundingClientRect().top;
					dragOffsetLeft = evt.clientX - topElement.getBoundingClientRect().left;
				}
				return;
			}
			
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
	/**
	 * Description
	 * @method setupWindow
	 * @param {} elem
	 * @param {} id
	 */
	function setupWindow(elem, id) {
		setupContent(elem, id);
	}
	
	/**
	 * Description
	 * @method snapToSplitWhole
	 * @param {} elem
	 * @param {} metaData
	 * @param {} splitWhole
	 */
	function snapToSplitWhole(elem, metaData, splitWhole) {
		var orgWidth = parseFloat(metaData.orgWidth),
			orgHeight = parseFloat(metaData.orgHeight),
			vaspect = splitWhole.w / splitWhole.h,
			aspect = orgWidth / orgHeight,
			longValue;
		
		metaData.posx = splitWhole.x;
		metaData.posy = splitWhole.y;
		if (aspect > vaspect) {
			// content is wider than split area
			metaData.width = splitWhole.w;
			metaData.height = splitWhole.w / aspect;
			//console.log("a", metaData, aspect);
		} else {
			// content is highter than split area
			metaData.height = splitWhole.h;
			metaData.width = splitWhole.h * aspect;
			//console.log("b", metaData, aspect);
		}
		manipulator.moveManipulator(elem);
	}
	
	/**
	 * Description
	 * @method clearSplitHightlight
	 */
	function clearSplitHightlight() {
		var splitWholes,
			i;
		splitWholes = vscreen.getSplitWholes();
		//console.log("splitWholes", splitWholes);
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
			rect = evt.target.getBoundingClientRect(),
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
		var contentArea = document.getElementById('content_area'),
			metaData,
			elem,
			px,
			py,
			orgPos,
			splitWhole;
		if (draggingID && metaDataDict.hasOwnProperty(draggingID)) {
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
					//console.log(splitWhole);
					if (splitWhole) {
						snapToSplitWhole(elem, metaData, splitWhole);
					}
					vsutil.assignMetaData(elem, metaData, true);
					updateTransform(metaData);
					manipulator.moveManipulator(elem);
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
	/**
	 * Description
	 * @method sendText
	 * @param {} text
	 */
	function sendText(text) {
		var previewArea = document.getElementById('content_preview_area'),
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
		previewArea.removeChild(elem);
		binary = metabinary.createMetaBinary({type : "text", posx : 0, posy : 0, width : width, height : height}, textData);

		currentContent = elem;
		addContent(binary);
	}
	
	/// send url to server
	/**
	 * Description
	 * @method sendURL
	 */
	function sendURL() {
		console.log("sendurl");
		var previewArea = document.getElementById('content_preview_area'),
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
	/**
	 * Description
	 * @method sendImage
	 * @param {} imagebinary
	 * @param {} width
	 * @param {} height
	 */
	function sendImage(imagebinary, width, height) {
		var metaData = {type : "image", posx : 0, posy : 0, width : width, height: height},
			binary = metabinary.createMetaBinary(metaData, imagebinary);
		console.log("sendImage");
		addContent(binary);
	}
	
	/// open image file
	/**
	 * Description
	 * @method openImage
	 * @param {} evt
	 */
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
	/**
	 * Description
	 * @method openText
	 * @param {} evt
	 */
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
	/**
	 * Description
	 * @method replaceImage
	 * @param {} evt
	 */
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
	/**
	 * Description
	 * @method addScreenRect
	 * @param {} windowData
	 */
	function addScreenRect(windowData) {
		var whole = vscreen.getWhole(),
			screens = vscreen.getScreenAll(),
			split_wholes = vscreen.getSplitWholes(),
			s,
			wholeElem = document.createElement('span'),
			previewArea = document.getElementById('display_preview_area'),
			screenElem;
		
		if (windowData) {
			screenElem = document.getElementById(windowData.id);
			if (screenElem) {
				vsutil.assignScreenRect(screenElem, vscreen.transformScreen(screens[windowData.id]));
				return;
			}
		}

		console.log("screens:" + JSON.stringify(vscreen));
		wholeElem.style.border = 'solid';
		wholeElem.style.zIndex = -1000;
		wholeElem.className = "screen";
		wholeElem.id = wholeWindowID;
		wholeElem.style.color = "black";
		setupWindow(wholeElem, wholeElem.id);
		vsutil.assignScreenRect(wholeElem, whole);
		previewArea.appendChild(wholeElem);
		for (s in screens) {
			if (screens.hasOwnProperty(s)) {
				screenElem = document.createElement('div');
				screenElem.className = "screen";
				screenElem.style.zIndex = -100;
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
	
	/// update all screens
	/**
	 * Description
	 * @method updateScreen
	 * @param {} windowData
	 */
	function updateScreen(windowData) {
		var whole = vscreen.getWhole(),
			splitCount = vscreen.getSplitCount(),
			previewArea = document.getElementById('display_preview_area'),
			screens = previewArea.getElementsByClassName('screen'),
			scale = vscreen.getWholeScale(),
			i,
			metaData,
			elem;
		
		if (windowData) {
			elem = document.getElementById(windowData.id);
			if (elem) {
				console.log("assignScreenRect");
				vsutil.assignMetaData(elem, windowData, true);
			}
		} else {
			// recreate all screens
			assignVirtualDisplayProperty();
			assignViewSetting();
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
	
	/**
	 * Description
	 * @method changeDisplayValue
	 */
	function changeDisplayValue() {
		var whole = vscreen.getWhole(),
			wholeWidth = document.getElementById('whole_width'),
			wholeHeight = document.getElementById('whole_height'),
			wholeSplitX = document.getElementById('whole_split_x'),
			wholeSplitY = document.getElementById('whole_split_y'),
			scale_current = document.getElementById('scale_dropdown_current'),
			w,
			h,
			s = parseFloat(scale_current.innerHTML),
			ix = parseInt(wholeSplitX.value, 10),
			iy = parseInt(wholeSplitY.value, 10),
			cx = document.body.scrollWidth / 2,
			cy = document.body.scrollHeight / 2;

		if (!wholeWidth || !whole.hasOwnProperty('w')) {
			w = initialWholeWidth;
		} else {
			w = parseInt(wholeWidth.value, 10);
			if (w <= 1) {
				wholeWidth.value = 100;
				w = 100;
			}
		}
		if (!wholeHeight || !whole.hasOwnProperty('h')) {
			h = initialWholeHeight;
		} else {
			h = parseInt(wholeHeight.value, 10);
			if (h <= 1) {
				wholeHeight.value = 100;
				h = 100;
			}
		}
		if (s <= 0) {
			s = 0.1;
			scale_current.innerHTML = 0.1;
		}
		console.log("changeDisplayValue", w, h, s);
		if (w && h && s) {
			vscreen.assignWhole(w, h, cx, cy, s);
		}
		if (ix && iy) {
			vscreen.splitWhole(ix, iy);
		}
		updateWindowData();
		updateScreen();
		changeWholeSplit(ix, iy, true);
	}
	
	/**
	 * Description
	 * @method importContentToView
	 * @param {} metaData
	 * @param {} contentData
	 */
	function importContentToView(metaData, contentData) {
		var previewArea = document.getElementById('content_preview_area'),
			elem,
			tagName,
			blob,
			mime = "image/jpeg";

		if (isVisible(metaData)) {
			metaDataDict[metaData.id] = metaData;
			console.log("importContentToView:" + JSON.stringify(metaData));

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
				elem.style.overflow = "auto";
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
	
	/**
	 * Description
	 * @method importContentToList
	 * @param {} metaData
	 * @param {} contentData
	 */
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
					var aspect;
					if (contentElem.offsetHeight > 200) {
						aspect = contentElem.offsetWidth / contentElem.offsetHeight;
						divElem.style.height = "100px";
						divElem.style.width = 100 * aspect;
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
	/**
	 * Description
	 * @method importContent
	 * @param {} metaData
	 * @param {} contentData
	 */
	function importContent(metaData, contentData) {
		importContentToList(metaData, contentData);
		importContentToView(metaData, contentData);
	}
	
	/**
	 * Description
	 * @method importWindowToView
	 * @param {} windowData
	 */
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
		metaDataDict[windowData.id] = windowData;
		if (isVisible(windowData)) {
			console.log("import window:" + JSON.stringify(windowData));
			vscreen.assignScreen(windowData.id, windowData.orgX, windowData.orgY, windowData.orgWidth, windowData.orgHeight);
			vscreen.setScreenSize(windowData.id, windowData.width, windowData.height);
			vscreen.setScreenPos(windowData.id, windowData.posx, windowData.posy);
			//console.log("import windowsc:", vscreen.getScreen(windowData.id));
			updateScreen(windowData);
		}
	}
	
	/**
	 * Description
	 * @method importWindowToList
	 * @param {} windowData
	 */
	function importWindowToList(windowData) {
		var displayArea = document.getElementById('display_area'),
			divElem,
			onlistID = "onlist:" + windowData.id;
		
		divElem = document.getElementById(onlistID);
		if (divElem) { return; }
		
		divElem = document.createElement("div");
		divElem.innerHTML = "ID:" + windowData.id;
		divElem.id = onlistID;
		divElem.className = "screen";
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
	
	/**
	 * Description
	 * @method addWholeWindowToList
	 */
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
	
	/**
	 * Description
	 * @method clearWindowList
	 */
	function clearWindowList() {
		var displayArea = document.getElementById('display_area');
		displayArea.innerHTML = "";
	}
	
	/// import window
	/**
	 * Description
	 * @method importWindow
	 * @param {} windowData
	 */
	function importWindow(windowData) {
		importWindowToView(windowData);
		importWindowToList(windowData);
	}
	
	/**
	 * Description
	 * @method initAddContentArea
	 */
	function initAddContentArea() {
		var textSendButton = document.getElementById('text_send_button'),
			urlSendButton = document.getElementById('url_send_button'),
			imageFileInput = document.getElementById('image_file_input'),
			textFileInput = document.getElementById('text_file_input'),
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
	}
	
	/**
	 * Description
	 * @method initViewSettingArea
	 */
	function initViewSettingArea() {
		var dropDownCurrent = document.getElementById('snap_dropdown_current'),
			free = document.getElementById('dropdown_item1'),
			display = document.getElementById('dropdown_item2'),
			displaySettingItem = document.getElementById('virtual_display_setting'),
			i;
			
		free.onclick = function () {
			dropDownCurrent.innerHTML = this.innerHTML;
			console.log("free mode");
			snapSetting = 'free';
			saveCookie();
		};

		display.onclick = function () {
			dropDownCurrent.innerHTML = this.innerHTML;
			console.log("display mode");
			snapSetting = 'display';
			saveCookie();
		};

		displaySettingItem.onclick = function () {
			select(wholeWindowListID);
		};
		
		addScaleDropdown('display_scale_1', 0.1);
		addScaleDropdown('display_scale_2', 0.2);
		addScaleDropdown('display_scale_3', 0.3);
		addScaleDropdown('display_scale_4', 0.4);
		addScaleDropdown('display_scale_5', 0.5);
		addScaleDropdown('display_scale_6', 0.6);
		addScaleDropdown('display_scale_7', 0.7);
		addScaleDropdown('display_scale_8', 0.8);
		addScaleDropdown('display_scale_9', 0.9);
		addScaleDropdown('display_scale_10', 1.0);
		//addScaleDropdown('display_scale_11', "custum");
	}
	
	/**
	 * Description
	 * @method initContentArea
	 * @param {} bottomfunc
	 */
	function initContentArea(bottomfunc) {
		var addButton = document.getElementById('content_add_button'),
			contentDeleteButton = document.getElementById('content_delete_button');
		
		addButton.onclick = function () {
			bottomfunc(true);
		};
		contentDeleteButton.onclick = deleteContent;
	}
	
	/**
	 * Description
	 * @method initDisplayArea
	 */
	function initDisplayArea() {
		var displayDeleteButton = document.getElementById('display_delete_button'),
			displayDeleteAllButton = document.getElementById('display_delete_all_button');
		displayDeleteButton.onclick = deleteDisplay;
		displayDeleteAllButton.onclick = deleteDisplayAll;
	}
	
	
	/**
	 * Description
	 * @method initLeftArea
	 * @param {} bottomfunc
	 */
	function initLeftArea(bottomfunc) {
		var displayArea = document.getElementById('display_area'),
			displayTabTitle = document.getElementById('display_tab_title'),
			displayTabLink = document.getElementById('display_tab_link'),
			displayButtonArea = document.getElementById('display_button_area'),
			contentArea = document.getElementById('content_area'),
			contentButtonArea = document.getElementById('content_button_area'),
			contentTabTitle = document.getElementById('content_tab_title'),
			contentTabLink = document.getElementById('content_tab_link'),
			showIDButton = document.getElementById('show_display_id_button'),
			displayPreviewArea = document.getElementById('display_preview_area'),
			contentPreviewArea = document.getElementById('content_preview_area');
		
		showIDButton.onclick = function () {
			var id = document.getElementById('content_id').innerHTML;
			console.log("reqShowWindowID:" + id);
			if (id) {
				if (metaDataDict[id].type === windowType) {
					socket.emit('reqShowWindowID', JSON.stringify({id : id}));
					lastDraggingID = id;
					document.getElementById("onlist:" + id).style.borderColor = windowSelectColor;
				} else {
					socket.emit('reqShowWindowID', JSON.stringify({type : 'all', id : ""}));
				}
			} else {
				socket.emit('reqShowWindowID', JSON.stringify({type : 'all', id : ""}));
			}
		};

		displayTabTitle.onclick = function () {
			displayArea.style.display = "block";
			contentArea.style.display = "none";
			contentButtonArea.style.display = "none";
			displayButtonArea.style.display = "block";
			displayTabTitle.className = "display_tab_title active";
			contentTabTitle.className = "content_tab_title";
			displayTabLink.className = "active";
			contentTabLink.className = "";
			displayPreviewArea.style.opacity = 1.0;
			contentPreviewArea.style.opacity = 0.3;
			displayPreviewArea.style.zIndex = 10;
			contentPreviewArea.style.zIndex = -1000;
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
			displayPreviewArea.style.opacity = 0.3;
			contentPreviewArea.style.opacity = 1.0;
			displayPreviewArea.style.zIndex = -1000;
			contentPreviewArea.style.zIndex = 10;
		};
		initContentArea(bottomfunc);
		initDisplayArea();
	}
	
	/// initialize elemets, events
	/**
	 * Description
	 * @method init
	 */
	function init() {
		var timer = null,
			scale,
			snap,
			bottomfunc = window.animtab.create('bottom',
				{'bottomTab' : { min : '0px', max : 'auto' }},
				{ 'bottomArea' : { min : '0px', max : '400px' }}, 'AddContent');
		
		scale = parseFloat(getCookie('display_scale'));
		console.log("cookie - display_scale:" + scale);
		snap = getCookie('snap_setting');
		console.log("cookie - snap_setting:" + snap);
		if (!isNaN(scale) && scale > 0) {
			vscreen.setWholeScale(scale, true);
		}
		if (snap) {
			if (snap === 'display') {
				snapSetting = 'display';
			}
		}
		
		manipulator.setDraggingOffsetFunc(draggingOffsetFunc);
		manipulator.setCloseFunc(closeFunc);
		bottomfunc(false);
		
		initPropertyArea(wholeWindowListID, "whole_window");
		initLeftArea(bottomfunc);
		initAddContentArea();
		initViewSettingArea();
		
		// resize event
		window.onresize = function () {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(function () {
				var whole = vscreen.getWhole(),
					cx = document.body.scrollWidth / 2,
					cy = document.body.scrollHeight / 2;
				
				vscreen.assignWhole(whole.orgW, whole.orgH, cx, cy, vscreen.getWholeScale());
				manipulator.removeManipulator();
				updateScreen();
			}, 200);
		};
		
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
			previewArea = document.getElementById('content_preview_area'),
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
	
	socket.on('doneGetVirtualDisplay', function (reply) {
		var windowData = JSON.parse(reply),
			whole = vscreen.getWhole(),
			split = vscreen.getSplitCount(),
			cx = document.body.scrollWidth / 2,
			cy = document.body.scrollHeight / 2;
		
		console.log('doneGetVirtualDisplay', reply, whole);
		if (windowData.hasOwnProperty('orgWidth')) {
			// set virtual displays
			vscreen.assignWhole(windowData.orgWidth, windowData.orgHeight, cx, cy, vscreen.getWholeScale());
			vscreen.splitWhole(windowData.splitX, windowData.splitY);
			console.log("doneGetVirtualDisplay", vscreen.getWhole());
			updateScreen();
		} else {
			// running first time
			changeDisplayValue();
			updateWindowData();
		}
	});
	
	socket.on('updateTransform', function () {
		socket.emit('reqGetMetaData', JSON.stringify({type: "all", id: ""}));
	});
	
	socket.on('updateWindow', function () {
		console.log('updateWindow');
		//updateScreen();
		//clearWindowList();
		socket.emit('reqGetWindow', JSON.stringify({type: "all", id: ""}));
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
