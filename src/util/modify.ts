// from: https://stackoverflow.com/a/55032655
export type Modify<T, R> = Omit<T, keyof R> & R;