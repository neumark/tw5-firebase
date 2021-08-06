import { TiddlerWithRevision } from '@tw5-firebase/shared/src/model/tiddler';
import { User } from '@tw5-firebase/shared/src/model/user';
import type { MiniIframeRPC } from 'mini-iframe-rpc';
import { BagApi } from '../../../shared/src/api/bag-api';

export const makeRPC = () =>
  new (window as any)['mini-iframe-rpc'].MiniIframeRPC({
    defaultInvocationOptions: {
      retryAllFailures: false,
      timeout: 0,
      retryLimit: 0,
    },
  }) as MiniIframeRPC;

// Only preserves fields of an interface which have function type
type FuncFields<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any ? T[P] : never;
};

export interface InnerFrameAPIMethods {
  saveTiddlers: (incoming: TiddlerWithRevision[]) => Promise<void>;
  initWiki: ({ user }: { user: User }) => Promise<void>;
  test: (a: string, b: string) => Promise<number>;
}

export interface OuterFrameAPIMethods extends Omit<BagApi, 'getLastTiddlers' | 'read'> {
  innerIframeReady: () => Promise<void>;
}

export const makeAPIClient =
  <T>(rpc: MiniIframeRPC, iframe: Window) =>
  <K extends keyof FuncFields<T>>(method: K, args: Parameters<FuncFields<T>[K]>) =>
    rpc.invoke(iframe, null, method as string, args) as ReturnType<FuncFields<T>[K]>;

export const apiDefiner =
  <T>(rpc: MiniIframeRPC) =>
  <K extends keyof FuncFields<T>>(procedureName: K, implementation: FuncFields<T>[K]): void =>
    rpc.register(procedureName as string, implementation);
