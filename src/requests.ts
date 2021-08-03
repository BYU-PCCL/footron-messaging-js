export class Request {
  body: unknown;
  id: string;

  constructor(body: unknown, id: string) {
    this.body = body;
    this.id = id;
  }
}
