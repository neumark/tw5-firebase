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
    this.revisions = {};
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

FirestoreClientAdaptor.prototype.request = function(endpoint, obj = {}) {
    return new Promise((resolve, reject) => $tw.utils.httpRequest(Object.assign(obj, {
        url: this.host + endpoint,
        callback: (error, data) => error ? reject(error) : resolve(JSON.parse(data)),
        headers: {
            'Authorization': 'Bearer ' + this.user.token,
			"Content-type": "application/json"
        }
    })));
};

const maybeInvokeCallback = (promise, callback) => callback ? promise.then(
        data => callback(null, data),
        callback) : promise;

/*
Load a tiddler and invoke the callback with (err,tiddlerFields)
*/
FirestoreClientAdaptor.prototype.loadTiddler = function(title,callback) {
    return maybeInvokeCallback(
        this.request(`recipes/default/tiddlers/${encodeURIComponent(title || "")}`).then(
            data => Array.isArray(data) ? data.map(this.convertTiddlerFromTiddlyWebFormat.bind(this)) : this.convertTiddlerFromTiddlyWebFormat(data)),
        callback);
};

/*
Get the current status of the TiddlyWeb connection
*/
FirestoreClientAdaptor.prototype.getStatus = function(callback) {
    // hijack getstatus to read all tiddlers
    const doCallback = () => callback(null,true,this.user.email,false,false);
    if (this.hasStatus) {
        return doCallback();
    }
    this.hasStatus = true;
    // load the initial load of all tiddlers:
    this.loadTiddler().then(
        tiddlers => {
                tiddlers.forEach(t => {
                    this.revisions[t.title] = t.revision;
                    window.$tw.syncer.storeTiddler(t);
                });
                doCallback();
        },
        // on error
        callback
    );
};

/*
Save a tiddler and invoke the callback with (err,adaptorInfo,revision)
*/
FirestoreClientAdaptor.prototype.saveTiddler = function(tiddler,callback) {
	var self = this;
	if(this.isReadOnly) {
		return callback(null);
	}
	return this.request(
        `recipes/default/tiddlers/${encodeURIComponent(tiddler.fields.title)}`, {
		type: "PUT",
		data: this.convertTiddlerToTiddlyWebFormat(tiddler)}).then(
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
	var self = this;
	if(this.isReadOnly) {
		return callback(null);
	}
	// If we don't have a bag it means that the tiddler hasn't been seen by the server, so we don't need to delete it
	var bag = options.tiddlerInfo.adaptorInfo && options.tiddlerInfo.adaptorInfo.bag;
	if(!bag) {
		return callback(null);
	}
	// Issue HTTP request to delete the tiddler
    return this.request(
        `bags/${encodeURIComponent(bag)}/tiddlers/${encodeURIComponent(title)}?revision=${encodeURIComponent(this.revisions[title])}`,
        {type: "DELETE"}).then(
            () => callback(null),
            callback);
};

/*
Convert a tiddler to a field set suitable for PUTting to TiddlyWeb
*/
FirestoreClientAdaptor.prototype.convertTiddlerToTiddlyWebFormat = function(tiddler) {
	var result = {},
		knownFields = [
			"bag", "created", "creator", "modified", "modifier", "permissions", "recipe", "revision", "tags", "text", "title", "type", "uri"
		];
	if(tiddler) {
		$tw.utils.each(tiddler.fields,function(fieldValue,fieldName) {
			var fieldString = fieldName === "tags" ?
								tiddler.fields.tags :
								tiddler.getFieldString(fieldName); // Tags must be passed as an array, not a string

			if(knownFields.indexOf(fieldName) !== -1) {
				// If it's a known field, just copy it across
				result[fieldName] = fieldString;
			} else {
				// If it's unknown, put it in the "fields" field
				result.fields = result.fields || {};
				result.fields[fieldName] = fieldString;
			}
		});
        result.revision = this.revisions[tiddler.fields.title];
	}
	// Default the content type
	result.type = result.type || "text/vnd.tiddlywiki";
	return JSON.stringify(result,null,$tw.config.preferences.jsonSpaces);
};

/*
Convert a field set in TiddlyWeb format into ordinary TiddlyWiki5 format
*/
FirestoreClientAdaptor.prototype.convertTiddlerFromTiddlyWebFormat = function(tiddlerFields) {
	var self = this,
		result = {};
	// Transfer the fields, pulling down the `fields` hashmap
	$tw.utils.each(tiddlerFields,function(element,title,object) {
		if(title === "fields") {
			$tw.utils.each(element,function(element,subTitle,object) {
				result[subTitle] = element;
			});
		} else {
			result[title] = tiddlerFields[title];
		}
	});
	// Some unholy freaking of content types
	if(result.type === "text/javascript") {
		result.type = "application/javascript";
	} else if(!result.type || result.type === "None") {
		result.type = "text/x-tiddlywiki";
	}
	return result;
};


if($tw.browser && document.location.protocol.substr(0,4) === "http" ) {
	exports.adaptorClass = FirestoreClientAdaptor;
}

})();
