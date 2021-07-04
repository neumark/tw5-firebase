import {} from 'jasmine';
import { TW5FirebaseError, TW5FirebaseErrorPayload } from '../src/shared/model/errors';
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000000;

export const expectRejectionWithPayload = async <T>(
  p: Promise<T> | (() => Promise<T>),
  expected?: TW5FirebaseErrorPayload,
): Promise<void> => {
  let exc: any = undefined;
  try {
    const value = await (typeof p === 'function' ? p() : p);
    return fail(`should have thrown exception, instead got ${JSON.stringify(value, null, 4)}`);
  } catch (e) {
    exc = e;
  }
  expect(exc).toBeDefined();
  expect(exc).toBeInstanceOf(TW5FirebaseError);
  if (expected) {
    expect(exc.payload).toEqual(expected);
  }
};
