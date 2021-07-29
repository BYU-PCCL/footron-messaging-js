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
    lock: boolean | number;
    endpoint: string;

   // lock: ?protocol.Lock?;

    constructor(url: string) {
        this.socket = new WebSocket(url);
        this.connections = new Map();
        this.messageListeners = [];
        this.socket.onopen = this.onOpen;
        this.socket.onmessage = this.onMessage;
        this.socket.onerror = this.onError;
        this.socket.onclose = this.onClose;
        this.lock = false;
        // this.endpoint = endpoint;
    }

    getLock() {
        return this.lock;
    }

    // async lock(value: boolean | number) {
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

        if (message.type == MessageType.HeartbeatClient) {
          if(!message.up){
            message.clients.forEach(id => this.removeConnection(id));
            return;
          }
          // TODO: This test might be expensive and unnecessary, consider simplifying
          //  or removing it
          // await this._compare_heartbeat_up_connections(message.clients)
          return;
        }

        if (message.type == MessageType.Connect) {
          if(!(message.client in this.connections)){
            return;
          }

          this.addConnection(message.client);
          return;
        }

        if (message.type == MessageType.ApplicationClient) {
            this.notifyMessageListeners(message.body);
            this.connections[message.client].notifyMessageListeners(message.body);
            return;
        }

        if (message.type == MessageType.Lifecycle) {
          this.connections[message.client].paused = message.paused;
          return
        }

      //   raise protocol.UnhandledMessageTypeError(
      //     f"Couldn't handle message type '{message.type}'"
      //   )


    }

    private onError() {

    }

    private onClose() {

    }

    private compareHeartbeatUpConnections(){
      var localConnections = new Set(this.connections);

    }

    private sendMessage<T>(body: T) {
        this.connections.forEach((connection) => connection.sendMessage(body));
    }


    // lock state, lock defines the max number of connections
    //


    private addConnection(id: string){
      var connection = new Connection(id,this.url);
      this.connections[id] = connection;
      this.notifyMessageListeners(connection);
    }

    private removeConnection(id: string){
      if(!(id in this.connections )){
        return;
      }
      this.connections[id].notifyCloseListeners();
      delete this.connections[id];
    }




}

