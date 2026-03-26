import { AsyncLocalStorage } from 'async_hooks';

export const context = new AsyncLocalStorage();

export const getContext = () => context.getStore();

export const runWithContext = (data, cb) => context.run(data, cb);
