/*\
title: $:/config/th-make-tiddler-path.js
type: application/javascript
module-type: startup

Startup initialisation

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "export file path";
exports.platforms = ["node"];
exports.after = ["startup"];
exports.synchronous = true;

exports.startup = function() {
  $tw.hooks.addHook("th-make-tiddler-path", function(currentPath, originalPath) {
    var sanitized_path = currentPath.replace(/[^\w\/\.]+/gi, ' ').trim().replace(/\s+/gi, '-');
    return sanitized_path; 
  });
};

})();
