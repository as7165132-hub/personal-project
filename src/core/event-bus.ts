/**
 * SURFACE DEBUT - Event Bus
 * 경량 이벤트 버스 시스템
 */

type EventHandler<T = unknown> = (data: T) => void;

export class EventBus {
  private events: Map<string, Set<EventHandler>>;

  constructor() {
    this.events = new Map();
  }

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler);
    }
  }

  emit<T = unknown>(event: string, data?: T): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  clear(): void {
    this.events.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();
