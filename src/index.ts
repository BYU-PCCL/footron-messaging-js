import { MessagingClient } from './messagingClient'

export { Connection } from './connection'

export class Messaging extends MessagingClient{
    constructor(url?: string){
        if(url == null){
            url = new URLSearchParams(location.href).get("ftMsgUrl") ?? "ws://localhost:8089/out";
        }
        super(url);
    }
}
