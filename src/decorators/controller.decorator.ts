import 'reflect-metadata';
import { BaseController } from '../controllers/base.controller';
import { Container, ContainerAware, ContainerToken } from '../utils/container';
import { ForwardRef } from '../utils/forward-ref';
import { getInjectTokens, InjectToken } from './inject.decorator';

export function Controller() {
    return function (constructor: new (...args: any[]) => any & ContainerAware) {
        const methods = constructor.prototype.__methods || [];

        // Get the constructor parameters
        const paramTypes = Reflect.getMetadata('design:paramtypes', constructor) || [];
        const injectTokens = getInjectTokens(constructor);
        
        // Create a factory function that will create instances with dependencies (services)
        const factory = () => {
            const args = paramTypes.map((type: any, index: number) => {
                // Get the module's container from the prototype chain
                let current: typeof constructor & ContainerAware = constructor;
                while (current && !current.__container) {
                    current = Object.getPrototypeOf(current);
                }
                const container = current?.__container || Container;
                const injectionToken = resolveInjectionToken(type, injectTokens[index], constructor.name, index);
                return container.get(injectionToken);
            });
            return new constructor(...args);
        };

        // Register the controller in the container
        let current: typeof constructor & ContainerAware = constructor;
        while (current && !current.__container) {
            current = Object.getPrototypeOf(current);
        }
        const container = current?.__container || Container;
        container.register(constructor, factory);

        methods.forEach(({ name, method }: { name: string; method: Function }) => {
            console.log('registering method: ', name);
            Meteor.methods({
                [name]: function (...args: any[]) {
                    // Get the instance from the container
                    let current: typeof constructor & ContainerAware = constructor;
                    while (current && !current.__container) {
                        current = Object.getPrototypeOf(current);
                    }
                    const container = current?.__container || Container;
                    const instance = container.get(constructor) as BaseController;
                    // Merge the Meteor method context into the instance
                    instance.__context = this; // __context now is the meteor context for methods

                    // Call the method with the merged context
                    return method.apply(instance, args);
                },
            });
        });
    };
}

function resolveInjectionToken(
    reflectedType: any,
    customToken: InjectToken | undefined,
    targetName: string,
    index: number
): ContainerToken {
    if (customToken) {
        return unwrapToken(customToken);
    }
    if (!reflectedType) {
        throw new Error(
            `Cannot resolve dependency for ${targetName}. Parameter at index ${index} is undefined. ` +
            'Consider using @Inject with forwardRef to resolve circular dependencies.'
        );
    }
    return reflectedType;
}

function unwrapToken(token: InjectToken): ContainerToken {
    if (typeof token === 'string') {
        return token;
    }
    if (token instanceof ForwardRef) {
        return token.get();
    }
    return token();
}
