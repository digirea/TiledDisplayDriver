/*jslint devel:true*/
/*global io, socket, FileReader, Uint8Array, Blob, URL, event */

/// virtual screen
(function () {
	"use strict";
	
	var Vscreen = function () {},
		vscreen_scale = 0.5,
		vscreen_rect = {},
		center_x,
		center_y,
		screens = {};
	
	// utility
	function scalePos(p, c) {
		return (p - c) * vscreen_scale + c;
	}
	
	function scalePosInv(p, c) {
		return (p - c) / vscreen_scale + c;
	}
	
	function setSizeWhole(w, h, s) {
		vscreen_rect = {
			x : scalePos(center_x - w * 0.5, center_x),
			y : scalePos(center_y - h * 0.5, center_y),
			w : w * s,
			h : h * s,
			orgX : center_x - w * 0.5,
			orgY : center_y - h * 0.5,
			orgW : w,
			orgH : h
		};
	}
	
	/// create whole virtual screen
	function createWhole(w, h, cx, cy, s) {
		center_x = cx;
		center_y = cy;
		vscreen_scale = s;
		setSizeWhole(w, h, s);
	}
	
	function getWhole() {
		return vscreen_rect;
	}
	
	function setCenterWhole(x, y) {
		center_x = x;
		center_y = y;
		setSizeWhole(vscreen_rect.orgW, vscreen_rect.orgH, vscreen_scale);
	}
	
	/// add single screen
	function addScreen(id, x, y, w, h) {
		screens[id] = {
			id : id,
			x : x,
			y : y,
			w : w * vscreen_scale,
			h : h * vscreen_scale,
			orgX : x,
			orgY : y,
			orgW : w,
			orgH : h
		};
	}
	
	function setPos(id, x, y) {
		screens[id] = {
			x : scalePos(x, center_x),
			y : scalePos(y, center_y)
		};
	}
	
	function setSize(id, w, h) {
		screens[id] = {
			w : w * vscreen_scale,
			h : h * vscreen_scale
		};
	}
	
	function getScreen(id) {
		return screens[id];
	}
	
	function getScreenAll() {
		return screens;
	}
	
	function dump() {
		var s;
		console.log("center_x:" + center_x);
		console.log("center_y:" + center_y);
		console.log("vscreen_rect:" + JSON.stringify(vscreen_rect));
		for (s in screens) {
			if (screens.hasOwnProperty(s)) {
				console.log("id:" + s + "| " + JSON.stringify(screens[s]));
			}
		}
	}
	
	function transform(left, top, width, height) {
		return {
			x : scalePos(vscreen_rect.orgX + left, center_x),
			y : scalePos(vscreen_rect.orgY + top, center_y),
			w : width * vscreen_scale,
			h : height * vscreen_scale
		};
	}
	
	function transform_inv(left, top, width, height) {
		return {
			x : scalePosInv(left - vscreen_rect.orgX * vscreen_scale, center_x),
			y : scalePosInv(top - vscreen_rect.orgY * vscreen_scale, center_y),
			w : width / vscreen_scale,
			h : height / vscreen_scale
		};
	}
	
	function clearScreenAll() {
		screens = {};
	}
	
	window.vscreen = new Vscreen();
	window.vscreen.createWhole = createWhole;
	window.vscreen.getWhole = getWhole;
	window.vscreen.setCenterWhole = setCenterWhole;
	window.vscreen.setSizeWhole = setSizeWhole;
	window.vscreen.addScreen = addScreen;
	window.vscreen.getScreen = getScreen;
	window.vscreen.getScreenAll = getScreenAll;
	window.vscreen.clearScreenAll = clearScreenAll;
	window.vscreen.setPos = setPos;
	window.vscreen.transform = transform;
	window.vscreen.transform_inv = transform_inv;
	window.vscreen.setSize = setSize;
	window.vscreen.dump = dump;
	
}());
