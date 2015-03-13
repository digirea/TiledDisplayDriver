/*jslint devel:true*/
/*global io, socket, FileReader, Uint8Array, Blob, URL, event */

/// scale manipulator
(function () {
	"use strict";
	
	var Manipulator = function () {},
		draggingManip = null,
		windowType = "window",
		manipulators = [],
		draggingOffsetFunc = null;
	
	function getDraggingManip() {
		return draggingManip;
	}
	
	function setDraggingOffsetFunc(func) {
		draggingOffsetFunc = func;
	}
	
	function clearDraggingManip() {
		draggingManip = null;
	}

	/// move manipulator rects on elem
	/// @param manips list of manipulator elements
	/// @param targetElem manipulator target
	function moveManipulator(targetElem) {
		if (manipulators.length < 3) {
			console.log("manipulators:", manipulators);
			return;
		}
		
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
		manipulators[0].style.left = left + "px";
		manipulators[0].style.top = top + "px";
		// left bottom
		manipulators[1].style.left = left + "px";
		manipulators[1].style.top = (top + height) + "px";
		// right bottom
		manipulators[2].style.left = (left + width) + "px";
		manipulators[2].style.top = (top + height) + "px";
		// right top
		manipulators[3].style.left = (left + width) + "px";
		manipulators[3].style.top = top + "px";
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
			var rect = event.target.getBoundingClientRect();
			if (draggingOffsetFunc) {
				console.log("draggingOffsetFunc");
				draggingOffsetFunc(evt.clientY - rect.top, evt.clientX - rect.left);
			}
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
			i;
		
		moveManipulator(manips, elem);
		removeManipulator();
		
		for (i = 0; i < manips.length; i = i + 1) {
			manip = manips[i];
			manip.id = "_manip_" + i;
			setupManipulator(manip);
			previewArea.appendChild(manip);
			manipulators.push(manip);
		}
	}
	
	window.manipulator = new Manipulator();
	window.manipulator.moveManipulator = moveManipulator;
	window.manipulator.setupManipulator = setupManipulator;
	window.manipulator.removeManipulator = removeManipulator;
	window.manipulator.showManipulator = showManipulator;
	window.manipulator.getDraggingManip = getDraggingManip;
	window.manipulator.clearDraggingManip = clearDraggingManip;
	window.manipulator.setDraggingOffsetFunc = setDraggingOffsetFunc;
}());
