import { Schema } from "ajv";
import { inject, injectable } from "inversify";
import { JSON_TIDDLER_TYPE } from "src/constants";
import { Tiddler, TiddlerNamespace } from "src/model/tiddler";
import { User } from "src/model/user";
import { Component } from "../ioc/components";
import { TiddlerFactory } from "../tiddler-factory";
import { getValidator } from "../validator";
import { MaybePromise, StandardTiddlerPersistence } from "./interfaces";

export class TiddlerValidator<T> {
  private validator: ReturnType<typeof getValidator>;
  private tiddlerFactory: TiddlerFactory;

  private validate(namespace:TiddlerNamespace, key:string, value?:T, phase?:string):T|undefined {
    const validation = this.validator(value)
    if (!validation.valid) {
      throw new Error(`${phase ? phase + ': ' : ''}tiddler ${JSON.stringify({key, ...namespace})} text does not conform to schema. Errors: ${JSON.stringify(validation.errors)}`);
    }
    return value;
  }

  constructor(schema:Schema, tiddlerFactory:TiddlerFactory) {
    this.validator = getValidator(schema);
    this.tiddlerFactory = tiddlerFactory;
  }

  async read(persistence:StandardTiddlerPersistence, tiddlers:Array<{namespace:TiddlerNamespace, key:string, fallbackValue?:T}>):Promise<Array<{namespace:TiddlerNamespace, key:string, value:T|undefined}>> {
    const docs = await persistence.readDocs(tiddlers);
    return tiddlers.map(({namespace, key, fallbackValue})=> {
      let value = fallbackValue;
      const doc = docs.find(doc => {
        doc.namespace.wiki === namespace.wiki &&
        doc.namespace.bag === namespace.bag &&
        doc.key === key;
      })
      if (doc && doc.value.text) {
        value = JSON.parse(doc.value.text) as T;
        this.validate(namespace, key, value);
      }
      return {namespace, key, value};
    });
  }

  async update(user:User, persistence:StandardTiddlerPersistence, namespace:TiddlerNamespace, key:string, updater:((originalValue?:T)=>MaybePromise<T>), fallbackValue?:T):Promise<void> {
    await persistence.updateDoc(
      namespace,
      key,
      async (tiddler?:Tiddler):Promise<Tiddler> => {
        let originalValue = fallbackValue;
        if (tiddler && tiddler.text) {
          originalValue = this.validate(namespace, key, JSON.parse(tiddler.text) as T, 'PRE-UPDATE');
        }
        const updatedValue = this.validate(namespace, key, await Promise.resolve(updater(originalValue)), 'POST-UPDATE');
        let outputTiddler:Tiddler;
        if (tiddler) {
          outputTiddler = {...tiddler, text: JSON.stringify(updatedValue)}
        } else {
          outputTiddler = this.tiddlerFactory.createTiddler(user, key, JSON_TIDDLER_TYPE);
          outputTiddler.text = JSON.stringify(updatedValue);
        }
        return outputTiddler;
      }
    )
  }
}

@injectable()
export class TiddlerValidatorFactory {
  private tiddlerFactory: TiddlerFactory;
  constructor(
    @inject(Component.TiddlerFactory) tidderFactory:TiddlerFactory
  ) {
    this.tiddlerFactory = tidderFactory;
  }

  getValidator<T> (schema:Schema):TiddlerValidator<T> {
    return new TiddlerValidator<T>(schema, this.tiddlerFactory);
  }
}