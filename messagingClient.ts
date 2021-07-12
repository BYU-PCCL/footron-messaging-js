import {Connection} from "./connection";

export class MessagingClient {

    //listeners and methods to remove listeners

    connection: Connection;

    constructor(url: string) {
        this.connection = new Connection(url);
    }





}

