import {Connection, _Connection} from "./connection";
// import { LockStateError, ConnectionNotFoundError } from "./errors";
import {Message, MessageType, PROTOCOL_VERSION} from "./messages";
import { Request } from "./requests";
import { MessageOrRequest, ConnectionCallback, ConnectionCloseCallback, MessageCallback} from "./types";

export class MessagingClient {

  //listeners and methods to remove listeners

  //will have multiple connections, array. one per device connection.


  socket: WebSocket;
  url: string;
  connections: Map<string, _Connection>;
  connectionListeners: Set<ConnectionCallback>;
  messageListeners: Set<MessageCallback>;
  lock: boolean | number; // protocol
  status: string;


  // lock: ?protocol.Lock?;

  constructor(url: string) {
        this.socket = new WebSocket(""); // is this correct? it wants this to be set
        this.url = url;
        this.connections = new Map();
        this.connectionListeners = new Set();
        this.messageListeners = new Set();
        this.lock = false;
        this.status = "idle";

  }

  async setLock(lock:boolean | number){
    await this.sendProtocolMessage({
      type: MessageType.DisplaySettings, settings: { lock }
    })
    this.lock = lock;
  }
  
  getLock() {
      return this.lock;
  }


  //
  // Client lifecycle methods (not to be confused with protocol lifecycle
  // messages)
  //

  mount():void {
    // Note that consumers of this class will have to also call setApp to
    //  attempt an actual connection request, and to enter the loading state
    this.openSocket();
  }

  unmount(): void {
    this.close();
  }

  private close(reason?: string) {
    // TODO(vinhowe): Determine if and how we go about distinguishing between
    //  protocol reasons and non-error application reasons. It could be useful
    //  for the user to have some subtle visual cue letting them know
    //  immediately whether they should be concerned or if they just got
    //  eliminated from their game.
    //  While it seems like we could solve this with clear messaging on the part
    //  of developers ("You lost! Better luck next time!" is way better than
    //  something terse and ambiguous like "Experience Disconnected"), I want
    //  to be careful not to assume that users will see things the same way we
    //  do.

    if (this.status == "closed") {
      // @vinhowe: This return statement just makes close() idempotent because
      // I can't think of a reason why we'd care whether this method is called
      // multiple times. It could be bad practice not to throw an error here.
      // If we decided that we cared that this method is only called once, we
      // could throw an error here instead.
      return;
    }

    this.closeSocket();
    this.clearMessageListeners();
  }

  //
  // Socket-level logic
  //

  private openSocket() {
    // TODO: Handle retries here
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener("message", ({ data }) => this.onMessage(data));
    this.socket.addEventListener("close", this.onSocketClose);
  }

  private closeSocket() {
    if (this.socket === undefined) {
      return;
    }

    // We're closing the socket manually here, so we don't want onSocketClose to
    // try reopening it
    this.socket.removeEventListener("close", this.onSocketClose);
    this.socket.close();
  }

  private onSocketClose() {
    // Status is idle, loading, or open, so we'll retry opening the socket
    // after a delay to avoid spamming the server
    setTimeout(this.openSocket, 1000);
  }

  private async socketReady(): Promise<boolean> {
    if (this.socket === undefined) {
      return false;
    }

    if (this.socket.readyState == WebSocket.OPEN) {
      return true;
    }

    if (this.socket.readyState == WebSocket.CONNECTING) {
      // Await until either socket connects or times out
      // @vinhowe: Technically we could just return a boolean promise, but
      // there's no non-error state where it would potentially return anything
      // other than true, so that didn't make sense to me.
      await new Promise<void>((resolve, reject) => {
        if (this.socket === undefined) {
          reject(
            new Error(
              "Socket was set to undefined during CONNECTING state; " +
                "this is probably a bug"
            )
          );
          return;
        }

        const openCallback = () => {
          removeListeners();
          resolve();
        };
        const closeCallback = () => {
          removeListeners();
          reject(
            new Error(
              "Socket closed during CONNECTING state; it may have timed out"
            )
          );
        };
        const removeListeners = () => {
          this.socket?.removeEventListener("open", openCallback);
          this.socket?.removeEventListener("close", closeCallback);
        };

        this.socket.addEventListener("open", openCallback);
        this.socket.addEventListener("close", closeCallback);
      });
      return true;
    }

    return false;
  }



