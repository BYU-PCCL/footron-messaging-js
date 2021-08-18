import { Message, MessageType } from "./messages";
import { MessagingClient } from "./messagingClient";
import {
  ConnectionCloseCallback,
  LifecycleCallback,
  MessageCallback,
  MessageOrRequest,
} from "./types";
import { LockStateError } from "./errors";

export type SendProtocolMessage = (message: Message) => void;

export class Connection {
  /*
    Public Connection interface
     */

  private impl: ConnectionImpl;

  constructor(connectionImpl: ConnectionImpl) {
    this.impl = connectionImpl;
  }

  getId(): string {
    return this.impl.id;
  }

  isPaused(): boolean {
    return this.impl.paused;
  }

  async accept(): Promise<void> {
    return this.impl.accept();
  }

  async deny(): Promise<void> {
    return this.impl.deny();
  }

  async sendMessage(body: unknown, requestId?: string): Promise<void> {
    return this.impl.sendMessage(body, requestId);
  }

  addMessageListener(callback: MessageCallback): void {
    this.impl.addMessageListener(callback);
  }

  removeMessageListener(callback: MessageCallback): void {
    this.impl.removeMessageListener(callback);
  }

  addCloseListener(callback: ConnectionCloseCallback): void {
    this.impl.addCloseListener(callback);
  }

  removeCloseListener(callback: ConnectionCloseCallback): void {
    this.impl.removeCloseListener(callback);
  }

  addLifecycleListener(callback: LifecycleCallback): void {
    this.impl.addLifecycleListener(callback);
  }

  removeLifecycleListener(callback: LifecycleCallback): void {
    this.impl.removeLifecycleListener(callback);
  }
}

export class ConnectionImpl {
  id: string;
  accepted: boolean;

  private _paused: boolean;
  private messagingClient: MessagingClient;
  private readonly sendProtocolMessage: SendProtocolMessage;

  private messageListeners: Set<MessageCallback>;
  private closeListeners: Set<ConnectionCloseCallback>;
  private lifecycleListeners: Set<LifecycleCallback>;

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
    this._paused = paused;

    this.messageListeners = new Set();
    this.closeListeners = new Set();
    this.lifecycleListeners = new Set();
  }

  set paused(paused: boolean) {
    this._paused = paused;
    this.notifyLifecycleListeners(paused);
  }

  get paused(): boolean {
    return this._paused;
  }

  //
  // Access methods
  //

  async accept(): Promise<void> {
    await this.updateAccess(true);
    if (!this.messagingClient.hasInitialState) {
      await this.sendEmptyInitialMessage();
    }
  }

  async deny(reason?: string): Promise<void> {
    await this.updateAccess(false, reason);
  }

  private async updateAccess(
    accepted: boolean,
    reason?: string
  ): Promise<void> {
    if (!this.messagingClient.lock) {
      throw new LockStateError("locked");
    }

    await this.sendProtocolMessage({
      type: MessageType.Access,
      accepted,
      reason,
      client: this.id,
    });
    this.accepted = true;
  }

  //
  // Message methods
  //

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

  //
  // Message listener handling
  //

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

  //
  // Connection close listener handling
  //

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

  //
  // Lifecycle listener handling
  //

  addLifecycleListener(callback: LifecycleCallback): void {
    this.lifecycleListeners.add(callback);
  }

  removeLifecycleListener(callback: LifecycleCallback): void {
    this.lifecycleListeners.delete(callback);
  }

  clearLifecycleListeners(): void {
    this.lifecycleListeners.clear();
  }

  notifyLifecycleListeners(paused: boolean): void {
    this.lifecycleListeners.forEach((callback) => callback(paused));
  }
}
