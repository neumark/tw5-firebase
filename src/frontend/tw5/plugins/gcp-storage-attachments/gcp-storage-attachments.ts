import firebase from 'firebase';
import { maybeApply } from '../../../../shared/util/map';
import { TW5ImportFileInfo } from '../../tw5-types';

const ENABLE_EXTERNAL_ATTACHMENTS_TITLE = '$:/config/GCPStorageAttachments/Enable';
const MAX_SIZE = 1048487; // max size of firestore document field in bytes, according to https://firebase.google.com/docs/firestore/quotas#collections_documents_and_fields

// Export name and synchronous status
export const name = 'external-attachments';
export const platforms = ['browser'];
export const after = ['startup'];
export const synchronous = true;

const getUid = () => $tw.wiki.getTiddler('$:/temp/user')?.fields.uid;

const getWikiName = () =>
    maybeApply((str: string) => JSON.parse(str), $tw.wiki.getTiddlerText('$:/config/WikiConfig'))?.wiki?.wikiName;

// from: https://stackoverflow.com/a/1349426
const randomString = (length: number) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

const uploadFile = (file: File, type: string) => {
    const secret = randomString(16);
    const destination = `/wiki/${getWikiName()}/user/${getUid()}/${secret}/${file.name}`;
    // based on https://firebase.google.com/docs/storage/web/upload-files#upload_files
    const ref = firebase.storage().ref().child(destination);
    const metadata = { contentType: type };
    // 'file' comes from the Blob or File API
    const uploadTask = ref.put(file, metadata);
    // upload monitoring based on https://firebase.google.com/docs/storage/web/upload-files#upload_files
    // Register three observers:
    // 1. 'state_changed' observer, called any time the state changes
    // 2. Error observer, called on failure
    // 3. Completion observer, called on successful completion
    uploadTask.on(
        'state_changed',
        (snapshot) => {
            // Observe state change events such as progress, pause, and resume
            // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
            switch (snapshot.state) {
                case firebase.storage.TaskState.PAUSED: // or 'paused'
                    console.log('Upload is paused');
                    break;
                case firebase.storage.TaskState.RUNNING: // or 'running'
                    console.log('Upload is running');
                    break;
            }
        },
        (error) => {
            // Handle unsuccessful uploads
            console.error(`Error in upload: ${error.code}`, error);
        },
    );
    return uploadTask;
};

const shouldUploadToStorage = (info: TW5ImportFileInfo) =>
    $tw.wiki.getTiddlerText(ENABLE_EXTERNAL_ATTACHMENTS_TITLE, '') === 'yes' &&
    (info.isBinary || info.file.size > MAX_SIZE);

const getURL = (metadata: any) =>
    `https://firebasestorage.googleapis.com/v0/b/${metadata.bucket}/o/${encodeURIComponent(
        metadata.fullPath,
    )}?alt=media`;

export const startup = function () {
    // test_makePathRelative();
    $tw.hooks.addHook('th-importing-file', (info: TW5ImportFileInfo) => {
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
        if (shouldUploadToStorage(info)) {
            uploadFile(info.file, info.type).then(async (snapshot) => {
                const metadata = await snapshot.ref.getMetadata();
                // We don't need the download token since storage rules allow reads to anyone.
                // Don't use ref.getDownloadURL() to avoid the 'token' parameter in the URL.
                const url = getURL(metadata);
                info.callback([
                    {
                        title: info.file.name,
                        type: info.type,
                        tags: ['gcpStorage'],
                        lastModified: String(info.file.lastModified),
                        gcpStorageSize: String(metadata.size),
                        gcpStorageBucket: metadata.bucket,
                        gcpStorageFullPath: metadata.fullPath,
                        _canonical_uri: url,
                    },
                ]);
            });
            return true;
        } else {
            return false;
        }
    });
};
