export class Request {
  body: any;
  id: string;

  constructor(body: any, id: string) {
    this.body = body;
    this.id = id;
  }
}
