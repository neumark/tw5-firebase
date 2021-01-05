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

const stringifyIfNeeded = value => (typeof value === 'object') ? JSON.stringify(value) : value;

const request = async (url, options={}, token) => {
    // when running under node, this code run in a sandbox without access to the global scope.
    // prior to calling, $tw._pnwiki.fetch must be set.
    const response = await (globalThis.fetch || globalThis.$tw._pnwiki.fetch)(url, Object.assign(
        {},
        options,
        {
            body: stringifyIfNeeded(options.body),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await token}`
            }
        }));
    const body = await response.json();
    if (response.status < 200 || response.status > 299) {
        throw new Error(body.message);
    }
    return body;
};

/*
Convert a tiddler to a field set suitable for PUTting to TiddlyWeb
*/
const KNOWN_FIELDS = ["bag", "created", "creator", "modified", "modifier", "permissions", "recipe", "revision", "tags", "text", "title", "type", "uri"];
const convertTiddlerToTiddlyWebFormat = tiddler => {
	var result = {};
	if(tiddler) {
		$tw.utils.each(tiddler.fields,function(fieldValue,fieldName) {
			var fieldString = fieldName === "tags" ?
								tiddler.fields.tags :
								tiddler.getFieldString(fieldName); // Tags must be passed as an array, not a string

			if(KNOWN_FIELDS.indexOf(fieldName) !== -1) {
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
	return result;
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

const getEndpoint = ({apiEndpoint, wikiName, recipe, bag, tiddler, revision}) => {
    const bagOrRecipe = bag ? `bags/${bag}` : `recipes/${recipe || 'default'}`;
    const maybeRevision = revision ? `?revision=${revision}` : '';
    return `${apiEndpoint}${wikiName}/${bagOrRecipe}/tiddlers/${encodeURIComponent(tiddler || "")}${maybeRevision}`
}

// tiddlerID is {apiEndpoint, wiki, recipe, bag, tiddler}
const loadTiddler = (tiddlerID, token) => request(getEndpoint(tiddlerID), {}, token).then(
            data => Array.isArray(data) ? data.map(convertTiddlerFromTiddlyWebFormat) : convertTiddlerFromTiddlyWebFormat(data));

const saveTiddler = (tiddlerID, tiddler, token) => request(
        // allow tiddlerID to override bag or recipe field of tiddler
        getEndpoint(tiddlerID),
        {
            method: "PUT",
            body: Object.assign(convertTiddlerToTiddlyWebFormat(tiddler))
        },
        token);

const deleteTiddler = (tiddlerID, token) => request(
        getEndpoint(tiddlerID),
        {method: "DELETE"},
        token);

Object.assign(exports, {loadTiddler, saveTiddler, deleteTiddler});

})();
