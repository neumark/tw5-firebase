import type {MiniIframeRPC} from 'mini-iframe-rpc';
import { TiddlerWithRevision } from '@tw5-firebase/shared/src/model/tiddler';

const main = () => {
  let tiddlers:TiddlerWithRevision[] = [];
  const rpc = new (window as any)["mini-iframe-rpc"].MiniIframeRPC({
    defaultInvocationOptions: {
      retryAllFailures: false,
      timeout: 0,
      retryLimit: 0,
    },
  }) as MiniIframeRPC;
  const initWiki = (...args:any[]) => {
    console.log(tiddlers);
  }
  rpc.register('saveTiddlers', (incoming:TiddlerWithRevision[]) => {
    console.log(`received ${incoming.length} tiddlers`)
    tiddlers = tiddlers.concat(incoming);
  })
  rpc.register('initWiki', initWiki);
  rpc.invoke(window.parent, null, 'innerIframeReady');
}

window.addEventListener('load', main);
