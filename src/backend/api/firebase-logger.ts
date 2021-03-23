import * as functions from 'firebase-functions';
import { injectable } from 'inversify';
import { Logger } from '../../util/logger';

@injectable()
export class FirebaseLogger implements Logger {

  info (...args:any[]) {
    functions.logger.info(...args);
  }

  error (...args:any[]) {
    functions.logger.error(...args);
  }
}

