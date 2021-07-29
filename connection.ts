import {Message, MessageType} from "./messages";
import {ConnectionCloseCallback, MessageCallback, MessagingClient} from "./messagingClient";
import {LockStateError, ConnectionNotFoundError} from "./errors";

export type SendProtocolMessage = (message: Message) => void

export class Connection {
    /*
    Public Connection interface
     */

    public _connection: _Connection;
    
    constructor(_connection: _Connection) {
        this._connection = _connection;
    }

    public getId() {
        return this._connection.id;
    }

    public isPaused() {
        return this._connection.paused;
    }

    public accept() {
        return this._connection.accept();
    }

    public sendMessage(body: unknown, requestId: string = "") {
        return this._connection.sendMessage(body, requestId);
    }

    public addMessageListener(callback: MessageCallback) {
        return this._connection.addMessageListener(callback);
    }

    public removeMessageListener(callback: MessageCallback) {
        return this._connection.removeMessageListener(callback);
    }

    public addCloseListener(callback: ConnectionCloseCallback) {
        return this._connection.addCloseListener(callback);
    }

    public removeCloseListener(callback: ConnectionCloseCallback){
        return this._connection.removeCloseListener(callback);
    }
}


export class _Connection {

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
      this.messagingClient = new MessagingClient(url);
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
            throw new LockStateError("locked");

        }
        //access message???
    }


    async sendMessage<T>(body: T, requestId: string = "") {
        if(this.accepted == false) {
            //protocol error.
            throw new Error("client not accepted");
        }

        await this.sendProtocolMessage( {
            type: MessageType.ApplicationApp,
            body,
            req: requestId,
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