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
		screens = {},
		whole_subscreens = {},
		whole_subscreen_id = "whole_sub_window",
		split_x = 1,
		split_y = 1;
	
	// utility
	function scalePos(p, c) {
		return (p - c) * vscreen_scale + c;
	}
	
	function scalePosInv(p, c) {
		return (p - c) / vscreen_scale + c;
	}
	
	function makeRect(left, top, width, height) {
		return {
			x : left,
			y : top,
			w : width,
			h : height
		};
	}
	
	function transform(rect) {
		return {
			x : scalePos(vscreen_rect.x + rect.x, center_x),
			y : scalePos(vscreen_rect.y + rect.y, center_y),
			w : rect.w * vscreen_scale,
			h : rect.h * vscreen_scale
		};
	}
	
	function transformOrg(rect) {
		return {
			x : scalePos(vscreen_rect.orgX + rect.x, center_x),
			y : scalePos(vscreen_rect.orgY + rect.y, center_y),
			w : rect.w * vscreen_scale,
			h : rect.h * vscreen_scale
		};
	}
	
	function transformOrgInv(rect) {
		return {
			x : scalePosInv(rect.x - vscreen_rect.orgX * vscreen_scale, center_x),
			y : scalePosInv(rect.y - vscreen_rect.orgY * vscreen_scale, center_y),
			w : rect.w / vscreen_scale,
			h : rect.h / vscreen_scale
		};
	}
	
	function setWholeSize(w, h, s) {
		vscreen_rect.x = scalePos(center_x - w * 0.5, center_x);
		vscreen_rect.y = scalePos(center_y - h * 0.5, center_y);
		vscreen_rect.w = w * s;
		vscreen_rect.h = h * s;
		console.log("w:" + w);
		console.log("s:" + s);
		console.log("vscreen_rect" + JSON.stringify(vscreen_rect));
	}
	
	function splitWhole(xcount, ycount) {
		var i,
			k,
			screen,
			subW = vscreen_rect.orgW / parseFloat(xcount),
			subH = vscreen_rect.orgH / parseFloat(ycount);
			
		split_x = xcount;
		split_y = ycount;
		
		for (k = 1; k <= ycount; k = k + 1) {
			for (i = 1; i <= xcount; i = i + 1) {
				screen = {
					id : whole_subscreen_id + ":" + i + ":" + k,
					x : (i - 1) * subW,
					y : (k - 1) * subH,
					w : subW,
					h : subH
				};
				whole_subscreens[screen.id] = screen;
			}
		}
	}
	
	function getSplitWholes() {
		return whole_subscreens;
	}
	
	function getSplitWholeByPos(px, py) {
		var i,
			w;
		for (i in whole_subscreens) {
			if (whole_subscreens.hasOwnProperty(i)) {
				w = whole_subscreens[i];
				if (w.x <= px && px < (w.x + w.w)) {
					if (w.y <= py && py < (w.y + w.h)) {
						return w;
					}
				}
			}
		}
		return null;
	}
	
	function getSplitCount() {
		return {
			x : split_x,
			y : split_y
		};
	}
	
	function clearSplitWholes() {
		whole_subscreens = {};
	}
	
	function translateWhole(x, y) {
		vscreen_rect.x = vscreen_rect.x + x;
		vscreen_rect.y = vscreen_rect.y + y;
	}
	
	function setWholePos(x, y) {
		vscreen_rect.x = x;
		vscreen_rect.y = y;
	}
	
	function setWholeScale(s) {
		vscreen_scale = s;
		assignWhole(vscreen_rect.orgW, vscreen_rect.orgH, center_x, center_y, s);
	}
	
	function getWholeScale() {
		return vscreen_scale;
	}
	
	/// assign whole virtual screen
	/// if exists, overwrite
	function assignWhole(w, h, cx, cy, s) {
		var i,
			screen,
			rect;
		center_x = cx;
		center_y = cy;
		vscreen_scale = s;
		setWholeSize(w, h, s);
		vscreen_rect.orgX = center_x - w * 0.5;
		vscreen_rect.orgY = center_y - h * 0.5;
		vscreen_rect.orgW = w;
		vscreen_rect.orgH = h;
		console.log("vscreen_rect" + JSON.stringify(vscreen_rect));
	}
	
	function getWhole() {
		return vscreen_rect;
	}
	
	function getCenter() {
		return {
			x : center_x,
			y : center_y
		};
	}
	
	function setWholeCenter(x, y) {
		center_x = x;
		center_y = y;
	}
	
	/// assign single screen
	/// if exists, overwrite.
	/// @param x window coordinate
	/// @param y window coordinate
	function assignScreen(id, x, y, w, h) {
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
	
	function getScreen(id) {
		if (screens.hasOwnProperty(id)) {
			return screens[id];
		}
		return null;
	}
	
	function getScreenAll() {
		return screens;
	}
	
	function setScreenSize(id, w, h) {
		var screen = getScreen(id);
		if (screen) {
			screen.w = w;
			screen.h = h;
		}
	}
	
	function setScreenPos(id, x, y) {
		var screen = getScreen(id);
		if (screen) {
			screen.x = x;
			screen.y = y;
		}
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
	
	function clearScreenAll() {
		screens = {};
	}
	
	function transformScreen(screen) {
		return transformOrg(makeRect(screen.x, screen.y, screen.w, screen.h));
	}
	
	function transformScreenInv(screen) {
		return transformOrgInv(makeRect(screen.x, screen.y, screen.w, screen.h));
	}
	
	window.vscreen = new Vscreen();
	// util
	window.vscreen.dump = dump;
	window.vscreen.makeRect = makeRect;
	// whole screen (one background screen)
	window.vscreen.assignWhole = assignWhole;
	window.vscreen.getCenter = getCenter;
	window.vscreen.getWhole = getWhole;
	window.vscreen.setWholeCenter = setWholeCenter;
	window.vscreen.setWholeSize = setWholeSize;
	window.vscreen.setWholeScale = setWholeScale;
	window.vscreen.getWholeScale = getWholeScale;
	window.vscreen.setWholePos = setWholePos;
	window.vscreen.translateWhole = translateWhole;
	window.vscreen.splitWhole = splitWhole;
	window.vscreen.getSplitWholes = getSplitWholes;
	window.vscreen.getSplitWholeByPos = getSplitWholeByPos;
	window.vscreen.clearSplitWholes = clearSplitWholes;
	window.vscreen.getSplitCount = getSplitCount;
	// screen
	window.vscreen.assignScreen = assignScreen;
	window.vscreen.getScreen = getScreen;
	window.vscreen.getScreenAll = getScreenAll;
	window.vscreen.setScreenSize = setScreenSize;
	window.vscreen.setScreenPos = setScreenPos;
	window.vscreen.clearScreenAll = clearScreenAll;
	// transform
	window.vscreen.transform = transform;
	window.vscreen.transformOrg = transformOrg;
	window.vscreen.transformOrgInv = transformOrgInv;
	window.vscreen.transformScreen = transformScreen;
	window.vscreen.transformScreenInv = transformScreenInv;
	
}());
