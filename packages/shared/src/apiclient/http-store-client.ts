import { BagApi, SingleWikiNamespacedTiddler } from '../api/bag-api';
import { HTTPNamespacedTiddler, PartialTiddlerData, TiddlerData } from '../model/tiddler';
import { mapOrApply } from '../util/map';
import { HTTPAPIRequest, HTTPTransport } from './http-transport';

const fromHTTPNamespacedTiddler = (namespacedTiddler: HTTPNamespacedTiddler): SingleWikiNamespacedTiddler => ({
  bag: namespacedTiddler.bag,
  revision: namespacedTiddler.revision,
  tiddler: {
    ...namespacedTiddler.tiddler,
    modified: new Date(namespacedTiddler.tiddler.modified),
    created: new Date(namespacedTiddler.tiddler.created),
  },
});

export class HTTPStoreClient implements BagApi {
  private wiki: string;
  private httpTransport: HTTPTransport;

  private getWriteRequest(
    collectionType: string,
    collectionName: string,
    title: string,
    tiddler: PartialTiddlerData,
    expectedRevision?: string,
  ): HTTPAPIRequest {
    let urlPath = `${encodeURIComponent(this.wiki)}/${collectionType}s/${encodeURIComponent(
      collectionName,
    )}/tiddlers/${encodeURIComponent(title)}`;
    if (expectedRevision) {
      urlPath += `/revisions/${expectedRevision}`;
    }
    return {
      urlPath,
      method: 'PUT',
      body: tiddler,
    };
  }

  private getReadRequest(collectionType: string, collectionName: string, title?: string): HTTPAPIRequest {
    let urlPath = `${encodeURIComponent(this.wiki)}/${collectionType}s/${encodeURIComponent(collectionName)}/tiddlers/`;
    if (title) {
      urlPath += encodeURIComponent(title);
    }
    return {
      urlPath,
      method: 'GET',
    };
  }

  constructor(wiki: string, httpTransport: HTTPTransport) {
    this.wiki = wiki;
    this.httpTransport = httpTransport;
  }
  async create(bag: string, title: string, tiddlerData: PartialTiddlerData): Promise<SingleWikiNamespacedTiddler> {
    return fromHTTPNamespacedTiddler(
      await this.httpTransport.request(this.getWriteRequest('bag', bag, title, tiddlerData)),
    );
  }
  async update(
    bag: string,
    title: string,
    tiddlerData: PartialTiddlerData,
    expectedRevision: string,
  ): Promise<SingleWikiNamespacedTiddler> {
    return fromHTTPNamespacedTiddler(
      await this.httpTransport.request(this.getWriteRequest('bag', bag, title, tiddlerData, expectedRevision)),
    );
  }
  async createInRecipe(
    recipe: string,
    title: string,
    tiddlerData: Partial<TiddlerData>,
  ): Promise<SingleWikiNamespacedTiddler> {
    return fromHTTPNamespacedTiddler(
      await this.httpTransport.request(this.getWriteRequest('recipe', recipe, title, tiddlerData)),
    );
  }
  async del(bag: string, key: string, expectedRevision: string): Promise<boolean> {
    return this.httpTransport.request({
      urlPath: `${encodeURIComponent(this.wiki)}/bags/${encodeURIComponent(bag)}/tiddlers/${encodeURIComponent(
        key,
      )}/revisions/${encodeURIComponent(expectedRevision)}`,
      method: 'DELETE',
    });
  }
  async readFromRecipe(
    recipe: string,
    key?: string | undefined,
  ): Promise<SingleWikiNamespacedTiddler | SingleWikiNamespacedTiddler[]> {
    return mapOrApply(
      fromHTTPNamespacedTiddler,
      await this.httpTransport.request(this.getReadRequest('recipe', recipe, key)),
    );
  }
  async read(bag: string, key?: string): Promise<SingleWikiNamespacedTiddler | SingleWikiNamespacedTiddler[]> {
    return mapOrApply(
      fromHTTPNamespacedTiddler,
      await this.httpTransport.request(this.getReadRequest('bag', bag, key)),
    );
  }
}
