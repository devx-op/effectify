---
title: "@effectify/chat-solid"
description: Real-time chat components and services for SolidJS applications
---

# @effectify/chat-solid

The `@effectify/chat-solid` package provides real-time chat components and services for SolidJS applications. Built with Effect for robust state management and SolidJS for reactive UI updates, it offers a complete chat solution with WebSocket support, message persistence, and user management.

## Installation

```bash
npm install @effectify/chat-solid
```

**Peer Dependencies:**
```bash
npm install @effectify/solid-query @effectify/chat-domain solid-js
```

## Basic Usage

### Simple Chat Component

```tsx
import { ChatRoom } from '@effectify/chat-solid/components/chat-room'
import { ChatProvider } from '@effectify/chat-solid/components/chat-provider'

function App() {
  return (
    <ChatProvider 
      userId="user-123"
      roomId="general"
      websocketUrl="ws://localhost:3001"
    >
      <ChatRoom />
    </ChatProvider>
  )
}
```

### Custom Chat Interface

```tsx
import { 
  ChatMessages, 
  ChatInput, 
  ChatUserList 
} from '@effectify/chat-solid/components'
import { useChatRoom } from '@effectify/chat-solid/hooks/use-chat-room'

function CustomChatRoom() {
  const { 
    messages, 
    users, 
    sendMessage, 
    isConnected 
  } = useChatRoom()

  return (
    <div class="flex h-screen">
      <div class="flex-1 flex flex-col">
        <div class="flex-1 overflow-y-auto">
          <ChatMessages messages={messages()} />
        </div>
        <ChatInput 
          onSendMessage={sendMessage}
          disabled={!isConnected()}
        />
      </div>
      <div class="w-64 border-l">
        <ChatUserList users={users()} />
      </div>
    </div>
  )
}
```

## Components

### ChatProvider

The root provider that manages chat state and WebSocket connections:

```tsx
import { ChatProvider } from '@effectify/chat-solid/components/chat-provider'

function App() {
  return (
    <ChatProvider
      userId="current-user-id"
      roomId="room-id"
      websocketUrl="ws://localhost:3001"
      options={{
        reconnectAttempts: 5,
        reconnectDelay: 1000,
        messageHistory: 50
      }}
    >
      <YourChatComponents />
    </ChatProvider>
  )
}
```

### ChatRoom

A complete chat room component with messages, input, and user list:

```tsx
import { ChatRoom } from '@effectify/chat-solid/components/chat-room'

function MyChatApp() {
  return (
    <div class="h-screen">
      <ChatRoom 
        class="h-full"
        showUserList={true}
        showTypingIndicator={true}
        messageLimit={100}
      />
    </div>
  )
}
```

### ChatMessages

Displays a list of chat messages with proper formatting:

```tsx
import { ChatMessages } from '@effectify/chat-solid/components/chat-messages'
import { useChatRoom } from '@effectify/chat-solid/hooks/use-chat-room'

function MessageArea() {
  const { messages } = useChatRoom()

  return (
    <ChatMessages 
      messages={messages()}
      class="flex-1 overflow-y-auto p-4"
      renderMessage={(message) => (
        <div class="mb-2">
          <strong>{message.user.name}:</strong> {message.content}
        </div>
      )}
    />
  )
}
```

### ChatInput

Input component for sending messages:

```tsx
import { ChatInput } from '@effectify/chat-solid/components/chat-input'
import { useChatRoom } from '@effectify/chat-solid/hooks/use-chat-room'

function MessageInput() {
  const { sendMessage, isConnected } = useChatRoom()

  return (
    <ChatInput
      onSendMessage={sendMessage}
      disabled={!isConnected()}
      placeholder="Type your message..."
      maxLength={500}
      showEmojiPicker={true}
      onTyping={() => {
        // Handle typing indicator
      }}
    />
  )
}
```

### ChatUserList

Displays online users in the chat room:

```tsx
import { ChatUserList } from '@effectify/chat-solid/components/chat-user-list'
import { useChatRoom } from '@effectify/chat-solid/hooks/use-chat-room'

function UserSidebar() {
  const { users } = useChatRoom()

  return (
    <div class="w-64 border-l bg-gray-50">
      <h3 class="p-4 font-semibold">Online Users</h3>
      <ChatUserList 
        users={users()}
        renderUser={(user) => (
          <div class="flex items-center p-2">
            <div class="w-2 h-2 bg-green-500 rounded-full mr-2" />
            {user.name}
          </div>
        )}
      />
    </div>
  )
}
```

