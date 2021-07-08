// from: https://stackoverflow.com/a/39419171
export const assertUnreachable = (x: never): never => {
  throw new Error("Didn't expect to get here");
}
