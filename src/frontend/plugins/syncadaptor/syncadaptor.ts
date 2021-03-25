import { TW } from "../tw5-types";
declare var $tw:TW;

export const identity = (x:number) => {
  console.log($tw.utils.httpRequest);
  return x;
};
