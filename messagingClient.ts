import {Connection} from "./connection";
import {Message, MessageType} from "./messages";

export type MessageCallback = (body: unknown) => void
export type ConnectionCloseCallback = (body: unknown) => void

export class MessagingClient {

    //listeners and methods to remove listeners

    //will have multiple connections, array. one per device connection.


    socket: WebSocket;
    connections: Map<string, Connection>;
    messageListeners: MessageCallback[];
   // lock: ?protocol.Lock?;

    constructor(url: string) {
        this.socket = new WebSocket(url);
        this.connections = new Map();
        this.messageListeners = [];
        this.socket.onopen = this.onOpen;
        this.socket.onmessage = this.onMessage;
        this.socket.onerror = this.onError;
        this.socket.onclose = this.onClose;
        // this.lock = false;
    }

    getLock() {
        return this.lock;
    }

    // async lock(value: protocol.Lock) {
    //
    // }

    //Listeners
    addMessageListener(callback: MessageCallback) {
        this.messageListeners.push(callback);
    }

    removeMessageListener(callback: MessageCallback) {
        this.messageListeners.unshift(callback);
    }

    private sendProtocolMessage(body: Message) {
        this.socket.send(JSON.stringify(body))
    }

    private notifyMessageListeners(body: unknown) {
        this.messageListeners.forEach((callback) => callback(body))
    }

    private clearMessageListeners() {
        this.messageListeners.length = 0;
    }

    private onOpen() {

    }

    private onMessage(data: string) {
        const message = JSON.parse(data);

        if (message.type == MessageType.APPLICATION_CLIENT) {
            this.notifyMessageListeners(message.body);

        }

    }

    private onError() {

    }

    private onClose() {

    }

    private sendMessage<T>(body: T) {
        this.connections.forEach((connection) => connection.sendMessage(body));
    }


    // lock state, lock defines the max number of connections
    //




}

