export const log = (target: Object, key: string | symbol, descriptor: TypedPropertyDescriptor<Function>) => {
    return {
        value: (... args: any[]) => {
            console.log('Arguments: ', args.join(', '));
            const result = descriptor.value.apply(target, args);
            console.log('Result: ', result);
            return result;
        }
    };
};