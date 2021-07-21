import {Message, MessageType} from "./messages";
import {MessageCallback} from "./messagingClient";

export type SendProtocolMessage = (message: Message) => void

export class Connection {

    id: string;
    private readonly sendProtocolMessage: SendProtocolMessage;
    private accepted: boolean;
    paused: boolean;
    //messagingClient: MessagingClient;

    messageListeners: Set<MessageCallback>;


    constructor(id: string, protocolMessage: SendProtocolMessage, accepted: boolean) {
      this.id = id;
      this.sendProtocolMessage = protocolMessage;
      this.accepted = accepted;
      this.paused = false;

      this.messageListeners = new Set();
    }

    async sendMessage<T>(body: T) {
        if(this.accepted == false) {
            //protocol error.
        }

        await this.sendProtocolMessage( {
            type: MessageType.APPLICATION_APP,
            client: this.id,
            body,
        })
    }

    addMessageListener(callback: MessageCallback) {
        this.messageListeners.add(callback);
    }

    removeMessageListener(callback: MessageCallback) {
        this.messageListeners.delete(callback);
    }

    clearMessageListener() {
        this.messageListeners.clear();
    }

}