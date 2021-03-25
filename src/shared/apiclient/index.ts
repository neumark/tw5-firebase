
export type Fetch = (typeof window)['fetch'];

export class APIClient {
  fetch: Fetch;

  constructor(fetch:Fetch) {
    this.fetch = fetch;
  }
}