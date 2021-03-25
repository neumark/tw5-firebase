export type HTTPMethod = 'GET' | 'PUT' | 'DELETE';

export interface Transport {
  request : (url:string, authToken:string, body?:any, method?:HTTPMethod) => Promise<any>;
}