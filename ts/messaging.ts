
export type MessageCallback = () => void;

export class Messaging {
  private static callbacks = new Map<string, MessageCallback[]>();

  static broadcast(message: string) {
    if (Messaging.callbacks.has(message)) {
      for (const cb of Messaging.callbacks.get(message)) {
        cb();
      }
    }
  }

  static listen(message: string, callback: MessageCallback) {
    if (!this.callbacks.has(message)) {
      this.callbacks.set(message, []);
    }
    this.callbacks.get(message).push(callback);
  }
}