## Hooks

### useChatRoom

Main hook for accessing chat room state and actions:

```tsx
import { useChatRoom } from '@effectify/chat-solid/hooks/use-chat-room'

function ChatComponent() {
  const {
    // State
    messages,
    users,
    currentUser,
    isConnected,
    isLoading,
    error,
    
    // Actions
    sendMessage,
    joinRoom,
    leaveRoom,
    
    // Typing indicators
    typingUsers,
    startTyping,
    stopTyping
  } = useChatRoom()

  const handleSendMessage = (content: string) => {
    sendMessage({ content, type: 'text' })
  }

  return (
    <Show when={!isLoading()} fallback={<div>Connecting to chat...</div>}>
      <Show when={error()}>
        <div>Error: {error()?.message}</div>
      </Show>
      <div>Connected: {isConnected() ? 'Yes' : 'No'}</div>
      <div>Messages: {messages().length}</div>
      <div>Users: {users().length}</div>
    </Show>
  )
}
```

### useChatMessages

Hook for managing message-specific functionality:

```tsx
import { useChatMessages } from '@effectify/chat-solid/hooks/use-chat-messages'

function MessageManager() {
  const {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    loadMoreMessages
  } = useChatMessages()

  const handleEdit = (messageId: string, newContent: string) => {
    editMessage(messageId, { content: newContent })
  }

  const handleReact = (messageId: string, emoji: string) => {
    reactToMessage(messageId, emoji)
  }

  return (
    <div>
      <For each={messages()}>
        {(message) => (
          <div>
            {message.content}
            <button onClick={() => handleReact(message.id, '👍')}>
              👍
            </button>
          </div>
        )}
      </For>
    </div>
  )
}
```

## Reactive Patterns

### Real-time Message Updates

```tsx
import { createEffect } from 'solid-js'

function ChatNotifications() {
  const { messages } = useChatRoom()

  createEffect(() => {
    const latestMessage = messages()[messages().length - 1]
    if (latestMessage && latestMessage.userId !== currentUser()?.id) {
      // Show notification for new message
      new Notification(`New message from ${latestMessage.user.name}`)
    }
  })

  return null
}
```

### Typing Indicators

```tsx
import { createSignal, createEffect } from 'solid-js'

function TypingIndicator() {
  const { typingUsers, startTyping, stopTyping } = useChatRoom()
  const [isTyping, setIsTyping] = createSignal(false)

  let typingTimeout: number

  const handleInputChange = (value: string) => {
    if (value.length > 0 && !isTyping()) {
      setIsTyping(true)
      startTyping()
    }

    clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => {
      setIsTyping(false)
      stopTyping()
    }, 3000)
  }

  return (
    <div>
      <input
        onInput={(e) => handleInputChange(e.currentTarget.value)}
        placeholder="Type a message..."
      />
      <Show when={typingUsers().length > 0}>
        <div class="text-sm text-gray-500">
          {typingUsers().map(u => u.name).join(', ')} 
          {typingUsers().length === 1 ? ' is' : ' are'} typing...
        </div>
      </Show>
    </div>
  )
}
```

### Message Reactions

```tsx
import { MessageReactions } from '@effectify/chat-solid/components/message-reactions'

function MessageWithReactions(props: { message: Message }) {
  const { reactToMessage } = useChatMessages()

  return (
    <div class="message">
      <div>{props.message.content}</div>
      <MessageReactions
        reactions={props.message.reactions}
        onReact={(emoji) => reactToMessage(props.message.id, emoji)}
      />
    </div>
  )
}
```

## Services

### ChatService

Effect-based service for chat operations:

```tsx
import { ChatService } from '@effectify/chat-solid/services/chat-service'
import { Effect } from 'effect'

// Send a message
const sendMessageEffect = ChatService.sendMessage({
  roomId: 'room-123',
  content: 'Hello, world!',
  type: 'text'
})

// Join a room
const joinRoomEffect = ChatService.joinRoom('room-123')

// Get message history
const getHistoryEffect = ChatService.getMessageHistory({
  roomId: 'room-123',
  limit: 50,
  before: new Date()
})

// Usage in component
function ChatComponent() {
  const sendMessage = (content: string) => {
    Effect.runPromise(
      sendMessageEffect.pipe(
        Effect.catchAll(error => {
          console.error('Failed to send message:', error)
          return Effect.succeed(null)
        })
      )
    )
  }

  return <div>{/* component JSX */}</div>
}
```

## Advanced Features

### File Uploads

