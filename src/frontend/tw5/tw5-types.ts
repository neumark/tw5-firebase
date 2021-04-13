import { HTTPMethod } from "../../shared/apiclient/http-transport";
import { Revision } from "../../shared/model/revision";
import { Tiddler } from "../../shared/model/tiddler";

// Minimal typings for TW5, lots of stuff is missing (intentionally).

export type CallbackFn = (err:any, ...data:any[]) => void;

// standard tiddler definition, but every field except title is optional, allowing any custom field
export type TW5TiddlerFields = {title: string} & Partial<Omit<Tiddler, 'fields'>> & {[fieldName:string]:any};

export interface TW5Tiddler {
  fields: TW5TiddlerFields;
  /* tiddler methods
  getFieldDay: ƒ (field)
  getFieldList: ƒ (field)
  getFieldString: ƒ (field)
  getFieldStringBlock: ƒ (options)
  getFieldStrings: ƒ (options)
  hasField: ƒ (field)
  hasTag: ƒ (tag)
  isDraft: ƒ ()
  isEqual: ƒ (tiddler,excludeFields)
  isPlugin: ƒ ()
  */
}

export declare class Widget {
  constructor(greeting: string);
  greeting: string;
  showGreeting(): void;
}

export interface TW5Wiki {
  tiddlerExists: (title:string) => boolean;
  getTiddlerText: (title:string) => string|undefined;
  getTiddler: (title:string) => TW5Tiddler | undefined;
}

export interface TW5SyncAdaptorTiddlerInfo {
  bag?: string
}

export interface TW5SyncAdaptor {
  name?: string,
  supportsLazyLoading?: boolean,
  setLoggerSaveBuffer?: (buffer:any)=>void;
  isReady: () => boolean;
  getTiddlerInfo: (tiddler:TW5Tiddler)=>TW5SyncAdaptorTiddlerInfo|undefined;
  getTiddlerRevision: (title:string)=>Revision|undefined;
  getStatus: (callback:CallbackFn)=>void;
  // login, logout not used
  saveTiddler: (tiddler:TW5Tiddler, callback:CallbackFn)=>void;
  loadTiddler: (title:string, callback:CallbackFn)=>void;
  deleteTiddler: (title:string, callback: CallbackFn, options: {
      tiddlerInfo: {
        adaptorInfo: TW5SyncAdaptorTiddlerInfo
      }
  })=>void;
}

export interface TW5Logger {
  setSaveBuffer: (buffer:any) => void;
  log: (message:string, ...data:any[]) => void;
}


export interface TW5LoggerConstructor {
  new (loggerName?:string): TW5Logger;
}

export interface TW5TiddlerConstructor {
  new (...fields:TW5Tiddler['fields'][]):TW5Tiddler;
}

export interface TW5Translator {
    getString: (label:string) => string;
}

export interface TW {
  utils: {
    // defined in tiddlywiki/core/modules/utils/dom/http.js
    httpRequest: (options:Partial<{
      type: HTTPMethod,
      url: string,
      headers: {[key:string]:string},
      data:string,
      callback:CallbackFn}>)=>void;
    Logger: TW5LoggerConstructor;
    error :(message:string)=>void;
  },
  boot: {
    boot: () => void;
  }
  wiki: TW5Wiki,
  Tiddler: TW5TiddlerConstructor,
  preloadTiddlerArray: (tiddlerFields:TW5TiddlerFields[])=>void;
  language?: TW5Translator
}

declare global {
  const $tw:TW;
}