/*jslint devel:true*/
/*global require, socket, module, Buffer */

(function () {
	"use strict";
	
	var Command = {
		
		// request command
		reqAddContent : "reqAddContent",
		reqGetContent : "reqGetContent",
		reqGetMetaData : "reqGetMetaData",
		reqDeleteContent : "reqDeleteContent",
		reqUpdateContent : "reqUpdateContent",
		reqUpdateTransform : "reqUpdateTransform",
		reqAddWindow : "reqAddWindow",
		reqDeleteWindow : "reqDeleteWindow",
		reqGetWindow : "reqGetWindow",
		reqUpdateWindow : "reqUpdateWindow",
		reqUpdateVirtualDisplay : "reqUpdateVirtualDisplay",
		reqGetVirtualDisplay : "reqGetVirtualDisplay",
		
		// result command
		doneAddContent : "doneAddContent",
		doneGetContent : "doneGetContent",
		doneGetMetaData : "doneGetMetaData",
		doneDeleteContent : "doneDeleteContent",
		doneUpdateContent : "doneUpdateContent",
		doneUpdateTransform : "doneUpdateTransform",
		doneAddWindow : "doneAddWindow",
		doneDeleteWindow : "doneDeleteWindow",
		doneGetWindow : "doneGetWindow",
		doneUpdateWindow : "doneUpdateWindow",
		doneUpdateVirtualDisplay : "doneUpdateVirtualDisplay",
		doneGetVirtualDisplay : "doneGetVirtualDisplay",
		
		// update request from server
		update : "update",
		updateTransform : "updateTransform",
		updateWindow : "updateWindow"
	};
	
	module.exports = Command;
}());
