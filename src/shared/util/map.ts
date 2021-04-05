export const mapOrApply = <T, R>(fn: (arg:T)=>R, input:T|T[]):R|R[] => {
  if (Array.isArray(input)) {
    return input.map(fn);
  }
  return fn(input);
}