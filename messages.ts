export enum MessageType {
    HEARTBEAT = 0,
    APPLICATION = 1,
    LIFECYCLE = 2,
}

export interface ApplicationMessage {
    onMessage: (body: string) => void,
    body: string,
    requestID?: string,
}

export interface HeartbeatMessage {
    up: boolean,
    message: string,
}

export interface LifecycleMessage {
    paused: boolean,
}