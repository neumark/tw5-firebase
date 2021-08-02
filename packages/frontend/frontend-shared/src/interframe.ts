import { TiddlerWithRevision } from '@tw5-firebase/shared/src/model/tiddler';
import { User } from '@tw5-firebase/shared/src/model/user';
import type { MiniIframeRPC } from 'mini-iframe-rpc';
import { BagApi } from '../../../shared/src/api/bag-api';

export const makeRPC = () => new (window as any)["mini-iframe-rpc"].MiniIframeRPC({
  defaultInvocationOptions: {
    retryAllFailures: false,
    timeout: 0,
    retryLimit: 0,
  },
}) as MiniIframeRPC;

export interface InnerFrameAPIMethods {
  saveTiddlers: (incoming: TiddlerWithRevision[]) => Promise<void>;
  initWiki: ({ user }: { user: User }) => Promise<void>;
  test: (a: string, b: string) => Promise<number>;
}

export interface OuterFrameAPIMethods extends Omit<BagApi, 'getLastTiddlers'|'read'>{
  innerIframeReady: () => Promise<void>;
}

export const makeInnerFrameAPIClient =
  (rpc: MiniIframeRPC, iframe: Window) =>
  <K extends keyof InnerFrameAPIMethods>(method: K, args: Parameters<InnerFrameAPIMethods[K]>) =>
    rpc.invoke(iframe, null, method, args) as ReturnType<InnerFrameAPIMethods[K]>;

export const makeOuterFrameAPIClient =
  (rpc: MiniIframeRPC, iframe: Window) =>
  <K extends keyof OuterFrameAPIMethods>(method: K, args: Parameters<OuterFrameAPIMethods[K]>) =>
    rpc.invoke(iframe, null, method, args) as ReturnType<OuterFrameAPIMethods[K]>;

export const defineInnerFrameAPIMethod = <K extends keyof InnerFrameAPIMethods>(
  rpc: MiniIframeRPC,
  procedureName: K,
  implementation: InnerFrameAPIMethods[K],
): void => rpc.register(procedureName, implementation);

export const defineOuterFrameAPIMethod = <K extends keyof OuterFrameAPIMethods>(
  rpc: MiniIframeRPC,
  procedureName: K,
  implementation: OuterFrameAPIMethods[K],
): void => rpc.register(procedureName, implementation);
