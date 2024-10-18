type EventCallback<P = any[]> = P extends any[] ? (...args: P) => any : never

type DefaultEventDefinition = Record<string, EventCallback>

type BindThisParameter<T, C = unknown> = T extends (...args: infer P) => infer R ? (this: C, ...args: P) => R : never

export class Event<EvtDefinition extends DefaultEventDefinition = DefaultEventDefinition> {
  private eventCollections: any

  constructor() {
    this.eventCollections = {}
  }

  on<C, Evt extends keyof EvtDefinition>(evt: Evt, handler: BindThisParameter<EvtDefinition[Evt], C>, c?: C) {}
  off() {}
}
