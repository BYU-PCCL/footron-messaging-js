export class Request{
    body: any;
    id: string;
    
    constructor(body, id){
        this.body = body;
        this.id = id;
    }
}