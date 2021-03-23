import { TiddlerNamespace } from "../../../model/tiddler";
import { Revision } from "../../../model/revision";
import { MaybePromise, Persistence } from "./interfaces";

export class TransformingTiddlerPersistence<OuterTiddlerFormat, InnerTiddlerFormat> implements Persistence<string, Revision, OuterTiddlerFormat, TiddlerNamespace> {
  private encode: (outerTiddler: OuterTiddlerFormat) => InnerTiddlerFormat;
  private decode: (innerTiddler: InnerTiddlerFormat) => OuterTiddlerFormat;
  private backingPersistence: Persistence<string, Revision, InnerTiddlerFormat, TiddlerNamespace>;
  // 'this' must be bound, so innerToOuter is not a regular class method
  private innerToOuter: (inner:{ namespace: TiddlerNamespace, key: string, value: InnerTiddlerFormat, revision:Revision }) => { namespace: TiddlerNamespace, key: string, value: OuterTiddlerFormat, revision: Revision };

  constructor (
    encode:((outerTiddler:OuterTiddlerFormat) => InnerTiddlerFormat),
    decode:((innerTiddler:InnerTiddlerFormat) => OuterTiddlerFormat),
    backingPersistence: Persistence<string, Revision, InnerTiddlerFormat, TiddlerNamespace>
  ) {
    this.encode = encode;
    this.decode = decode;
    this.backingPersistence = backingPersistence;
    this.innerToOuter = (inner:{ namespace: TiddlerNamespace, key: string, value: InnerTiddlerFormat, revision: Revision}) => ({...inner, value: this.decode(inner.value)});
  }

  async readDocs (documentKeys: { namespace: TiddlerNamespace; key: string; }[]) : Promise<{ namespace: TiddlerNamespace; key: string; value: OuterTiddlerFormat; revision: Revision }[]> {
    return (await this.backingPersistence.readDocs(documentKeys)).map(this.innerToOuter);
  }
  async readCollections (namespaces: TiddlerNamespace[]) : Promise<{ namespace: TiddlerNamespace, key: string, value: OuterTiddlerFormat, revision:Revision }[]> {
    return (await this.backingPersistence.readCollections(namespaces)).map(this.innerToOuter);
  }
  async updateDoc (
    namespace: TiddlerNamespace,
    key: string,
    updater: (value?:OuterTiddlerFormat)=>MaybePromise<OuterTiddlerFormat|undefined>,
    expectedRevision?: string) : Promise<{namespace: TiddlerNamespace, key:string, value: OuterTiddlerFormat, revision:Revision}|undefined> {
    const innerUpdater = async (innerValue?:InnerTiddlerFormat) => {
      const originalOuter = innerValue ? this.decode(innerValue) : undefined;
      const updateResult = await Promise.resolve(updater(originalOuter));
      return updateResult ? this.encode(updateResult) : undefined;
    }
    const innerResult = await this.backingPersistence.updateDoc(
      namespace,
      key,
      innerUpdater,
      expectedRevision);
    return innerResult ? {namespace, key, revision: innerResult.revision, value: this.decode(innerResult.value)} : undefined;
  }
}