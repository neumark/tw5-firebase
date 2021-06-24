// from: https://stackoverflow.com/a/55032655
export type Modify<T, R> = Omit<T, keyof R> & R;

export type MaybeArray<T> = T | T[];

export type ObjectOf<T> = { [key: string]: T };
