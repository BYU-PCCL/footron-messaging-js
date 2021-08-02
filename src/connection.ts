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

  public getId() {
    return this._connection.id;
  }

  public isPaused() {
    return this._connection.paused;
  }

  public accept() {
    return this._connection.accept();
  }

  public sendMessage(body: unknown, requestId = "") {
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

  public removeCloseListener(callback: ConnectionCloseCallback) {
    return this._connection.removeCloseListener(callback);
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
    paused: boolean = false
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

  async accept() {
    await this.updateAccess(true);
    //Check for initial state?
  }

  async deny(reason = "none") {
    await this.updateAccess(false, reason);
  }

  private async updateAccess(accepted: boolean, reason = "none") {
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

  async sendMessage<T>(body: T, requestId?: string) {
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

  async sendEmptyInitialMessage() {
    await this.sendMessage({ __start: "" });
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

  notifyMessageListeners(message: MessageOrRequest) {
    this.messageListeners.forEach((callback) => callback(message));
  }

  //Connection Close listener Handling

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
    this.closeListeners.forEach((callback) => callback());
  }
}
