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

const {loadTiddler, saveTiddler, deleteTiddler} = require('./core');

const CONFIG_TIDDLER = "$:/config/firestore-syncadaptor-client/config";
const USER_TIDDLER = "$:/temp/user";

function FirestoreClientAdaptor(options) {
    // USER_TIDDLER and CONFIG_TIDDLER must be preloaded into the wiki
    this.wiki = options.wiki;
    this.config = JSON.parse(this.wiki.getTiddlerText(CONFIG_TIDDLER));
    this.user = JSON.parse(this.wiki.getTiddlerText(USER_TIDDLER));
	this.hasStatus = false;
	this.logger = new $tw.utils.Logger("FirestoreClientAdaptor");
	this.isLoggedIn = false;
	this.isReadOnly = false;
    this.revisions = Object.fromEntries(globalThis._pnwiki.initialTidders.map(({title, revision}) => [title, revision]));
}

FirestoreClientAdaptor.prototype.name = "firestore";

FirestoreClientAdaptor.prototype.supportsLazyLoading = false;

FirestoreClientAdaptor.prototype.setLoggerSaveBuffer = function(loggerForSaving) {
	this.logger.setSaveBuffer(loggerForSaving);
};

FirestoreClientAdaptor.prototype.isReady = () => true;

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
    return promiseToCallback(loadTiddler(Object.assign({tiddler: title}, this.config), callback));
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
    const tiddlerID = Object.assign({}, this.config, {
        tiddler: tiddler.fields.title,
        revision: this.revisions[tiddler.fields.title],
        // NOTE: workaround so draft tiddlers aren't written to the bag of the original tiddler (which wont accept them)
        bag: tiddler.fields['draft.of'] ? undefined : tiddler.fields.bag
    });
	return saveTiddler(
        tiddlerID,
        tiddler).then(
            ({bag, revision}) => {
                this.revisions[tiddler.fields.title] = revision;
                return callback(null, {bag}, revision);
            },
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
    const tiddlerID = Object.assign({}, this.config, {
        tiddler: title,
        revision: this.revisions[title],
        bag
    });
	// Issue HTTP request to delete the tiddler
    return deleteTiddler(tiddlerID).then(
            () => callback(null),
            callback);
};

if($tw.browser && document.location.protocol.substr(0,4) === "http" ) {
       exports.adaptorClass = FirestoreClientAdaptor;
}

})();