  private async onMessage(data: string) {
    const message = JSON.parse(data);

    if (message.type == MessageType.HeartbeatClient) {
      if(!message.up){
        message.clients.forEach((id: string) => this.removeConnection(id));
        return;
      }
      // TODO: This test might be expensive and unnecessary, consider simplifying
      //  or removing it
      await this.compareHeartbeatUpConnections(message.clients);
      return;
    }

    if (message.type == MessageType.Connect) {
      if(!(message.client in this.connections)){
        return;
      }

      this.addConnection(message.client);
      return;
    }

    if ("client" in message){
      if(!(message.client in this.connections)) {
        throw Error(`Unauthorized client '${message.client}' attempted to send an authenticated message`);
      }
    }

    if (message.type == MessageType.ApplicationClient) {
      const listenerMessage = message.req == null ? message.body : new Request(message.body, message.req);
      this.notifyMessageListeners(listenerMessage);
      this.connections.get(message.client)?.notifyMessageListeners(listenerMessage);
    }

    if (message.type == MessageType.Lifecycle) {
      this.connections?.get(message.client)?.paused = message.paused; // need function to set paused?
      return
    }

    throw Error(`Couldn't handle message type '${message.type}'`);

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

    for (const [key, value] of Object.entries(localConnections)){
      if (key in heartbeatConnections){
        this.connections.delete(key);
        return;
      }
      this.removeConnection(key);
    }

  }

  private sendMessage(message: Message, requestId?: string) {
    this.connections.forEach((connection) => connection.sendMessage(message, requestId));
  }


  // async sendMessage<T>(body: T): Promise<void> {
  //   if (this.connectionAppId == null) {
  //     throw Error(
  //       "Client attempted to send an application message before authenticating"
  //     );
  //   }

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
      !this.lock);
    this.connections.set(id, connection);
    this.notifyMessageListeners(connection);
  }

  private removeConnection(id: string){
    if(!this.connections.has(id)){
      return;
    }
    this.connections?.get(id)?.notifyCloseListeners();
    this.connections.delete(id);
  }

  // 
  // Message handling
  // 

  private async sendProtocolMessage(message: Message) {
    if (!(await this.socketReady())) {
      // TODO: Do we want to queue up messages and wait for the socket to be
      //  available again? Or does our little CONNECTING await in socketReady
      //  basically provide that behavior for all of the states we care about?
      throw Error(
        "Couldn't send protocol message because socket isn't available"
      );
    }

    this.socket?.send(
      JSON.stringify({ ...message, version: PROTOCOL_VERSION })
    );
  }

  private static parseMessage(data: string): Message {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(data);
    } catch (error) {
      console.error(
        "An error occurred while attempting to parse a Controls message"
      );
      throw error;
    }

    if (!("type" in message) || typeof message["type"] !== "string") {
      throw Error("Message received from router doesn't specify valid type");
    }

    return message as unknown as Message;
  }

  // 
  // Message listener handling
  // 

  addMessageListener(callback: MessageCallback) {
    this.messageListeners.add(callback);
  }

  removeMessageListener(callback: MessageCallback) {
    this.messageListeners.delete(callback);
  }

  private clearMessageListeners() {
      this.messageListeners.clear();
  }

  private notifyMessageListeners(body: unknown) {
      this.messageListeners.forEach((callback) => callback(body))
  }

  // 
  // Connection listener handling
  // 

  addConnectionListener(callback: ConnectionCallback){
    this.connectionListeners.add(callback);
  }

  removeConnectionListener(callback: ConnectionCallback){
    this.connectionListeners.delete(callback);
  }

  private clearConnectionListeners(){
    this.connectionListeners.clear();
  }

  private notifyConnectionListeners(connection: _Connection){
    this.connectionListeners.forEach(callback => {
      callback(new Connection(connection));
    })
  }


}

