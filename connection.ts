import {Message, MessageType} from "./messages";

export type SendProtocolMessage = (message: Message) => void

export class Connection {

    id: string;
    private readonly sendProtocolMessage: SendProtocolMessage;
    private accepted: boolean;


    constructor(id: string, protocolMessage: SendProtocolMessage, accepted: boolean) {
      this.id = id;
      this.sendProtocolMessage = protocolMessage;
      this.accepted = accepted;

    }

    sendMessage<T>(body: T) {
        this.sendProtocolMessage( {
            type: MessageType.APPLICATION_APP,
            client: this.id,
            body,
        })
    }

}