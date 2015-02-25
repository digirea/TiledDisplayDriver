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
		
		// result command
		doneAddContent : "doneAddContent",
		doneGetContent : "doneGetContent",
		doneGetMetaData : "doneGetMetaData",
		doneDeleteContent : "doneDeleteContent",
		doneUpdateContent : "doneUpdateContent",
		doneUpdateTransform : "doneUpdateTransform",
		
		// update request from server
		update : "update",
		updateTransform : "updateTransform"
	};
	
	module.exports = Command;
}());
