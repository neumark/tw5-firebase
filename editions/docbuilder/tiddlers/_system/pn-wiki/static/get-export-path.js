/*\
title: $:/pn-wiki/static/get-export-path.js
type: application/javascript
module-type: macro

\*/

(function(){
"use strict";

exports.name = "tv-get-export-path";

exports.params = [
    {title: ""}
];

/*
Run the macro
*/
exports.run = function(title) {                   
    // convert to space first, then trim, then kebabize, then lowercase
    var sanitized_title = title.replace(/([^a-z0-9_-]+)/gi, ' ').trim().replace(/ /gi, '-').toLocaleLowerCase();    
    return sanitized_title;    
}
})();
