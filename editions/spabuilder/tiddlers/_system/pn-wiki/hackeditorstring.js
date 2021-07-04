/*\
title: $:/pn-wiki/hackeditorstring.js
type: application/javascript
module-type: startup

from: https://www.woolie.co.uk/article/tiddlywiki-codemirror-vim-bindings/

\*/
(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict';

  // Export name and synchronous status
  exports.name = 'hackeditstring';
  exports.after = ['load-modules'];
  exports.synchronous = true;

  exports.startup = function () {
    if ($tw.browser)
      if (/Android|webOS|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent || navigator.vendor || window.opera)) {
        $tw.wiki.addTiddler(
          new $tw.Tiddler({ title: '$:/config/EditorTypeMappings/text/vnd.tiddlywiki', text: 'text' }),
        );
      } else {
        $tw.wiki.addTiddler(
          new $tw.Tiddler({ title: '$:/config/EditorTypeMappings/text/vnd.tiddlywiki', text: 'codemirror' }),
        );
      }
  };
})();
