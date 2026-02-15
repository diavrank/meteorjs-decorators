import 'reflect-metadata';
import { Container, ContainerAware, ContainerToken, ModuleContainer } from './container';
import { ForwardRef } from './forward-ref';
import { getInjectTokens, InjectToken } from '../decorators/inject.decorator';

export function Module(config: {
    imports?: any[];
    providers?: any[];
    controllers?: any[];
}) {
    return function (target: any) {
        // Create a container for this module
        const moduleContainer = Container.createChildContainer();
        
        // Handle imports first
        if (config.imports) {
            config.imports.forEach(importedModule => {
                // Don't instantiate modules directly, just register them
                if (importedModule.forwardRef) {
                    moduleContainer.set(importedModule.forwardRef.get(), importedModule.forwardRef.get());
                } else {
                    moduleContainer.set(importedModule, importedModule);
                }
            });
        }

        const resolveProvider = (providerClass: any) => {
            if (Container.has(providerClass)) {
                moduleContainer.set(providerClass, Container.get(providerClass));
                return;
            }
            const args = resolveArguments(providerClass, moduleContainer);
            moduleContainer.set(providerClass, new providerClass(...args));
        };

        // Then handle providers
        if (config.providers) {
            config.providers.forEach(provider => {
                if (typeof provider === 'function') {
                    resolveProvider(provider);
                } else if (provider.forwardRef) {
                    resolveProvider(provider.forwardRef.get());
                }
            });
        }

        // Handle controllers
        if (config.controllers) {
            config.controllers.forEach(controller => {
                if (typeof controller === 'function') {
                    let instance: any;
                    if (Container.has(controller)) {
                        instance = Container.get(controller);
                    } else {
                        const args = resolveArguments(controller, moduleContainer);
                        instance = new controller(...args);
                    }
                    moduleContainer.set(controller, instance);
                    (controller as ContainerAware).__container = moduleContainer;
                }
            });
        }

        // Store the container in the module class
        target.__container = moduleContainer;
    };
}

function resolveArguments(targetClass: any, container: ModuleContainer): any[] {
    const paramTypes = Reflect.getMetadata('design:paramtypes', targetClass) || [];
    const injectTokens = getInjectTokens(targetClass);

    return paramTypes.map((type: any, index: number) => {
        const token = resolveInjectionToken(type, injectTokens[index], targetClass.name, index);
        return container.get(token);
    });
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
