import { objMap } from './map';

export const replaceTemplateVars = (template: string, data: Record<string, string>) =>
  Object.entries(data).reduce(
    // note this little JS gem: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
    (acc, [key, value]) => acc.replace(new RegExp(`:${key}\\??`, 'g'), () => value),
    template,
  );

export const replaceUrlEncoded = (template: string, data: Record<string, string>) =>
  replaceTemplateVars(
    template,
    objMap(([k, v]) => [k, encodeURIComponent(v)], data),
  );
