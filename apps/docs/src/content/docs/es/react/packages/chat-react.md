---
title: "@effectify/chat-react"
description: Componentes y servicios de chat en tiempo real para aplicaciones React
---

# @effectify/chat-react

El paquete `@effectify/chat-react` ofrece componentes y servicios de chat en tiempo real para aplicaciones React. Construido con Effect para un manejo de estado y errores robusto, incluye soporte WebSocket, persistencia de mensajes y gestión de usuarios.

## Instalación

```bash
npm install @effectify/chat-react
```

**Peer Dependencies:**

```bash
npm install @effectify/react-query @effectify/chat-domain react
```

## Uso básico

### Componente simple de chat

```tsx
import { ChatRoom } from "@effectify/chat-react/components/chat-room"
import { ChatProvider } from "@effectify/chat-react/components/chat-provider"

function App() {
  return (
    <ChatProvider userId="user-123" roomId="general" websocketUrl="ws://localhost:3001">
      <ChatRoom />
    </ChatProvider>
  )
}
```

### Interfaz de chat personalizada

```tsx
import { ChatInput, ChatMessages, ChatUserList } from "@effectify/chat-react/components"
import { useChatRoom } from "@effectify/chat-react/hooks/use-chat-room"

function CustomChatRoom() {
  const { messages, users, sendMessage, isConnected } = useChatRoom()

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <ChatMessages messages={messages} />
        </div>
        <ChatInput onSendMessage={sendMessage} disabled={!isConnected} />
      </div>
      <div className="w-64 border-l">
        <ChatUserList users={users} />
      </div>
    </div>
  )
}
```

## Componentes

### ChatProvider

Proveedor raíz que gestiona el estado del chat y las conexiones WebSocket:

```tsx
import { ChatProvider } from "@effectify/chat-react/components/chat-provider"

function App() {
  return (
    <ChatProvider
      userId="current-user-id"
      roomId="room-id"
      websocketUrl="ws://localhost:3001"
      options={{ reconnectAttempts: 5, reconnectDelay: 1000, messageHistory: 50 }}
    >
      <YourChatComponents />
    </ChatProvider>
  )
}
```

### ChatRoom

Componente de sala de chat completa:

```tsx
import { ChatRoom } from "@effectify/chat-react/components/chat-room"

function MyChatApp() {
  return (
    <div className="h-screen">
      <ChatRoom className="h-full" showUserList showTypingIndicator messageLimit={100} />
    </div>
  )
}
```

### ChatMessages

Lista de mensajes con formato:

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

Componente de entrada para enviar mensajes:

```tsx
import { ChatInput } from "@effectify/chat-react/components/chat-input"
import { useChatRoom } from "@effectify/chat-react/hooks/use-chat-room"

function MessageInput() {
  const { sendMessage, isConnected } = useChatRoom()
  return (
    <ChatInput
      onSendMessage={sendMessage}
      disabled={!isConnected}
      placeholder="Escribe tu mensaje..."
      maxLength={500}
      showEmojiPicker
      onTyping={() => {
        // Indicador de escritura
      }}
    />
  )
}
```

### ChatUserList

Lista de usuarios en línea:

```tsx
import { ChatUserList } from "@effectify/chat-react/components/chat-user-list"
import { useChatRoom } from "@effectify/chat-react/hooks/use-chat-room"

function UserSidebar() {
  const { users } = useChatRoom()
  return (
    <div className="w-64 border-l bg-gray-50">
      <h3 className="p-4 font-semibold">Usuarios en línea</h3>
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
