/*\
title: $:/plugins/neumark/firestore-syncadaptor-client/adaptor.js
type: application/javascript
module-type: syncadaptor

A sync adaptor module for synchronising with TiddlyWeb compatible servers

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const {request, convertTiddlerToTiddlyWebFormat, convertTiddlerFromTiddlyWebFormat, loadTiddler} = require('./core');

var CONFIG_HOST_TIDDLER = "$:/config/firestore-syncadaptor-client/host",
	DEFAULT_HOST_TIDDLER = "$protocol$//$host$/";

function FirestoreClientAdaptor(options) {
	this.wiki = options.wiki;
	this.host = this.getHost();
	this.recipe = undefined;
	this.hasStatus = false;
	this.logger = new $tw.utils.Logger("FirestoreClientAdaptor");
	this.isLoggedIn = false;
	this.isReadOnly = false;
    this.user = JSON.parse($tw.wiki.getTiddler('$:/temp/user').fields.text);
    this.revisions = Object.fromEntries(window._pnwiki.initialTidders.map(({title, revision}) => [title, revision]));
}

FirestoreClientAdaptor.prototype.name = "firestore";

FirestoreClientAdaptor.prototype.supportsLazyLoading = false;

FirestoreClientAdaptor.prototype.setLoggerSaveBuffer = function(loggerForSaving) {
	this.logger.setSaveBuffer(loggerForSaving);
};

FirestoreClientAdaptor.prototype.isReady = () => true;

FirestoreClientAdaptor.prototype.getHost = function() {
	var text = this.wiki.getTiddlerText(CONFIG_HOST_TIDDLER,DEFAULT_HOST_TIDDLER),
		substitutions = [
			{name: "protocol", value: document.location.protocol},
			{name: "host", value: document.location.host}
		];
	for(var t=0; t<substitutions.length; t++) {
		var s = substitutions[t];
		text = $tw.utils.replaceString(text,new RegExp("\\$" + s.name + "\\$","mg"),s.value);
	}
	return text;
};

FirestoreClientAdaptor.prototype.getTiddlerInfo = tiddler => ({ bag: tiddler.fields.bag });

FirestoreClientAdaptor.prototype.getTiddlerRevision = function(title) {
	return this.revisions[title];
};

const promiseToCallback = (promise, callback) => promise.then(
        data => callback(null, data),
        callback);

/*
Load a tiddler and invoke the callback with (err,tiddlerFields)
*/
FirestoreClientAdaptor.prototype.loadTiddler = function(title,callback) {
    return promiseToCallback(loadTiddler(this.host, title), callback);
};

/*
Get the current status of the TiddlyWeb connection
*/
// TODO: set the anonymous and readOnly fields according to the roles
// callback(null,self.isLoggedIn,json.username,self.isReadOnly,self.isAnonymous);
FirestoreClientAdaptor.prototype.getStatus = function(callback) { return callback(null,true,this.user.email,false,false); };

/*
Save a tiddler and invoke the callback with (err,adaptorInfo,revision)
*/
FirestoreClientAdaptor.prototype.saveTiddler = function(tiddler,callback) {
	if(this.isReadOnly) {
		return callback(null);
	}
	return request(
        `${this.host}recipes/default/tiddlers/${encodeURIComponent(tiddler.fields.title)}`,
        {
            method: "PUT",
            body: Object.assign(
                convertTiddlerToTiddlyWebFormat(tiddler),
                {revision: this.revisions[tiddler.fields.title]})
        }).then(
            ({bag, revision}) => callback(null, {bag}, revision),
            // on error
            err => {
                if (err === "XMLHttpRequest error code: 409") {
                    console.log("save conflict on tiddler", tiddler);
                }
                return callback(err);
            });
};


/*
Delete a tiddler and invoke the callback with (err)
options include:
tiddlerInfo: the syncer's tiddlerInfo for this tiddler
*/
FirestoreClientAdaptor.prototype.deleteTiddler = function(title,callback,options) {
	if(this.isReadOnly) {
		return callback(null);
	}
	// If we don't have a bag it means that the tiddler hasn't been seen by the server, so we don't need to delete it
	var bag = options.tiddlerInfo.adaptorInfo && options.tiddlerInfo.adaptorInfo.bag;
	if(!bag) {
		return callback(null);
	}
	// Issue HTTP request to delete the tiddler
    return request(
        `${this.host}bags/${encodeURIComponent(bag)}/tiddlers/${encodeURIComponent(title)}?revision=${encodeURIComponent(this.revisions[title])}`,
        {method: "DELETE"}).then(
            () => callback(null),
            callback);
};


if($tw.browser && document.location.protocol.substr(0,4) === "http" ) {
	exports.adaptorClass = FirestoreClientAdaptor;
}

})();
