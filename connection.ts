export class Connection {

    url: string;
    socket: WebSocket;

    constructor(url: string) {
        this.url = url;
        this.socket = new WebSocket(url);
        this.socket.onopen = this.onOpen;
        this.socket.onmessage = this.onMessage;
        this.socket.onerror = this.onError;
        this.socket.onclose = this.onClose;
    }


    onOpen(evt) {
        console.log("on open triggered");

    }

    onClose() {
        console.log("on close triggered");
        this.socket.close();
    }

    onMessage() {
        console.log("on message triggered");

    }

    onError() {
        console.log("ERROR");

    }

    onRequest(func) {

    }

    message() {

    }
    
    lock() {

    }


}