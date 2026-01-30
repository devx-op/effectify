---
title: "@effectify/chat-react"
description: Real-time chat components and services for React applications
---

# @effectify/chat-react

The `@effectify/chat-react` package provides real-time chat components and services for React applications. Built with Effect for robust state management and error handling, it offers a complete chat solution with WebSocket support, message persistence, and user management.

## Installation

```bash
npm install @effectify/chat-react
```

**Peer Dependencies:**

```bash
npm install @effectify/react-query @effectify/chat-domain react
```

## Basic Usage

### Simple Chat Component

```tsx
import { ChatRoom } from "@effectify/chat-react/components/chat-room"
import { ChatProvider } from "@effectify/chat-react/components/chat-provider"

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
import { ChatInput, ChatMessages, ChatUserList } from "@effectify/chat-react/components"
import { useChatRoom } from "@effectify/chat-react/hooks/use-chat-room"

function CustomChatRoom() {
  const {
    messages,
    users,
    sendMessage,
    isConnected,
  } = useChatRoom()

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <ChatMessages messages={messages} />
        </div>
        <ChatInput
          onSendMessage={sendMessage}
          disabled={!isConnected}
        />
      </div>
      <div className="w-64 border-l">
        <ChatUserList users={users} />
      </div>
    </div>
  )
}
```

## Components

### ChatProvider

The root provider that manages chat state and WebSocket connections:

```tsx
import { ChatProvider } from "@effectify/chat-react/components/chat-provider"

function App() {
  return (
    <ChatProvider
      userId="current-user-id"
      roomId="room-id"
      websocketUrl="ws://localhost:3001"
      options={{
        reconnectAttempts: 5,
        reconnectDelay: 1000,
        messageHistory: 50,
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
import { ChatRoom } from "@effectify/chat-react/components/chat-room"

function MyChatApp() {
  return (
    <div className="h-screen">
      <ChatRoom
        className="h-full"
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
import { ChatMessages } from "@effectify/chat-react/components/chat-messages"
import { useChatRoom } from "@effectify/chat-react/hooks/use-chat-room"

function MessageArea() {
  const { messages } = useChatRoom()

  return (
    <ChatMessages
      messages={messages}
      className="flex-1 overflow-y-auto p-4"
      renderMessage={(message) => (
        <div key={message.id} className="mb-2">
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
import { ChatInput } from "@effectify/chat-react/components/chat-input"
import { useChatRoom } from "@effectify/chat-react/hooks/use-chat-room"

function MessageInput() {
  const { sendMessage, isConnected } = useChatRoom()

  return (
    <ChatInput
      onSendMessage={sendMessage}
      disabled={!isConnected}
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
import { ChatUserList } from "@effectify/chat-react/components/chat-user-list"
import { useChatRoom } from "@effectify/chat-react/hooks/use-chat-room"

function UserSidebar() {
  const { users } = useChatRoom()

  return (
    <div className="w-64 border-l bg-gray-50">
      <h3 className="p-4 font-semibold">Online Users</h3>
      <ChatUserList
        users={users}
        renderUser={(user) => (
          <div key={user.id} className="flex items-center p-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
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
import { useChatRoom } from "@effectify/chat-react/hooks/use-chat-room"

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
    stopTyping,
  } = useChatRoom()

  const handleSendMessage = (content: string) => {
    sendMessage({ content, type: "text" })
  }

  if (isLoading) return <div>Connecting to chat...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <div>Connected: {isConnected ? "Yes" : "No"}</div>
      <div>Messages: {messages.length}</div>
      <div>Users: {users.length}</div>
    </div>
  )
}
```

### useChatMessages

Hook for managing message-specific functionality:

```tsx
import { useChatMessages } from "@effectify/chat-react/hooks/use-chat-messages"

function MessageManager() {
  const {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    loadMoreMessages,
  } = useChatMessages()

  const handleEdit = (messageId: string, newContent: string) => {
    editMessage(messageId, { content: newContent })
  }

  const handleReact = (messageId: string, emoji: string) => {
    reactToMessage(messageId, emoji)
  }

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.content}
          <button onClick={() => handleReact(message.id, "👍")}>
            👍
          </button>
        </div>
      ))}
    </div>
  )
}
```

## Services

### ChatService

Effect-based service for chat operations:

```tsx
import { ChatService } from "@effectify/chat-react/services/chat-service"
import { Effect } from "effect"

// Send a message
const sendMessageEffect = ChatService.sendMessage({
  roomId: "room-123",
  content: "Hello, world!",
  type: "text",
})

// Join a room
const joinRoomEffect = ChatService.joinRoom("room-123")

// Get message history
const getHistoryEffect = ChatService.getMessageHistory({
  roomId: "room-123",
  limit: 50,
  before: new Date(),
})

// Usage in component
function ChatComponent() {
  const sendMessage = (content: string) => {
    Effect.runPromise(
      sendMessageEffect.pipe(
        Effect.catchAll((error) => {
          console.error("Failed to send message:", error)
          return Effect.succeed(null)
        }),
      ),
    )
  }

  return <div>{/* component JSX */}</div>
}
```

## Advanced Features

### Message Reactions

```tsx
import { MessageReactions } from "@effectify/chat-react/components/message-reactions"

function MessageWithReactions({ message }) {
  const { reactToMessage } = useChatMessages()

  return (
    <div className="message">
      <div>{message.content}</div>
      <MessageReactions
        reactions={message.reactions}
        onReact={(emoji) => reactToMessage(message.id, emoji)}
      />
    </div>
  )
}
```

### File Uploads

```tsx
import { FileUpload } from "@effectify/chat-react/components/file-upload"

function ChatWithFiles() {
  const { sendMessage } = useChatRoom()

  const handleFileUpload = (file: File) => {
    sendMessage({
      type: "file",
      content: file.name,
      fileData: file,
    })
  }

  return (
    <div>
      <FileUpload
        onUpload={handleFileUpload}
        acceptedTypes={["image/*", ".pdf", ".doc", ".docx"]}
        maxSize={10 * 1024 * 1024} // 10MB
      />
    </div>
  )
}
```

### Typing Indicators

```tsx
import { TypingIndicator } from "@effectify/chat-react/components/typing-indicator"

function ChatWithTyping() {
  const { typingUsers, startTyping, stopTyping } = useChatRoom()

  const handleInputChange = (value: string) => {
    if (value.length > 0) {
      startTyping()
    } else {
      stopTyping()
    }
  }

  return (
    <div>
      <div className="messages">
        {/* messages */}
        <TypingIndicator users={typingUsers} />
      </div>
      <input onChange={(e) => handleInputChange(e.target.value)} />
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
import { MessageStore } from '@effectify/chat-react/services/message-store'

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
import { ChatErrorBoundary } from "@effectify/chat-react/components/chat-error-boundary"

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

- [React SPA Chat Example](https://github.com/devx-op/effectify/tree/main/apps/react-app-spa)
- [SolidJS Chat Example](https://github.com/devx-op/effectify/tree/main/apps/solid-app-spa)

## API Reference

### Types

```tsx
interface Message {
  id: string
  content: string
  type: "text" | "file" | "system"
  userId: string
  user: User
  timestamp: Date
  reactions?: Reaction[]
  edited?: boolean
}

interface User {
  id: string
  name: string
  avatar?: string
  status: "online" | "away" | "offline"
}

interface ChatRoom {
  id: string
  name: string
  users: User[]
  messages: Message[]
  isPrivate: boolean
}
```
