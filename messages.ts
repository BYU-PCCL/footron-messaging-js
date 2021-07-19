interface BaseMessage {
    type: MessageType;
}

export enum MessageType {
    HEARTBEAT = 0,
    APPLICATION_APP = 1,
    APPLICATION_CLIENT = 2,
    LIFECYCLE = 3,

}

interface BaseApplicationMessage extends BaseMessage {
    body: unknown,
    req?: string,
    client: string,
}

export interface ApplicationClientMessage extends BaseApplicationMessage {
    type: MessageType.APPLICATION_CLIENT,


}

export interface ApplicationAppMessage extends  BaseApplicationMessage {
    type: MessageType.APPLICATION_APP,


}

export interface HeartbeatMessage extends BaseMessage{
    type: MessageType.HEARTBEAT,
    up: boolean,
    message: string,
}

export interface LifecycleMessage extends BaseMessage {
    type: MessageType.LIFECYCLE,
    paused: boolean,
}


export type Message = ApplicationClientMessage | ApplicationAppMessage | HeartbeatMessage | LifecycleMessage