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
		reqRegisterWindow : "reqRegisterWindow",
		reqGetWindow : "reqGetWindow",
		reqUpdateWindow : "reqUpdateWindow",
		
		// result command
		doneAddContent : "doneAddContent",
		doneGetContent : "doneGetContent",
		doneGetMetaData : "doneGetMetaData",
		doneDeleteContent : "doneDeleteContent",
		doneUpdateContent : "doneUpdateContent",
		doneUpdateTransform : "doneUpdateTransform",
		doneRegisterWindow : "doneRegisterWindow",
		doneGetWindow : "doneGetWindow",
		doneUpdateWindow : "doneUpdateWindow",
		
		// update request from server
		update : "update",
		updateTransform : "updateTransform",
		updateWindow : "updateWindow"
	};
	
	module.exports = Command;
}());
