import { HTTPMethod } from "../../shared/apiclient/transport";

type CallbackFn = (err:any, ...data:any) => void;

export interface TW {
  utils: {
    // defined in tiddlywiki/core/modules/utils/dom/http.js
    httpRequest: (options:Partial<{
      type: HTTPMethod,
      url: string,
      headers: {[key:string]:string},
      data:string,
      callback:CallbackFn}>)=>void;
  }
}