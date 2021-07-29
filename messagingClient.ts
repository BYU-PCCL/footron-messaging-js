import {Connection, _Connection} from "./connection";
import { LockStateError, ConnectionNotFoundError } from "./errors";
import {BaseMessage, Message, MessageType} from "./messages";
import { Request } from "./requests";
import { MessageOrRequest, ConnectionCallback, ConnectionCloseCallback, MessageCallback } from "./types";

export class MessagingClient {

    //listeners and methods to remove listeners

    //will have multiple connections, array. one per device connection.


    socket: WebSocket;
    url: string;
    connections: Map<string, Connection>;
    connectionListeners: ConnectionCallback[];
    messageListeners: MessageCallback[];
    lock: boolean | number; // protocol


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

    // private aysnc receiveHandler(){
    //     async for message in self._socket:
    //     # TODO: Add support for binary messages
    //     if not isinstance(message, str):
    //         print("not string?")
    //         continue

    //     try:
    //         await self._on_message(protocol.deserialize(json.loads(message)))
    //     except Exception as e:
    //         print(e)
    // print("it's over")
    //   this.socket.
    // }

    // private async sendHandler(){
    //   while (true) {
    //     message = await this.
    //   }
    // }

    // We don't need checkOutgoingProtocolMessage() or sendProtocolMessage()
    // because we aren't using message queue

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

      if (message.hasAttribute("client")){
        if(!(message.client in this.connections)) {
          throw "AccessError, ";
          // f"Unauthorized client '{message.client}' attempted to send an authenticated message"
          
        }
      }

      if (message.type == MessageType.ApplicationClient) {
        if(message.hasAttribute("req")){ // i don't know how to write this more efficient
          this.notifyMessageListeners((message.body, message.req));
          this.connections[message.client].notifyMessageListeners((message.body, message.req));
          return;
        } else {
          this.notifyMessageListeners((message.body));
          this.connections[message.client].notifyMessageListeners((message.body));
        }


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

    private compareHeartbeatUpConnections(connections: Connection[]){
      var localConnections = new Set(this.connections);
      var heartbeatConnections = new Set(connections);

      Array.from(heartbeatConnections.keys()).forEach(client => {
        if (client.getId() in localConnections.keys()){
          const indexHB = connections.indexOf(client);
          if (indexHB > -1) {
            connections.splice(indexHB, 1);
          }
          // connections.delete(client.getId());
          this.connections.delete(client.getId());
          return;
        }
        this.addConnection(client.getId());
      });

      Array.from(localConnections.keys()).forEach(client => {
        if (client.keys()[0] in heartbeatConnections){
          
          const indexHB = connections.indexOf(client.values()[0]);
          if (indexHB > -1) {
            connections.splice(indexHB, 1);
          }
          // connections.delete(client.getId());
          this.connections.delete(client.keys()[0]);
          return;
        }
        this.removeConnection(client.keys()[0]);
      });


    }

    private sendMessage<T>(body: T, requestId: string) {
      this.connections.forEach((connection) => connection.sendMessage(body, requestId));
  }

  //
  // Client connection handling
  // (these methods just handle updating internal state and notifying listeners
  // _after_ connections are added/removed)
  // 


  private addConnection(id: string){
    var connection = new _Connection(
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

  // 
  // Message listener handling
  // 

  addMessageListener(callback: MessageCallback) {
    this.messageListeners.push(callback);
  }

  removeMessageListener(callback: MessageCallback) {
    this.messageListeners.unshift(callback);
  }

  private clearMessageListeners() {
      this.messageListeners.length = 0;
  }

  private notifyMessageListeners(body: unknown) {
      this.messageListeners.forEach((callback) => callback(body))
  }

  // 
  // Connection listneer handling
  // 

  addConnectionListener(callback: ConnectionCallback){
    this.connectionListeners.push(callback);
  }

  removeConnectionListener(callback: ConnectionCallback){
    const index = this.connectionListeners.indexOf(callback);
    if (index > -1) {
      this.connectionListeners.splice(index, 1);
    }
  }

  private clearConnectionListeners(){
    this.connectionListeners.length = 0;
  }

  private notifyConnectionListeners(connection: _Connection){
    this.connectionListeners.forEach(callback => {
      callback(new Connection(connection));
    })
  }


  private onOpen() {

  }

  private onError() {

  }

  private onClose() {

  }

    





}

