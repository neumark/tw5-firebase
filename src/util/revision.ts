import {User} from '../model/user';

export const getRevision = (writer:User, timestamp:Date) => `${+timestamp}:${writer.uid}`;
