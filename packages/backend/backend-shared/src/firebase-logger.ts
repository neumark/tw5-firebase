import { Logger } from '@tw5-firebase/shared/src/util/logger';
import * as functions from 'firebase-functions';
import { injectable } from 'inversify';

@injectable()
export class FirebaseLogger implements Logger {
  info(...args: any[]) {
    functions.logger.info(...args);
  }

  error(...args: any[]) {
    functions.logger.error(...args);
  }
}
