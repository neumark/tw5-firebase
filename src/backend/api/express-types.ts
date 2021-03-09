import { User } from "./user";

declare global {
  namespace Express {
    interface Request {
      user: User, // add to Request by the authentication middleware
      params: {[key: string]:string}, // parsed path parameters passed in by express
      query: {[key: string]:string} // parsed query parameters passed in by express
      body: any
    }

    interface Response {
      json: (res:Express.Response)=>Promise<any>
      status:(code:number)=>Response
    }
  }
}