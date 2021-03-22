import { Revision, TiddlerNamespace } from "../../../model/tiddler";
import { MaybePromise, Persistence } from "./interfaces";

const postIdentity = <T> (_pre:T, post:T)=>post;

export class TransformingTiddlerPersistence<OuterTiddlerFormat, InnerTiddlerFormat> implements Persistence<string, Revision, OuterTiddlerFormat, TiddlerNamespace> {
  private encode: (outerTiddler: OuterTiddlerFormat) => InnerTiddlerFormat;
  private decode: (innerTiddler: InnerTiddlerFormat) => OuterTiddlerFormat;
  private backingPersistence: Persistence<string, Revision, InnerTiddlerFormat, TiddlerNamespace>;
  // 'this' must be bound, so innerToOuter is not a regular class method
  private innerToOuter: (inner:{ namespace: TiddlerNamespace, key: string, value: InnerTiddlerFormat, revision:Revision }) => { namespace: TiddlerNamespace, key: string, value: OuterTiddlerFormat, revision: Revision };
  private postUpdater: (pre?:OuterTiddlerFormat, post?:OuterTiddlerFormat) => MaybePromise<OuterTiddlerFormat | undefined>;

  constructor (
    encode:((outerTiddler:OuterTiddlerFormat) => InnerTiddlerFormat),
    decode:((innerTiddler:InnerTiddlerFormat) => OuterTiddlerFormat),
    backingPersistence: Persistence<string, Revision, InnerTiddlerFormat, TiddlerNamespace>,
    postUpdater:((pre?:OuterTiddlerFormat, post?:OuterTiddlerFormat)=>MaybePromise<OuterTiddlerFormat|undefined>)=postIdentity
  ) {
    this.encode = encode;
    this.decode = decode;
    this.backingPersistence = backingPersistence;
    this.postUpdater = postUpdater;
    this.innerToOuter = (inner:{ namespace: TiddlerNamespace, key: string, value: InnerTiddlerFormat, revision: Revision}) => ({...inner, value: this.decode(inner.value)});
  }

  async readDocs (documentKeys: { namespace: TiddlerNamespace; key: string; }[]) : Promise<{ namespace: TiddlerNamespace; key: string; value: OuterTiddlerFormat; revision: Revision }[]> {
    return (await this.backingPersistence.readDocs(documentKeys)).map(this.innerToOuter);
  }
  async readCollections (namespaces: TiddlerNamespace[]) : Promise<{ namespace: TiddlerNamespace, key: string, value: OuterTiddlerFormat, revision:Revision }[]> {
    return (await this.backingPersistence.readCollections(namespaces)).map(this.innerToOuter);
  }
  async updateDoc (namespace: TiddlerNamespace, documentKey: string, updater: (value?:OuterTiddlerFormat)=>MaybePromise<OuterTiddlerFormat|undefined>, expectedRevision?: string) : Promise<{value: OuterTiddlerFormat, revision:Revision}|undefined> {
    const innerUpdater = async (innerValue?:InnerTiddlerFormat) => {
      const originalOuter = innerValue ? this.decode(innerValue) : undefined;
      const updatedOuter = await Promise.resolve(updater(originalOuter));
      const finalOuter = await Promise.resolve(this.postUpdater(originalOuter, updatedOuter));
      return finalOuter ? this.encode(finalOuter) : undefined;
    }
    const innerResult = await this.backingPersistence.updateDoc(
      namespace,
      documentKey,
      innerUpdater,
      expectedRevision);
    return innerResult ? {revision: innerResult.revision, value: this.decode(innerResult.value)} : undefined;
  }
}