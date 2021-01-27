/*\
title: $:/plugins/neumark/gcp-storage-attachments/startup.js
type: application/javascript
module-type: startup

Startup initialisation

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";
var ENABLE_EXTERNAL_ATTACHMENTS_TITLE = "$:/config/GCPStorageAttachments/Enable",
	USE_ABSOLUTE_FOR_DESCENDENTS_TITLE = "$:/config/GCPStorageAttachments/UseAbsoluteForDescendents",
	USE_ABSOLUTE_FOR_NON_DESCENDENTS_TITLE = "$:/config/GCPStorageAttachments/UseAbsoluteForNonDescendents";

// Export name and synchronous status
exports.name = "external-attachments";
exports.platforms = ["browser"];
exports.after = ["startup"];
exports.synchronous = true;

const getUid = () => JSON.parse($tw.wiki.getTiddlerText('$:/temp/user')).uid;

const getWikiName = () => JSON.parse($tw.wiki.getTiddlerText('$:/config/WikiConfig')).wiki.wikiName;


// from: https://stackoverflow.com/a/1349426
const randomString = length => {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
};

const uploadFile = (file, type) => {
    const destination = `/wiki/${getWikiName()}/user/${getUid()}/${randomString(8)}/${file.name}`;
    // based on https://firebase.google.com/docs/storage/web/upload-files#upload_files
    const ref = firebase.storage().ref().child(destination);
    const metadata = {
        contentType: type,
        customMetadata: {
            access: 'private'
        }
    }
    // 'file' comes from the Blob or File API
    const uploadTask = ref.put(file, metadata);
    // upload monitoring based on https://firebase.google.com/docs/storage/web/upload-files#upload_files
    // Register three observers:
    // 1. 'state_changed' observer, called any time the state changes
    // 2. Error observer, called on failure
    // 3. Completion observer, called on successful completion
    uploadTask.on('state_changed',
      (snapshot) => {
        // Observe state change events such as progress, pause, and resume
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
        switch (snapshot.state) {
          case window.firebase.storage.TaskState.PAUSED: // or 'paused'
            console.log('Upload is paused');
            break;
          case window.firebase.storage.TaskState.RUNNING: // or 'running'
            console.log('Upload is running');
            break;
        }
      },
      error => {
        // Handle unsuccessful uploads
        console.error(`Error in upload: ${error.code}`, error);
      });
    return uploadTask;
};

exports.startup = function() {
	// test_makePathRelative();
	$tw.hooks.addHook("th-importing-file",function(info) {
        /* Info format:
         * {
             callback: ƒ (tiddlerFieldsArray)
             file: File {
                name: "customer_events.json",
                lastModified: 1611645240000,
                lastModifiedDate: Tue Jan 26 2021 08:14:00 GMT+0100 (Central European Standard Time),
                webkitRelativePath: "",
                size: 2, …},
             isBinary: false,
             type: "application/json"
           } */
		if(info.isBinary && $tw.wiki.getTiddlerText(ENABLE_EXTERNAL_ATTACHMENTS_TITLE,"") === "yes") {
            uploadFile(info.file, info.type).then(async snapshot => {
                const url = await snapshot.ref.getDownloadURL();
                const metadata = await snapshot.ref.getMetadata();
                info.callback([
				{
					title: info.file.name,
					type: info.type,
                    lastModified: info.file.lastModified,
                    gcpStorage: JSON.stringify(metadata), 
					"_canonical_uri": url
				}]);
            });
			return true;
		} else {
			return false;
		}
	});
};

})();
