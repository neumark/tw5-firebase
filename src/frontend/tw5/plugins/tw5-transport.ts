import { HTTPAPIRequest, HTTPTransport, NetworkError } from '../../../shared/apiclient/http-transport';
import { isVoid } from '../../../shared/util/is-void';
import { maybeApply } from '../../../shared/util/map';
import {} from '../tw5-types';

export class TW5Transport implements HTTPTransport {
  private urlPrefix: string;
  private getApiToken: () => Promise<string>;

  constructor(urlPrefix: string, getApiToken: () => Promise<string>) {
    this.urlPrefix = urlPrefix;
    this.getApiToken = getApiToken;
  }
  async request(apiRequest: HTTPAPIRequest): Promise<any> {
    const { urlPath, body, method } = apiRequest;
    const headers: { [key: string]: string } = {};
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    const authToken = await this.getApiToken();
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    let type = method;
    if (type === undefined) {
      type = body ? 'PUT' : 'GET';
    }
    return new Promise((resolve, reject) => {
      $tw.utils.httpRequest({
        url: this.urlPrefix + urlPath,
        type,
        data: maybeApply(JSON.stringify, body),
        headers,
        callback: (err?: any, ...data: any[]) => {
          if (err) {
            reject(
              new NetworkError({
                message: `${data[1].statusCode}: ${data[1].statusText}`,
                apiRequest,
                statusCode: data[1].status,
              }),
            );
          }
          try {
            if (data.length < 1 || isVoid(data[0])) {
              throw new Error('TW5Transport received no body in HTTP response');
            }
            resolve(JSON.parse(data[0]));
          } catch (e) {
            reject(
              new NetworkError({
                message: e.message,
                apiRequest,
              }),
            );
          }
        },
      });
    });
  }
}
