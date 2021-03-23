import {User} from './user';

export type Revision = string;

export const getRevision = (writer:User, timestamp:Date) => `${+timestamp}:${writer.userId}`;
