import { HTTPAPIRequest, HTTPTransport, NetworkError } from "../../shared/apiclient/http-transport";

export class FetchHTTPTransport implements HTTPTransport {
  private urlPrefix: string;
  private getApiToken: () => Promise<string>;

  constructor(urlPrefix: string, getApiToken: () => Promise<string>) {
    this.urlPrefix = urlPrefix;
    this.getApiToken = getApiToken;
  }

  async request (httpApiRequest: HTTPAPIRequest): Promise<any> {
    const { urlPath, body, method } = httpApiRequest;
    const headers:{[key:string]:string} = {}
    if (body) {
      headers["Content-Type"] = "application/json";
    }
    const authToken = await this.getApiToken();
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const response = await fetch(
      this.urlPrefix + urlPath,
      {headers, method, body}
    )
    const responseBody = await response.json();
    if (response.status < 200 || response.status > 299) {
      throw new NetworkError({message: responseBody.message || response.statusText, statusCode: response.status, apiRequest: httpApiRequest});
    }
    return responseBody;
  }
}