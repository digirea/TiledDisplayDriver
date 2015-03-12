/*jslint devel:true*/
/*global io, socket, FileReader, Uint8Array, Blob, URL, event */

/// content, display assignment util
(function (vscreen) {
	"use strict";
	
	var VscreenUtil = function () {};
	
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
	
	function resizeText(elem, rect) {
		var lineCount = 1,
			fsize;
		if (elem && rect) {
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
	}
	
	function assignRect(elem, rect, withoutWidth, withoutHeight) {
		if (elem && rect) {
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
		//console.log("assignRect:" + JSON.stringify(rect));
	}
	
	function assignMetaData(elem, metaData, useOrg) {
		var rect;
		if (useOrg) {
			rect = vscreen.transformOrg(toIntRect(metaData));
		} else {
			rect = vscreen.transform(toIntRect(metaData));
		}
		if (elem && metaData) {
			assignRect(elem, rect, (metaData.width < 10), (metaData.height < 10));
			if (metaData.type === "text") {
				resizeText(elem, rect);
			}
		}
	}
	
	function assignScreenRect(elem, rect) {
		if (elem && rect) {
			elem.style.position = 'absolute';
			elem.style.left = parseInt(rect.x, 10) + 'px';
			elem.style.top = parseInt(rect.y, 10) + 'px';
			elem.style.width = parseInt(rect.w, 10) + 'px';
			elem.style.height = parseInt(rect.h, 10) + 'px';
			console.log("assignScreenRect:" + JSON.stringify(rect));
		}
	}
	
	function transInv(metaData) {
		var rect = vscreen.transformOrgInv(toFloatRect(metaData));
		metaData.posx = rect.x;
		metaData.posy = rect.y;
		metaData.width = rect.w;
		metaData.height = rect.h;
		return metaData;
	}
	
	function trans(metaData) {
		var rect = vscreen.transformOrg(toFloatRect(metaData));
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
	
	window.vscreen_util = new VscreenUtil();
	window.vscreen_util.assignMetaData = assignMetaData;
	window.vscreen_util.assignScreenRect = assignScreenRect;
	window.vscreen_util.trans = trans;
	window.vscreen_util.transInv = transInv;
	window.vscreen_util.transPosInv = transPosInv;
}(window.vscreen));
