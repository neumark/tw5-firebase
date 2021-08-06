import { TiddlerWithRevision } from '@tw5-firebase/shared/src/model/tiddler';
import { TW5TiddlerFields } from '@tw5-firebase/tw5-shared/src/tw5-types';
import { User } from '@tw5-firebase/shared/src/model/user';
import { InnerFrameAPIMethods, OuterFrameAPIMethods, makeRPC, makeAPIClient, apiDefiner } from '@tw5-firebase/frontend-shared/src/interframe'

const convertTiddler = ({tiddler: {fields, ...rest}}:TiddlerWithRevision):TW5TiddlerFields => ({
  ...rest,
  ...(fields ?? {})
});

const main = () => {
  let tiddlers:TiddlerWithRevision[] = [];
  const rpc = makeRPC();
  const def = apiDefiner<InnerFrameAPIMethods>(rpc);
  def('saveTiddlers', async (incoming:TiddlerWithRevision[]) => {
    console.log(`received ${incoming.length} tiddlers`)
    tiddlers = tiddlers.concat(incoming);
  })
  def('initWiki', async ({user}:{user: User}) => {
    $tw.preloadTiddlerArray([
      {
        title: '$:/temp/user',
        ...user
      }, ...(tiddlers.map(convertTiddler))]);
    $tw.boot.boot();
  });
  const client = makeAPIClient<OuterFrameAPIMethods>(rpc, window.parent)
  client('innerIframeReady', []);
}

window.addEventListener('load', main);
