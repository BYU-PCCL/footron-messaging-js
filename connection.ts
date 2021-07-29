import {Message, MessageType} from "./messages";
import {ConnectionCloseCallback, MessageCallback, MessagingClient} from "./messagingClient";

export type SendProtocolMessage = (message: Message) => void

export class Connection {

    id: string;
    private readonly sendProtocolMessage: SendProtocolMessage;
    private accepted: boolean;
    paused: boolean;
    private messagingClient: MessagingClient;
    private messageListeners: Set<MessageCallback>;
    private closeListeners: Set<ConnectionCloseCallback>;

    constructor(id: string, url: string, protocolMessage: SendProtocolMessage, accepted: boolean) {
      this.id = id;
      this.sendProtocolMessage = protocolMessage;
      this.accepted = accepted;
      this.paused = false;
      this.messagingClient = new MessagingClient(url)
      this.messageListeners = new Set();
      this.closeListeners = new Set();
    }

    async accept() {
        await this.updateAccess(true);
    }

    async deny(reason: string = "none") {
        await this.updateAccess(false, reason);
    }

    private async updateAccess(accepted: boolean, reason: string = "none") {
        if (!this.messagingClient.getLock()) {
            //Lockstate error

        }
        //access message???
    }


    async sendMessage<T>(body: T) {
        if(this.accepted == false) {
            //protocol error.
        }

        await this.sendProtocolMessage( {
            type: MessageType.ApplicationApp,
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

    // notifyMessageListeners(message: MessageOrRequest) {
    //     //Not sure
    // }

    addCloseListener(callback: ConnectionCloseCallback) {
        this.closeListeners.add(callback);
    }

    removeCloseListener(callback: ConnectionCloseCallback) {
        this.closeListeners.delete(callback);
    }
    clearCloseListeners() {
        this.closeListeners.clear();
    }

    notifyCloseListeners() {

    }

}