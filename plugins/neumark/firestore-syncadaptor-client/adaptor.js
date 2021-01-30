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

const CONFIG_TIDDLER = "$:/config/WikiConfig";
const USER_TIDDLER = "$:/temp/user";
const FALLBACK_USER = JSON.stringify({name: 'unknown'});

function FirestoreClientAdaptor(options) {
    // USER_TIDDLER and CONFIG_TIDDLER must be preloaded into the wiki
    this.wiki = options.wiki;
    this.config = JSON.parse(this.wiki.getTiddlerText(CONFIG_TIDDLER));
    this.user = JSON.parse(this.wiki.getTiddlerText(USER_TIDDLER, FALLBACK_USER));
	this.hasStatus = false;
	this.logger = new $tw.utils.Logger("FirestoreClientAdaptor");
	this.isLoggedIn = false;
	this.isReadOnly = false;
    this.revisions = Object.fromEntries($tw._pnwiki.initialTidders.map(({title, revision}) => [title, revision]));
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
    return promiseToCallback(loadTiddler(Object.assign({tiddler: title}, this.config.wiki), $tw._pnwiki.getIdToken()), callback);
};

const EDITOR_ROLE = 3;
const isReadOnly = (wikiName, user) => {
    const key = `_${wikiName}`;
    return (typeof user.claims[key] === 'number') && user.claims[key] < EDITOR_ROLE;
};

/*
Get the current status of the TiddlyWeb connection
*/
// TODO: set the anonymous and readOnly fields according to the roles
// callback(null,self.isLoggedIn,json.username,self.isReadOnly,self.isAnonymous);
FirestoreClientAdaptor.prototype.getStatus = function(callback) { return callback(
    null,
    true, // isLoggedIn
    this.user.name || this.user.uid,
    isReadOnly(this.config.wiki.wikiName, this.user), // isReadOnly
    false // isAnonymous
); };

/*
Save a tiddler and invoke the callback with (err,adaptorInfo,revision)
*/
FirestoreClientAdaptor.prototype.saveTiddler = function(tiddler,callback) {
	if(this.isReadOnly) {
		return callback(null);
	}
    const tiddlerID = Object.assign({}, this.config.wiki, {
        tiddler: tiddler.fields.title,
        revision: this.revisions[tiddler.fields.title],
        // NOTE: workaround so draft tiddlers aren't written to the bag of the original tiddler (which wont accept them)
        bag: tiddler.fields['draft.of'] ? undefined : (tiddler.fields.bag || this.config.wiki.bag)
    });
	return saveTiddler(
        tiddlerID,
        tiddler,
        $tw._pnwiki.getIdToken()).then(
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
    const tiddlerID = Object.assign({}, this.config.wiki, {
        tiddler: title,
        revision: this.revisions[title],
        bag
    });
	// Issue HTTP request to delete the tiddler
    return promiseToCallback(
        deleteTiddler(tiddlerID, $tw._pnwiki.getIdToken()),
        callback);
};

if($tw.wiki.tiddlerExists(CONFIG_TIDDLER)) {
       exports.adaptorClass = FirestoreClientAdaptor;
}

})();
