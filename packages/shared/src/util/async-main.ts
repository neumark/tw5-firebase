export const asyncMainWrapper = <T>(callingModule: NodeModule, asyncMain: () => Promise<T>) => {
  if (require.main === callingModule) {
    asyncMain().then(
      // no op on success
      x => x,
      // set error code on exception
      (err) => {
        process.exitCode = 1;
        console.error(err.stack);
      });
  }
};