import { isVoid } from './is-void';

export const mapOrApply = <T, R>(fn: (arg: T) => R, input: T | T[]): R | R[] => {
  if (Array.isArray(input)) {
    return input.map(fn);
  }
  return fn(input);
};

export const maybeApply = <T, R>(fn: (arg: T) => R, input: T | undefined | null): R | undefined =>
  isVoid(input) ? undefined : fn(input!);

export const objFilter = <V>(fn: (k: string, v: V) => boolean, input: Record<string, V>): Record<string, V> =>
  Object.fromEntries(Object.entries(input).filter(([k, v]) => fn(k, v)));

export const objReduce = <V, A>(fn: (acc: A, k: string, v: V) => A, input: Record<string, V>, acc0?: A): A =>
  Object.entries(input).reduce((acc: A, [k, v]: [k: string, v: V]) => fn(acc, k, v), acc0 || ({} as A));

export const objMap = <V, O>(fn: ([k,v]:[string, V]) => [string, O], input: Record<string, V>): Record<string, O> =>
  Object.fromEntries(Object.entries(input).map(fn));

export const objBuild = <T, V>(fn: (elem:T) => [string, V], input: T[], acc0?: Record<string, V>): Record<string, V> =>
  input.reduce((acc, elem) => {
    const [k,v] = fn(elem);
    acc[k] = v;
    return acc;
  }, acc0 || {});

export const objMerge = <K extends string|number|symbol, V>(input:Record<K, V>[], acc0?: Record<K, V[]>):Record<K, V[]> => input.reduce(
  (acc, obj) => {
    Object.entries<V>(obj).forEach(([k, v]) => {
      if (!(k in acc)) {
        acc[k as K] = [];
      }
      acc[k as K].push(v);
    })
    return acc;
  },
  acc0 || {} as Record<K, V[]>
);

export const asyncMap = async <T, R = any>(list: T[], fn: (e: T) => Promise<R>) => await Promise.all(list.map(fn));

export const batchMap = async <T, R=any> (fn:(l: T[]) => Promise<R>, list:T[], batchSize = 1):Promise<R[]> => {
  const results = [];
  for (let startpos = 0; startpos < list.length; startpos += batchSize) {
    results.push(await fn(list.slice(startpos, startpos + batchSize)));
  }
  return results;
};
