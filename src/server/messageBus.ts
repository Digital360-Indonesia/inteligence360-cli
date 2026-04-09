import { EventEmitter } from 'events'

export type BusEvent =
  | { type: 'message';   entry: Record<string, unknown> }
  | { type: 'model';     model: string }
  | { type: 'session';   sessionId: string }
  | { type: 'input';     text: string }
  | { type: 'thinking';  active: boolean }

class MessageBus extends EventEmitter {
  broadcast(event: BusEvent) {
    this.emit('event', event)
  }
}

export const messageBus = new MessageBus()
messageBus.setMaxListeners(100)
