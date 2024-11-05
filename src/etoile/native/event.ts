type EventCallback<P = any[]> = P extends any[] ? (...args: P) => any : never

export type DefaultEventDefinition = Record<string, EventCallback>

export type BindThisParameter<T, C = unknown> = T extends (...args: infer P) => infer R ? (this: C, ...args: P) => R
  : never

export interface EventCollectionData<EvtDefinition extends DefaultEventDefinition, C = unknown> {
  name: string
  handler: BindThisParameter<EvtDefinition[keyof EvtDefinition], C>
  ctx: C
}

export type EventCollections<EvtDefinition extends DefaultEventDefinition> = Record<
  keyof EvtDefinition,
  EventCollectionData<EvtDefinition>[]
>

export class Event<EvtDefinition extends DefaultEventDefinition = DefaultEventDefinition> {
  private eventCollections: EventCollections<EvtDefinition>

  constructor() {
    this.eventCollections = Object.create(null)
  }

  on<C, Evt extends keyof EvtDefinition>(evt: Evt, handler: BindThisParameter<EvtDefinition[Evt], unknown extends C ? this : C>, c?: C) {
    if (!(evt in this.eventCollections)) {
      this.eventCollections[evt] = []
    }

    const data = <EventCollectionData<EvtDefinition>> {
      name: evt,
      handler,
      ctx: c || this
    }
    this.eventCollections[evt].push(data)
  }

  off(evt: keyof EvtDefinition, handler?: BindThisParameter<EvtDefinition[keyof EvtDefinition], unknown>) {
    if (evt in this.eventCollections) {
      if (!handler) {
        this.eventCollections[evt] = []
        return
      }
      this.eventCollections[evt] = this.eventCollections[evt].filter((d) => d.handler !== handler)
    }
  }

  emit(evt: keyof EvtDefinition, ...args: Parameters<EvtDefinition[keyof EvtDefinition]>) {
    if (!this.eventCollections[evt]) return
    const handlers = this.eventCollections[evt]
    if (handlers.length) {
      handlers.forEach((d) => {
        d.handler.call(d.ctx, ...args)
      })
    }
  }

  bindWithContext<C>(
    c: C
  ) {
    return (evt: keyof EvtDefinition, handler: BindThisParameter<EvtDefinition[keyof EvtDefinition], unknown extends C ? this : C>) =>
      this.on(evt, handler, c)
  }
}
