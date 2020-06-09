/*\
title: $:/plugins/neumark/firestore-syncadaptor-client/core.js
type: application/javascript
module-type: library

A sync adaptor module for synchronising with TiddlyWeb compatible servers

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const request = (url, options) => window._pnwiki.getIdToken().then(
    token => fetch(url, Object.assign(
        {},
        options,
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }))).then(response => response.json());

/*
Convert a tiddler to a field set suitable for PUTting to TiddlyWeb
*/
const convertTiddlerToTiddlyWebFormat = tiddler => {
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
	return JSON.stringify(result);
};

const each = function(object,callback) {
	var next,f,length;
	if(object) {
		if(Object.prototype.toString.call(object) == "[object Array]") {
			for (f=0, length=object.length; f<length; f++) {
				next = callback(object[f],f,object);
				if(next === false) {
					break;
				}
		    }
		} else {
			var keys = Object.keys(object);
			for (f=0, length=keys.length; f<length; f++) {
				var key = keys[f];
				next = callback(object[key],key,object);
				if(next === false) {
					break;
				}
			}
		}
	}
};

/*
Convert a field set in TiddlyWeb format into ordinary TiddlyWiki5 format
*/
const convertTiddlerFromTiddlyWebFormat = tiddlerFields => {
	var result = {};
	// Transfer the fields, pulling down the `fields` hashmap
	each(tiddlerFields,function(element,title,object) {
		if(title === "fields") {
			each(element,function(element,subTitle,object) {
				result[subTitle] = element;
			});
		} else {
			result[title] = tiddlerFields[title];
		}
	});
	// Some unholy freaking of content types
	if(result.type === "text/javascript") {
		result.type = "application/javascript";
	} else if(!result.type) {
		result.type = "text/x-tiddlywiki";
	}
	return result;
};

const loadTiddler = (host, title) => request(`${host}recipes/default/tiddlers/${encodeURIComponent(title || "")}`).then(
            data => Array.isArray(data) ? data.map(convertTiddlerFromTiddlyWebFormat) : convertTiddlerFromTiddlyWebFormat(data));

Object.assign(exports, {request, convertTiddlerToTiddlyWebFormat, convertTiddlerFromTiddlyWebFormat, loadTiddler});

})();
