import type {MiniIframeRPC} from 'mini-iframe-rpc';
import { TiddlerWithRevision } from '@tw5-firebase/shared/src/model/tiddler';
import { TW5TiddlerFields } from '@tw5-firebase/tw5-shared/src/tw5-types';
import { User } from '@tw5-firebase/shared/src/model/user';

const convertTiddler = ({tiddler: {fields, ...rest}}:TiddlerWithRevision):TW5TiddlerFields => ({
  ...rest,
  ...(fields ?? {})
});

const main = () => {
  let tiddlers:TiddlerWithRevision[] = [];
  const rpc = new (window as any)["mini-iframe-rpc"].MiniIframeRPC({
    defaultInvocationOptions: {
      retryAllFailures: false,
      timeout: 0,
      retryLimit: 0,
    },
  }) as MiniIframeRPC;
  rpc.register('saveTiddlers', (incoming:TiddlerWithRevision[]) => {
    console.log(`received ${incoming.length} tiddlers`)
    tiddlers = tiddlers.concat(incoming);
  })
  rpc.register('initWiki', ({user}:{user: User}) => {
    $tw.preloadTiddlerArray([
      {
        title: '$:/temp/user',
        ...user
      }, ...(tiddlers.map(convertTiddler))]);
    $tw.boot.boot();
  });
  rpc.invoke(window.parent, null, 'innerIframeReady');
}

window.addEventListener('load', main);
