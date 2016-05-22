const RECONNECT_TIME_MILLIS = 3000;

export default class ReconnectingWebSocket {
    private ws: WebSocket;
    private handlers: {[eventName: string]: Array<Function>} = {};
    public isOnline: boolean = false;

    constructor(private url: string) {
        this.createWebSocket(url);
    }

    on(eventName: string, handler: Function) {
        if (!this.handlers[eventName]) {
            this.handlers[eventName] = [];
        }
        this.handlers[eventName].push(handler);
    }

    createWebSocket(url: string) {
        this.ws = new WebSocket(url);
        this.ws.binaryType = "arraybuffer";

        this.ws.onopen = (e) => {
            this.isOnline = true;
            this.fireEvent("open", e);
        }
        this.ws.onclose = (e) => {
            this.isOnline = false;
            this.fireEvent("close", e);
            setTimeout(() => {
                this.createWebSocket(url);
            }, RECONNECT_TIME_MILLIS);
        };
        this.ws.onerror = (e) => {
            this.fireEvent("error", e);
        }
        this.ws.onmessage = (e) => {
            this.fireEvent("message", e);
        }
    }

    fireEvent(eventName: string, eventInfo: any) {
        let handlerList = this.handlers[eventName] || [];

        handlerList.forEach((handler) => {
            handler(eventInfo);
        });
    }

    send(message: string) {
        if (this.isOnline) {
            this.ws.send(message);
        }
    }
}
