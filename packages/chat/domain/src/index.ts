// Ultra-simplified stub for chat-domain
// Full v4 migration deferred - this enables examples to compile

export const MessageId = {
  make: (id: string) => id as string & { readonly __brand: unique symbol },
}

export type MessageId = ReturnType<typeof MessageId.make>

export interface Message {
  id: MessageId
  body: string
  createdAt: Date
  readAt: Date | null
}

// Stub services
export const MessagesService = {
  getMessages: () => Promise.resolve([] as Message[]),
  sendMarkAsReadBatch: (_batch: string[]) => Promise.resolve(),
}

export const NetworkMonitor = {
  isOnline: () => true,
  whenOpen: <T>(fn: () => T) => fn(),
}

export const Live = {}
