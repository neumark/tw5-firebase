import { isVoid } from './is-void';

export const mapOrApply = <T, R>(fn: (arg: T) => R, input: T | T[]): R | R[] => {
  if (Array.isArray(input)) {
    return input.map(fn);
  }
  return fn(input);
};

export const maybeApply = <T, R>(fn: (arg: T) => R, input: T | undefined | null): R | undefined =>
  isVoid(input) ? undefined : fn(input!);

export const objFilter = <V>(fn: (k: string, v: V) => boolean, input: { [key: string]: V }): { [key: string]: V } =>
  Object.fromEntries(Object.entries(input).filter(([k, v]) => fn(k, v)));

export const objReduce = <V, A>(fn: (acc: A, k: string, v: V) => A, input: { [key: string]: V }, acc0?: A): A =>
  Object.entries(input).reduce((acc: A, [k, v]: [k: string, v: V]) => fn(acc, k, v), acc0 || ({} as A));

export const asyncMap = async <T, R = any>(list: T[], fn: (e: T) => Promise<R>) => await Promise.all(list.map(fn));
