import { Schema } from 'ajv';
import { inject, injectable } from 'inversify';
import { JSON_TIDDLER_TYPE } from '../../../constants';
import { Revision } from '../../../shared/model/revision';
import { TiddlerNamespace } from '../../../shared/model/tiddler';
import { User } from '../../../shared/model/user';
import { Component } from '../ioc/components';
import { TiddlerFactory } from '../tiddler-factory';
import { getValidator } from '../validator';
import { TiddlerPersistence } from './interfaces';

export class TiddlerValidator<T> {
    private validator: ReturnType<typeof getValidator>;
    private tiddlerFactory: TiddlerFactory;

    private validate(namespace: TiddlerNamespace, title: string, value?: T, phase?: string): T | undefined {
        const validation = this.validator(value);
        if (!validation.valid) {
            throw new Error(
                `${phase ? phase + ': ' : ''}tiddler ${JSON.stringify({
                    title,
                    ...namespace,
                })} text does not conform to schema. Errors: ${JSON.stringify(validation.errors)}`,
            );
        }
        return value;
    }

    constructor(schema: Schema, tiddlerFactory: TiddlerFactory) {
        this.validator = getValidator(schema);
        this.tiddlerFactory = tiddlerFactory;
    }

    async read(
        persistence: TiddlerPersistence,
        tiddlers: Array<{ namespace: TiddlerNamespace; title: string; fallbackValue?: T }>,
    ): Promise<Array<{ namespace: TiddlerNamespace; title: string; value: T | undefined }>> {
        const docs = await persistence.readTiddlers(tiddlers);
        return tiddlers.map(({ namespace, title, fallbackValue }) => {
            let value = fallbackValue;
            const doc = docs.find((doc) => {
                doc.namespace.wiki === namespace.wiki &&
                    doc.namespace.bag === namespace.bag &&
                    doc.tiddler.title === title;
            });
            if (doc && doc.tiddler.text) {
                value = JSON.parse(doc.tiddler.text) as T;
                this.validate(namespace, title, value);
            }
            return { namespace, title, value };
        });
    }

    async write(
        persistence: TiddlerPersistence,
        user: User,
        tiddlers: Array<{ namespace: TiddlerNamespace; title: string; data: T; revision: Revision }>,
    ): Promise<void> {
        await Promise.all(
            tiddlers.map(async ({ namespace, title, data, revision }) =>
                persistence.createTiddler(
                    namespace,
                    this.tiddlerFactory.createTiddler(user, title, JSON_TIDDLER_TYPE, {
                        text: JSON.stringify(this.validate(namespace, title, data)),
                    }),
                    revision,
                ),
            ),
        );
    }
}

@injectable()
export class TiddlerValidatorFactory {
    private tiddlerFactory: TiddlerFactory;
    constructor(@inject(Component.TiddlerFactory) tidderFactory: TiddlerFactory) {
        this.tiddlerFactory = tidderFactory;
    }

    getValidator<T>(schema: Schema): TiddlerValidator<T> {
        return new TiddlerValidator<T>(schema, this.tiddlerFactory);
    }
}
