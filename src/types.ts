import { Connection } from "./connection";
import { Request } from "./requests";

export type ClientConnectionStatus = "idle" | "loading" | "open" | "closed";

export type MessageOrRequest = unknown | Request;

export type MessageCallback = (body: MessageOrRequest) => void;
export type ConnectionCallback = (body: Connection) => void;
export type ConnectionCloseCallback = () => void;
