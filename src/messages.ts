export const PROTOCOL_VERSION = 1;

// TODO Make Protocol project for JS library similar to the python messaging library
export enum MessageType {
    // 
    // Heartbeat messages
    // 

    // // App connection status message (<app id> is up/down)
    // router -> client
    HeartbeatApp = "ahb",
    // Client connection status update
    // client -> app (us) ???
    HeartbeatClient = "chb",

    // 
    // Authentication-level messages
    //


    // Connection request (I want to connect to <app id>)
    // client -> app/router (us)
    Connect = "con",
    // Connection response (Access granted/denied to <app id>)
    // app/router (us) -> client
    Access = "acc",

    // 
    // Application-level messages
    // 

    // client -> app (us)
    ApplicationClient = "cap",
    // app (us) -> client
    ApplicationApp = "app",
    // Error message
    // router (us) -> client
    Error = "err",  
    // client -> app (us)
    //: Request to change app runtime settings, handled by router
    DisplaySettings = "dse",
    // Lifecycle message (I am paused/unpaused)
    Lifecycle = "lcy",


  }

export interface BaseMessage {
    type: MessageType;
    // version: PROTOCOL_VERSION
}

interface AppClientIdentifiableMixin {
    // """Fields for messages between an app and a client in either direction
    // Note that the app to which messages sent by a client are bound is specified by
    // the client connection request and the associated access response. The client has
    // no other control over which app is the recipient of its messages.
    // """
    client?: String;
    app?: String;


}

interface BaseHeartbeatMessage extends BaseMessage {
    up: boolean;
}

export interface HeartbeatAppMessage extends BaseHeartbeatMessage{
    type: MessageType.HeartbeatApp,
    // message: string,
}

export interface HeartbeatClientMessage extends BaseHeartbeatMessage {
    type: MessageType.HeartbeatClient;
    clients: Array<string>;
}

export interface ConnectMessage extends BaseMessage, AppClientIdentifiableMixin {
    type: MessageType.Connect;
    app: string;
  }

export interface AccessMessage extends BaseMessage, AppClientIdentifiableMixin {
    type: MessageType.Access;
    accepted: boolean;
    reason?: string;
}

interface BaseApplicationMessage extends BaseMessage {
    body: unknown,
    req?: string,
    // client: string,
}



export interface ApplicationClientMessage extends BaseApplicationMessage, AppClientIdentifiableMixin {
    type: MessageType.ApplicationClient,


}

export interface ApplicationAppMessage extends  BaseApplicationMessage, AppClientIdentifiableMixin {
    type: MessageType.ApplicationApp,


}

interface DisplaySettings {

    end_time?: Number;
    // Lock states:
    // - false: no lock
    // - true: closed lock, not evaluating new connections
    // - n (int in [1, infinity)): after k = n active connections, controller will not
    // accept new connections until k < n
    lock?: Boolean | Number;
}
    

export interface DisplaySettingsMessage extends BaseMessage {
    type: MessageType.DisplaySettings;
    settings: DisplaySettings;

}

export interface ErrorMessage extends BaseMessage {
    type: MessageType.Error;
    error: string;
}

export interface LifecycleMessage extends BaseMessage, AppClientIdentifiableMixin {
    type: MessageType.Lifecycle;
    paused: boolean;
}
  

export type Message =
| HeartbeatAppMessage
| HeartbeatClientMessage
| ConnectMessage
| AccessMessage
| ApplicationClientMessage
| ApplicationAppMessage
| ErrorMessage
| DisplaySettingsMessage
| LifecycleMessage;
