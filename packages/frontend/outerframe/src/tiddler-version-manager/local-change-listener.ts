import { BagApi, SingleWikiNamespacedTiddler } from '@tw5-firebase/shared/src/api/bag-api';
import { TiddlerData } from '@tw5-firebase/shared/src/model/tiddler';
import { TiddlerVersionManager } from './tvm';

export class OuterFrameStoreProxy implements BagApi {
  constructor(
    private tvm:TiddlerVersionManager,
    private storeClient: BagApi) {
  }
  create(bag: string, title: string, tiddlerData: Partial<TiddlerData>):Promise<SingleWikiNamespacedTiddler> {

  }
  read(bag: string, title?: string): Promise<SingleWikiNamespacedTiddler[]> {
    throw new Error('Method not implemented.');
  }
  update(bag: string, title: string, tiddlerData: Partial<TiddlerData>, expectedRevision: string): Promise<SingleWikiNamespacedTiddler> {

  }
  del(bag: string, title: string, expectedRevision: string):Promise<boolean> {

  }
}