export const parseQueryString = (qs: string): Record<string, string> =>
  [...new URLSearchParams(qs).entries()].reduce((acc, [k, v]) => {
    acc[k] = v;
    return acc;
  }, {} as Record<string, string>);

export const toQueryString = (params: Record<string, string>):string =>
  Object.entries(params).reduce((acc, [k, v]) => {
    acc.set(k, v);
    return acc;
  }, new URLSearchParams()).toString();