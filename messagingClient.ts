import {Connection} from "./connection";
import {BaseMessage, Message, MessageType} from "./messages";
import { MessageOrRequest, ConnectionCallback, ConnectionCloseCallback, MessageCallback } from "./types";

export type MessageCallback = (body: unknown) => void
export type ConnectionCloseCallback = () => void
export class MessagingClient {

    //listeners and methods to remove listeners

    //will have multiple connections, array. one per device connection.


    socket: WebSocket;
    url: string;
    connections: Map<string, Connection>;
    connectionListeners: ConnectionCallback[];
    messageListeners: MessageCallback[];
    lock: boolean | number;


   // lock: ?protocol.Lock?;

    constructor(url: string) {
        this.socket = new WebSocket(url);
        this.url = url;
        this.connections = new Map();
        this.messageListeners = [];
        this.socket.onopen = this.onOpen;
        this.socket.onmessage = this.onMessage;
        this.socket.onerror = this.onError;
        this.socket.onclose = this.onClose;
        this.lock = false;

    }

    getLock() {
        return this.lock;
    }

    // async lock(value: boolean | number) {
    //
    // }

    private async sendProtocolMessage(message: BaseMessage) {
      this.checkOutgoingProtocolMessage(message);
    }

    private notifyMessageListeners(body: unknown) {
        this.messageListeners.forEach((callback) => callback(body))
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

    private checkOutgoingProtocolMessage(message: BaseMessage){
      if (message.type == MessageType.Access && !(this.lock)) {
        // raise LockStateError(
        //   "A lock is required to send access messages to clients"
        // )
      }
      if (!(message.type in [
        MessageType.Access,
        MessageType.ApplicationApp,
        MessageType.DisplaySettings,
      ])){
        // raise protocol.UnhandledMessageTypeError(
        //   f"Couldn't send message type '{message.type}'"
        // )
      } 
    }

    private compareHeartbeatUpConnections(connections){
      var localConnections = new Set(this.connections);
      var heartbeatConnections = new Set(connections);

      Array.from(heartbeatConnections.keys()).forEach(client => {
        if (client.keys()[0] in localConnections.keys()){
          heartbeatConnections.delete(client);
          localConnections.delete(client);
          return;
        }
        this.addConnection(client.keys()[0]);
      });

      Array.from(localConnections.keys()).forEach(client => {
        if (client.keys()[0] in heartbeatConnections){
          heartbeatConnections.delete(client);
          localConnections.delete(client);
          return;
        }
        this.removeConnection(client.keys()[0]);
      });


    }

    private sendMessage<T>(body: T, requestId: string) {
        this.connections.forEach((connection) => connection.sendMessage(body, requestId));
    }


    // lock state, lock defines the max number of connections
    //


    private addConnection(id: string){
      var connection = new Connection(
        id,
        this.url, 
        this.sendProtocolMessage, // Is this correct?
        !(this.lock));
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

    //Listeners
    addMessageListener(callback: MessageCallback) {
      this.messageListeners.push(callback);
    }

    removeMessageListener(callback: MessageCallback) {
      this.messageListeners.unshift(callback);
    }

    private clearMessageListeners() {
        this.messageListeners.length = 0;
    }

    private notifyConnectionListeners(connection: Connection){
      
    }





}

