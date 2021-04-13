import { BoundTiddlerStore, getExpectedRevision, getTiddlerData, SingleWikiNamespacedTiddler, TiddlerUpdateOrCreate } from "../model/store";
import { HTTPNamespacedTiddler } from "../model/tiddler";
import { mapOrApply } from "../util/map";
import { HTTPAPIRequest, HTTPTransport } from "./http-transport";

const fromHTTPNamespacedTiddler = (namespacedTiddler:HTTPNamespacedTiddler):SingleWikiNamespacedTiddler => ({
  bag: namespacedTiddler.bag,
  revision: namespacedTiddler.revision,
  tiddler: {
    ...namespacedTiddler.tiddler,
    modified: new Date(namespacedTiddler.tiddler.modified),
    created: new Date(namespacedTiddler.tiddler.created)
  }
});

export class HTTPStoreClient implements BoundTiddlerStore {
  private wiki:string;
  private httpTransport: HTTPTransport;

  private getWriteRequest(collectionType:string, collectionName:string, key:string, updateOrCreate: TiddlerUpdateOrCreate):HTTPAPIRequest {
    let urlPath = `${this.wiki}/${collectionType}s/${collectionName}/tiddlers/${encodeURIComponent(key)}`;
    const expectedRevision = getExpectedRevision(updateOrCreate);
    if (expectedRevision) {
      urlPath += `/revisions/${expectedRevision}`;
    }
    return {
      urlPath,
      method: 'PUT',
      body: getTiddlerData(updateOrCreate)
    };
  }

  private getReadRequest(collectionType:string, collectionName:string, key?:string):HTTPAPIRequest {
    let urlPath = `${this.wiki}/${collectionType}s/${collectionName}/tiddlers/`;
    if (key) {
      urlPath += encodeURIComponent(key);
    }
    return {
      urlPath,
      method: 'GET'
    };
  }

  constructor(wiki:string, httpTransport: HTTPTransport) {
    this.wiki = wiki;
    this.httpTransport = httpTransport;
  }
  removeFromBag (bag: string, key: string, expectedRevision: string | undefined): Promise<boolean> {
    return this.httpTransport.request({
      urlPath: `/${this.wiki}/bags/${bag}/tiddlers/${key}/revisions/${expectedRevision}`,
      method: 'DELETE'
    });
  }
  async writeToRecipe (recipe: string, key: string, updateOrCreate: TiddlerUpdateOrCreate) : Promise<SingleWikiNamespacedTiddler> {
    return fromHTTPNamespacedTiddler(await this.httpTransport.request(this.getWriteRequest('recipe', recipe, key, updateOrCreate)));
  }
  async writeToBag (bag: string, key: string, updateOrCreate: TiddlerUpdateOrCreate) : Promise<SingleWikiNamespacedTiddler> {
    return fromHTTPNamespacedTiddler( await this.httpTransport.request(this.getWriteRequest('bag', bag, key, updateOrCreate)));
  }
  async readFromRecipe (recipe: string, key?: string | undefined): Promise<SingleWikiNamespacedTiddler | SingleWikiNamespacedTiddler[]> {
    return mapOrApply(fromHTTPNamespacedTiddler, await this.httpTransport.request(this.getReadRequest('recipe', recipe, key)));
  }
  async readFromBag(bag: string, key?: string): Promise<SingleWikiNamespacedTiddler | SingleWikiNamespacedTiddler[]> {
    return mapOrApply(fromHTTPNamespacedTiddler, await this.httpTransport.request(this.getReadRequest('bag', bag, key)));
  }
}