```tsx
import { FileUpload } from '@effectify/chat-solid/components/file-upload'

function ChatWithFiles() {
  const { sendMessage } = useChatRoom()

  const handleFileUpload = (file: File) => {
    sendMessage({
      type: 'file',
      content: file.name,
      fileData: file
    })
  }

  return (
    <div>
      <FileUpload
        onUpload={handleFileUpload}
        acceptedTypes={['image/*', '.pdf', '.doc', '.docx']}
        maxSize={10 * 1024 * 1024} // 10MB
      />
    </div>
  )
}
```

### Message Search

```tsx
import { createSignal, createMemo } from 'solid-js'

function MessageSearch() {
  const { messages } = useChatRoom()
  const [searchTerm, setSearchTerm] = createSignal('')

  const filteredMessages = createMemo(() => {
    const term = searchTerm().toLowerCase()
    if (!term) return messages()
    
    return messages().filter(message => 
      message.content.toLowerCase().includes(term) ||
      message.user.name.toLowerCase().includes(term)
    )
  })

  return (
    <div>
      <input
        type="text"
        value={searchTerm()}
        onInput={(e) => setSearchTerm(e.currentTarget.value)}
        placeholder="Search messages..."
      />
      <For each={filteredMessages()}>
        {(message) => (
          <div class="message">
            <strong>{message.user.name}:</strong> {message.content}
          </div>
        )}
      </For>
    </div>
  )
}
```

## Configuration

### WebSocket Configuration

```tsx
const chatConfig = {
  websocketUrl: 'ws://localhost:3001',
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,
  messageQueueSize: 100,
  typingTimeout: 3000
}

<ChatProvider {...chatConfig}>
  <ChatRoom />
</ChatProvider>
```

### Message Persistence

```tsx
import { MessageStore } from '@effectify/chat-solid/services/message-store'

// Configure local storage
const messageStore = MessageStore.localStorage({
  maxMessages: 1000,
  ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
})

<ChatProvider messageStore={messageStore}>
  <ChatRoom />
</ChatProvider>
```

## Error Handling

```tsx
import { ChatErrorBoundary } from '@effectify/chat-solid/components/chat-error-boundary'

function App() {
  return (
    <ChatErrorBoundary
      fallback={(error) => (
        <div>
          <h2>Chat Error</h2>
          <p>{error.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )}
    >
      <ChatProvider>
        <ChatRoom />
      </ChatProvider>
    </ChatErrorBoundary>
  )
}
```

## Examples

Check out the complete chat implementation in:
- [SolidJS SPA Chat Example](https://github.com/devx-op/effectify/tree/main/apps/solid-app-spa)
- [SolidJS Start Chat Example](https://github.com/devx-op/effectify/tree/main/apps/solid-app-start)

## Performance Optimization

### Virtual Scrolling for Large Message Lists

```tsx
import { createVirtualizer } from '@tanstack/solid-virtual'

function VirtualizedMessages() {
  const { messages } = useChatRoom()
  let parentRef: HTMLDivElement

  const virtualizer = createVirtualizer({
    count: messages().length,
    getScrollElement: () => parentRef,
    estimateSize: () => 50,
  })

  return (
    <div ref={parentRef!} class="h-96 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        <For each={virtualizer.getVirtualItems()}>
          {(virtualItem) => (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <MessageItem message={messages()[virtualItem.index]} />
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
```

## Best Practices

### 1. Handle Connection States

```tsx
function ChatStatus() {
  const { isConnected, error } = useChatRoom()

  return (
    <div class="status-bar">
      <Show when={isConnected()}>
        <span class="text-green-600">Connected</span>
      </Show>
      <Show when={!isConnected() && !error()}>
        <span class="text-yellow-600">Connecting...</span>
      </Show>
      <Show when={error()}>
        <span class="text-red-600">Connection Error</span>
      </Show>
    </div>
  )
}
```

### 2. Implement Message Queuing

```tsx
function ReliableMessageSender() {
  const { sendMessage, isConnected } = useChatRoom()
  const [messageQueue, setMessageQueue] = createSignal<string[]>([])

  const queueMessage = (content: string) => {
    if (isConnected()) {
      sendMessage({ content, type: 'text' })
    } else {
      setMessageQueue(prev => [...prev, content])
    }
  }

  createEffect(() => {
    if (isConnected() && messageQueue().length > 0) {
      messageQueue().forEach(content => {
        sendMessage({ content, type: 'text' })
      })
      setMessageQueue([])
    }
  })

  return { queueMessage }
}
```
