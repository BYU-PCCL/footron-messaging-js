import { Connection, _Connection } from "./connection";
// import { LockStateError, ConnectionNotFoundError } from "./errors";
import { Message, MessageType, PROTOCOL_VERSION } from "./messages";
import { Request } from "./requests";
import {
  ClientConnectionStatus,
  ConnectionCallback,
  MessageCallback,
} from "./types";

export class MessagingClient {
  socket?: WebSocket;
  url: string;
  connections: Map<string, _Connection>;
  connectionListeners: Set<ConnectionCallback>;
  messageListeners: Set<MessageCallback>;
  lock: boolean | number;
  status: ClientConnectionStatus;

  constructor(url: string) {
    this.url = url;
    this.connections = new Map();
    this.connectionListeners = new Set();
    this.messageListeners = new Set();
    this.lock = false;
    this.status = "idle";

    this.bindMethods();
  }

  private bindMethods() {
    this.sendMessage = this.sendMessage.bind(this);
    this.addMessageListener = this.addMessageListener.bind(this);
    this.removeMessageListener = this.removeMessageListener.bind(this);
    this.sendProtocolMessage = this.sendProtocolMessage.bind(this);
  }

  async setLock(lock: boolean | number): Promise<void> {
    await this.sendProtocolMessage({
      type: MessageType.DisplaySettings,
      settings: { lock },
    });
    this.lock = lock;
  }

  getLock(): boolean | number {
    return this.lock;
  }

  //
  // Client lifecycle methods (not to be confused with protocol lifecycle
  // messages)
  //

  mount(): void {
    this.openSocket();
  }

  unmount(): void {
    this.close();
  }

  private close() {
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
    this.clearConnectionListeners();
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
      // Await until either socket connects or closes
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
      throw Error("Message received from router didn't specify valid type");
    }

    return message as unknown as Message;
  }

  private async onMessage(data: string) {
    const message = MessagingClient.parseMessage(data);

    if (message.type == MessageType.HeartbeatClient) {
      if (!message.up) {
        message.clients.forEach((id: string) => this.removeConnection(id));
        return;
      }
      // TODO: This test might be expensive and unnecessary, consider simplifying
      //  or removing it
      await this.compareHeartbeatUpConnections(message.clients);
      return;
    }

    if (!("client" in message) || typeof message.client !== "string") {
      throw Error(
        `Incoming message of type '${message.type}' doesn't contain valid 'client' field required by all remaining message handlers`
      );
    }

    if (message.type == MessageType.Connect) {
      this.addConnection(message.client);
      return;
    }

    if (!this.connections.has(message.client)) {
      throw Error(
        `Unauthorized client '${message.client}' attempted to send an authenticated message`
      );
    }

    if (message.type == MessageType.ApplicationClient) {
      const listenerMessage =
        message.req == null
          ? message.body
          : new Request(message.body, message.req);
      this.notifyMessageListeners(listenerMessage);
      this.connections
        .get(message.client)
        ?.notifyMessageListeners(listenerMessage);
      return;
    }

    if (message.type == MessageType.Lifecycle) {
      const connection = this.connections.get(message.client);
      if (!connection) {
        return;
      }

      connection.paused = message.paused;
      return;
    }

    throw Error(`Couldn't handle message type '${message.type}'`);
  }

  // Based on implementation at
  // https://github.com/BYU-PCCL/footron-messaging-python/blob/9206e273e5c620e984b67c377fcc319996492e27/foomsg/client.py#L171-L193
  private compareHeartbeatUpConnections(connections: string[]) {
    const localConnections = new Set(this.connections.keys());
    const heartbeatConnections = new Set(connections);

    Array.from(heartbeatConnections.keys()).forEach((client) => {
      if (localConnections.has(client)) {
        heartbeatConnections.delete(client);
        localConnections.delete(client);
        return;
      }

      this.addConnection(client);
    });

    Array.from(localConnections.keys()).forEach((client) => {
      if (heartbeatConnections.has(client)) {
        heartbeatConnections.delete(client);
        localConnections.delete(client);
        return;
      }

      this.removeConnection(client);
    });
  }

  sendMessage<T>(body: T, requestId?: string): void {
    this.connections.forEach((connection) =>
      connection.sendMessage(body, requestId)
    );
  }

  //
  // Client connection handling
  // (these methods just handle updating internal state and notifying listeners
  // _after_ connections are added/removed)
  //

  private addConnection(id: string) {
    const connection = new _Connection(
      id,
      this.url,
      this.sendProtocolMessage, // Is this correct?
      !this.lock
    );
    this.connections.set(id, connection);
    this.notifyConnectionListeners(connection);
  }

  private removeConnection(id: string) {
    if (!this.connections.has(id)) {
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

  //
  // Message listener handling
  //

  addMessageListener(callback: MessageCallback): void {
    this.messageListeners.add(callback);
  }

  removeMessageListener(callback: MessageCallback): void {
    this.messageListeners.delete(callback);
  }

  private clearMessageListeners() {
    this.messageListeners.clear();
  }

  private notifyMessageListeners(body: unknown) {
    this.messageListeners.forEach((callback) => callback(body));
  }

  //
  // Connection listener handling
  //

  addConnectionListener(callback: ConnectionCallback): void {
    this.connectionListeners.add(callback);
  }

  removeConnectionListener(callback: ConnectionCallback): void {
    this.connectionListeners.delete(callback);
  }

  private clearConnectionListeners() {
    this.connectionListeners.clear();
  }

  private notifyConnectionListeners(connection: _Connection) {
    this.connectionListeners.forEach((callback) => {
      callback(new Connection(connection));
    });
  }
}
