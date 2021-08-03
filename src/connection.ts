import { Message, MessageType } from "./messages";
import { MessagingClient } from "./messagingClient";
import {
  ConnectionCloseCallback,
  MessageCallback,
  MessageOrRequest,
} from "./types";
import { LockStateError } from "./errors";

export type SendProtocolMessage = (message: Message) => void;

export class Connection {
  /*
    Public Connection interface
     */

  public _connection: _Connection;

  constructor(_connection: _Connection) {
    this._connection = _connection;
  }

  getId(): string {
    return this._connection.id;
  }

  isPaused(): boolean {
    return this._connection.paused;
  }

  async accept(): Promise<void> {
    return this._connection.accept();
  }

  async sendMessage(body: unknown, requestId = ""): Promise<void> {
    return this._connection.sendMessage(body, requestId);
  }

  addMessageListener(callback: MessageCallback): void {
    this._connection.addMessageListener(callback);
  }

  removeMessageListener(callback: MessageCallback): void {
    this._connection.removeMessageListener(callback);
  }

  addCloseListener(callback: ConnectionCloseCallback): void {
    this._connection.addCloseListener(callback);
  }

  removeCloseListener(callback: ConnectionCloseCallback): void {
    this._connection.removeCloseListener(callback);
  }
}

export class _Connection {
  id: string;
  paused: boolean;
  accepted: boolean;

  private messagingClient: MessagingClient;
  private readonly sendProtocolMessage: SendProtocolMessage;

  private messageListeners: Set<MessageCallback>;
  private closeListeners: Set<ConnectionCloseCallback>;

  constructor(
    id: string,
    accepted: boolean,
    messagingClient: MessagingClient,
    sendProtocolMessage: SendProtocolMessage,
    paused = false
  ) {
    this.id = id;
    this.sendProtocolMessage = sendProtocolMessage;
    this.accepted = accepted;
    this.messagingClient = messagingClient;
    this.paused = paused;

    this.messageListeners = new Set();
    this.closeListeners = new Set();
  }

  //Access methods

  async accept(): Promise<void> {
    await this.updateAccess(true);
    //Check for initial state?
  }

  async deny(reason = "none"): Promise<void> {
    await this.updateAccess(false, reason);
  }

  private async updateAccess(accepted: boolean, reason = "none"): Promise<void> {
    if (!this.messagingClient.getLock()) {
      throw new LockStateError("locked");
    }

    await this.sendProtocolMessage({
      type: MessageType.Access,
      accepted,
      reason,
    });
    this.accepted = true;
  }

  //Message methods

  async sendMessage<T>(body: T, requestId?: string): Promise<void> {
    if (!this.accepted) {
      throw new Error("client not accepted");
    }

    if (this.paused) {
      return;
    }

    await this.sendProtocolMessage({
      type: MessageType.ApplicationApp,
      body,
      req: requestId,
      client: this.id,
    });
  }

  async sendEmptyInitialMessage(): Promise<void> {
    await this.sendMessage({ __start: "" });
  }

  addMessageListener(callback: MessageCallback): void {
    this.messageListeners.add(callback);
  }

  removeMessageListener(callback: MessageCallback): void {
    this.messageListeners.delete(callback);
  }

  clearMessageListener(): void {
    this.messageListeners.clear();
  }

  notifyMessageListeners(message: MessageOrRequest): void {
    this.messageListeners.forEach((callback) => callback(message));
  }

  //Connection Close listener Handling

  addCloseListener(callback: ConnectionCloseCallback): void {
    this.closeListeners.add(callback);
  }

  removeCloseListener(callback: ConnectionCloseCallback): void {
    this.closeListeners.delete(callback);
  }

  clearCloseListeners(): void {
    this.closeListeners.clear();
  }

  notifyCloseListeners(): void {
    this.closeListeners.forEach((callback) => callback());
  }
}
