import type { CreateIndexesOptions, IndexSpecification } from 'mongodb';
import { type EntityConstructor } from '../entities/base.entity';

type IndexMetadata = {
    indexSpec: IndexSpecification;
    options?: CreateIndexesOptions;
};

const indexMetadata = new WeakMap<Function, IndexMetadata[]>();

export function Index(indexSpec: IndexSpecification,
    options?: CreateIndexesOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const constructor = target.constructor as Function;
        const indexes = indexMetadata.get(constructor) ?? [];
        indexes.push({ indexSpec, options });
        indexMetadata.set(constructor, indexes);
    };
}

export function Entity(
    collectionName: string,
    collectionObject?: Mongo.Collection<any>
): ClassDecorator {
    return (target: Function) => {
        const constructor = target as EntityConstructor<any>;
        const collection = collectionObject ?? new Mongo.Collection(collectionName);
        constructor.collection = collection as Mongo.Collection<any>;

        const indexes = indexMetadata.get(constructor) ?? [];
        if (Meteor.isServer && indexes.length) {
            const rawCollection = constructor.collection.rawCollection();
            indexes.forEach(({ indexSpec, options }) => {
                void rawCollection.createIndex(indexSpec, options);
            });
        }
    };
}
