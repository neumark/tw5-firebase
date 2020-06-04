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
    this.tokenPromise = null;
}

FirestoreClientAdaptor.prototype.name = "firestore";

FirestoreClientAdaptor.prototype.supportsLazyLoading = false;

FirestoreClientAdaptor.prototype.setLoggerSaveBuffer = function(loggerForSaving) {
	this.logger.setSaveBuffer(loggerForSaving);
};

FirestoreClientAdaptor.prototype.isReady = function() {
	return this.hasStatus;
};

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

FirestoreClientAdaptor.prototype.getTiddlerInfo = function(tiddler) {
	return {
		bag: tiddler.fields.bag
	};
};

FirestoreClientAdaptor.prototype.getTiddlerRevision = function(title) {
	var tiddler = this.wiki.getTiddler(title);
	return tiddler.fields.revision;
};

FirestoreClientAdaptor.prototype.withTokenPromise = function(fn) {
    if (this.tokenPromise === null) {
        this.tokenPromise = firebase.auth().currentUser.getIdToken();
    }
    return this.tokenPromise.then(fn);
};

/*
Get the current status of the TiddlyWeb connection
*/
FirestoreClientAdaptor.prototype.getStatus = function(callback) {
	// Get status
	var self = this;
    this.withTokenPromise(token => $tw.utils.httpRequest({
        url: "https://europe-west3-peterneumark-com.cloudfunctions.net/wiki-app/hello",
		type: "GET",
		headers: {
            'Authorization': 'Bearer ' + token
			//"Content-type": "application/json"
		},
        callback: (...args) => console.log(args)}));
	this.logger.log("Getting status");
    this.withTokenPromise((function (token) {
        $tw.utils.httpRequest({
            url: this.host + "status",
            headers: {
                'Authorization': 'Bearer ' + token
            },
            callback: function(err,data) {
                self.hasStatus = true;
                if(err) {
                    return callback(err);
                }
                // Decode the status JSON
                var json = null;
                try {
                    json = JSON.parse(data);
                } catch (e) {
                }
                if(json) {
                    self.logger.log("Status:",data);
                    // Record the recipe
                    if(json.space) {
                        self.recipe = json.space.recipe;
                    }
                    // Check if we're logged in
                    self.isLoggedIn = json.username !== "GUEST";
                    self.isReadOnly = !!json["read_only"];
                    self.isAnonymous = !!json.anonymous;
                }
                // Invoke the callback if present
                if(callback) {
                    callback(null,self.isLoggedIn,json.username,self.isReadOnly,self.isAnonymous);
                }
            }
        });
    }).bind(this));
};

/*
Save a tiddler and invoke the callback with (err,adaptorInfo,revision)
*/
FirestoreClientAdaptor.prototype.saveTiddler = function(tiddler,callback) {
	var self = this;
	if(this.isReadOnly) {
		return callback(null);
	}
	$tw.utils.httpRequest({
		url: this.host + "recipes/" + encodeURIComponent(this.recipe) + "/tiddlers/" + encodeURIComponent(tiddler.fields.title),
		type: "PUT",
		headers: {
			"Content-type": "application/json"
		},
		data: this.convertTiddlerToTiddlyWebFormat(tiddler),
		callback: function(err,data,request) {
			if(err) {
				return callback(err);
			}
			// Save the details of the new revision of the tiddler
			var etagInfo = self.parseEtag(request.getResponseHeader("Etag"));
			// Invoke the callback
			callback(null,{
				bag: etagInfo.bag
			}, etagInfo.revision);
		}
	});
};

/*
Load a tiddler and invoke the callback with (err,tiddlerFields)
*/
FirestoreClientAdaptor.prototype.loadTiddler = function(title,callback) {
	var self = this;
	$tw.utils.httpRequest({
		url: this.host + "recipes/" + encodeURIComponent(this.recipe) + "/tiddlers/" + encodeURIComponent(title),
		callback: function(err,data,request) {
			if(err) {
				return callback(err);
			}
			// Invoke the callback
			callback(null,self.convertTiddlerFromTiddlyWebFormat(JSON.parse(data)));
		}
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
	$tw.utils.httpRequest({
		url: this.host + "bags/" + encodeURIComponent(bag) + "/tiddlers/" + encodeURIComponent(title),
		type: "DELETE",
		callback: function(err,data,request) {
			if(err) {
				return callback(err);
			}
			// Invoke the callback
			callback(null);
		}
	});
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
	// Make sure the revision is expressed as a string
	if(typeof result.revision === "number") {
		result.revision = result.revision.toString();
	}
	// Some unholy freaking of content types
	if(result.type === "text/javascript") {
		result.type = "application/javascript";
	} else if(!result.type || result.type === "None") {
		result.type = "text/x-tiddlywiki";
	}
	return result;
};

/*
Split a TiddlyWeb Etag into its constituent parts. For example:

```
"system-images_public/unsyncedIcon/946151:9f11c278ccde3a3149f339f4a1db80dd4369fc04"
```

Note that the value includes the opening and closing double quotes.

The parts are:

```
<bag>/<title>/<revision>:<hash>
```
*/
FirestoreClientAdaptor.prototype.parseEtag = function(etag) {
	var firstSlash = etag.indexOf("/"),
		lastSlash = etag.lastIndexOf("/"),
		colon = etag.lastIndexOf(":");
	if(firstSlash === -1 || lastSlash === -1 || colon === -1) {
		return null;
	} else {
		return {
			bag: decodeURIComponent(etag.substring(1,firstSlash)),
			title: decodeURIComponent(etag.substring(firstSlash + 1,lastSlash)),
			revision: etag.substring(lastSlash + 1,colon)
		};
	}
};

if($tw.browser && document.location.protocol.substr(0,4) === "http" ) {
	exports.adaptorClass = FirestoreClientAdaptor;
}

})();
