import { User } from './user';

export type Revision = string;

export const getRevision = (writer: User|undefined, timestamp: Date) => `${+timestamp}:${writer?.userId ?? 'unknown'}`;
