import { Connection } from "./connection";
import { MessagingClient } from "./messagingClient";
import { Request } from "./requests";

export type MessageOrRequest = unknown | Request;

export type MessageCallback = (body: MessageOrRequest) => void;
export type ConnectionCallback = (body: Connection) => void;
export type ConnectionCloseCallback = () => void;
