---
title: "@effectify/chat-solid"
description: Componentes y servicios de chat en tiempo real para aplicaciones SolidJS
---

# @effectify/chat-solid

El paquete `@effectify/chat-solid` ofrece componentes y servicios de chat en tiempo real para aplicaciones SolidJS. Construido con Effect para un manejo de estado robusto y SolidJS para actualizaciones reactivas de UI, incluye soporte WebSocket, persistencia de mensajes y gestión de usuarios.

## Instalación

```bash
npm install @effectify/chat-solid
```

**Peer Dependencies:**

```bash
npm install @effectify/solid-query @effectify/chat-domain solid-js
```

## Uso básico

### Componente de chat simple

```tsx
import { ChatRoom } from "@effectify/chat-solid/components/chat-room"
import { ChatProvider } from "@effectify/chat-solid/components/chat-provider"

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
import { ChatInput, ChatMessages, ChatUserList } from "@effectify/chat-solid/components"
import { useChatRoom } from "@effectify/chat-solid/hooks/use-chat-room"

function CustomChatRoom() {
  const { messages, users, sendMessage, isConnected } = useChatRoom()

  return (
    <div class="flex h-screen">
      <div class="flex-1 flex flex-col">
        <div class="flex-1 overflow-y-auto">
          <ChatMessages messages={messages()} />
        </div>
        <ChatInput onSendMessage={sendMessage} disabled={!isConnected()} />
      </div>
      <div class="w-64 border-l">
        <ChatUserList users={users()} />
      </div>
    </div>
  )
}
```

## Componentes

### ChatProvider

Proveedor raíz que gestiona estado y conexión WebSocket:

```tsx
import { ChatProvider } from "@effectify/chat-solid/components/chat-provider"

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

Componente completo de sala de chat:

```tsx
import { ChatRoom } from "@effectify/chat-solid/components/chat-room"

function MyChatApp() {
  return (
    <div class="h-screen">
      <ChatRoom class="h-full" showUserList showTypingIndicator messageLimit={100} />
    </div>
  )
}
```

### ChatMessages

Lista de mensajes:

```tsx
import { ChatMessages } from "@effectify/chat-solid/components/chat-messages"
import { useChatRoom } from "@effectify/chat-solid/hooks/use-chat-room"

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

Entrada para enviar mensajes:

```tsx
import { ChatInput } from "@effectify/chat-solid/components/chat-input"
import { useChatRoom } from "@effectify/chat-solid/hooks/use-chat-room"

function MessageInput() {
  const { sendMessage, isConnected } = useChatRoom()
  return (
    <ChatInput
      onSendMessage={sendMessage}
      disabled={!isConnected()}
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

Lista de usuarios:

```tsx
import { ChatUserList } from "@effectify/chat-solid/components/chat-user-list"
import { useChatRoom } from "@effectify/chat-solid/hooks/use-chat-room"

function UserSidebar() {
  const { users } = useChatRoom()
  return (
    <div class="w-64 border-l bg-gray-50">
      <h3 class="p-4 font-semibold">Usuarios en línea</h3>
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
