---
title: SolidJS API Reference
description: Complete API reference for Effectify SolidJS packages
---

# SolidJS API Reference

This page provides a comprehensive API reference for all Effectify SolidJS packages.

## @effectify/solid-query

### Integration with TanStack Query

#### `createQuery` with Effect

```tsx
import { createQuery } from '@tanstack/solid-query'
import { Effect } from 'effect'

const userQuery = createQuery(() => ({
  queryKey: ['user', userId()],
  queryFn: () => Effect.runPromise(fetchUserEffect(userId()))
}))
```

#### `createMutation` with Effect

```tsx
import { createMutation } from '@tanstack/solid-query'

const updateMutation = createMutation(() => ({
  mutationFn: (data: UserData) => Effect.runPromise(updateUserEffect(data))
}))
```

#### `createInfiniteQuery` with Effect

```tsx
import { createInfiniteQuery } from '@tanstack/solid-query'

const postsQuery = createInfiniteQuery(() => ({
  queryKey: ['posts'],
  queryFn: ({ pageParam = 1 }) => Effect.runPromise(fetchPostsEffect(pageParam)),
  getNextPageParam: (lastPage) => lastPage.nextPage,
  initialPageParam: 1
}))
```

### Integration with SolidJS Resources

#### `createResource` with Effect

```tsx
import { createResource } from 'solid-js'

const [user] = createResource(
  () => userId(),
  (id) => Effect.runPromise(fetchUserEffect(id))
)
```

## @effectify/solid-ui

### Components

#### Button

```tsx
interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  children: JSX.Element
}

function Button(props: ButtonProps): JSX.Element
```

#### Input

```tsx
interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

function Input(props: InputProps): JSX.Element
```

#### Card Components

```tsx
interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element
}

function Card(props: CardProps): JSX.Element
function CardHeader(props: CardProps): JSX.Element
function CardTitle(props: JSX.HTMLAttributes<HTMLHeadingElement>): JSX.Element
function CardDescription(props: JSX.HTMLAttributes<HTMLParagraphElement>): JSX.Element
function CardContent(props: CardProps): JSX.Element
function CardFooter(props: CardProps): JSX.Element
```

#### Dialog Components

```tsx
interface DialogProps {
  children: JSX.Element
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Dialog(props: DialogProps): JSX.Element

interface DialogTriggerProps {
  children: JSX.Element
  as?: Component<any>
}

function DialogTrigger(props: DialogTriggerProps): JSX.Element
function DialogContent(props: JSX.HTMLAttributes<HTMLDivElement>): JSX.Element
function DialogHeader(props: JSX.HTMLAttributes<HTMLDivElement>): JSX.Element
function DialogTitle(props: JSX.HTMLAttributes<HTMLHeadingElement>): JSX.Element
function DialogDescription(props: JSX.HTMLAttributes<HTMLParagraphElement>): JSX.Element
function DialogFooter(props: JSX.HTMLAttributes<HTMLDivElement>): JSX.Element
```

#### Drawer Components

```tsx
interface DrawerProps {
  children: JSX.Element
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Drawer(props: DrawerProps): JSX.Element
function DrawerTrigger(props: DialogTriggerProps): JSX.Element
function DrawerContent(props: JSX.HTMLAttributes<HTMLDivElement>): JSX.Element
function DrawerHeader(props: JSX.HTMLAttributes<HTMLDivElement>): JSX.Element
function DrawerTitle(props: JSX.HTMLAttributes<HTMLHeadingElement>): JSX.Element
function DrawerDescription(props: JSX.HTMLAttributes<HTMLParagraphElement>): JSX.Element
function DrawerFooter(props: JSX.HTMLAttributes<HTMLDivElement>): JSX.Element
```

### Utilities

#### `cn` - Class Name Utility

```tsx
function cn(...inputs: ClassValue[]): string
```

**Usage:**
```tsx
import { cn } from '@effectify/solid-ui/lib/utils'

function MyComponent(props: { class?: string }) {
  return (
    <div class={cn("base-classes", props.class)} />
  )
}
```

#### Validation Functions

```tsx
function validateEmail(email: string): string | undefined
function validateRequired(value: any): string | undefined
function validateMinLength(value: string, min: number): string | undefined
function validateMaxLength(value: string, max: number): string | undefined
```

## @effectify/chat-solid

### Components

#### ChatProvider

```tsx
interface ChatProviderProps {
  userId: string
  roomId: string
  websocketUrl: string
  options?: ChatOptions
  children: JSX.Element
}

interface ChatOptions {
  reconnectAttempts?: number
  reconnectDelay?: number
  messageHistory?: number
  heartbeatInterval?: number
  typingTimeout?: number
}

function ChatProvider(props: ChatProviderProps): JSX.Element
```

#### ChatRoom

```tsx
interface ChatRoomProps extends JSX.HTMLAttributes<HTMLDivElement> {
  showUserList?: boolean
  showTypingIndicator?: boolean
  messageLimit?: number
}

function ChatRoom(props: ChatRoomProps): JSX.Element
```

#### ChatMessages

```tsx
interface ChatMessagesProps extends JSX.HTMLAttributes<HTMLDivElement> {
  messages: Message[]
  renderMessage?: (message: Message) => JSX.Element
  onLoadMore?: () => void
  hasMore?: boolean
}

function ChatMessages(props: ChatMessagesProps): JSX.Element
```

#### ChatInput

```tsx
interface ChatInputProps extends JSX.HTMLAttributes<HTMLDivElement> {
  onSendMessage: (message: { content: string; type: MessageType }) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  showEmojiPicker?: boolean
  onTyping?: () => void
  onStopTyping?: () => void
}

function ChatInput(props: ChatInputProps): JSX.Element
```

#### ChatUserList

```tsx
interface ChatUserListProps extends JSX.HTMLAttributes<HTMLDivElement> {
  users: User[]
  renderUser?: (user: User) => JSX.Element
  onUserClick?: (user: User) => void
}

function ChatUserList(props: ChatUserListProps): JSX.Element
```

### Hooks

#### `useChatRoom`

```tsx
function useChatRoom(): {
  // State signals
  messages: Accessor<Message[]>
  users: Accessor<User[]>
  currentUser: Accessor<User | null>
  isConnected: Accessor<boolean>
  isLoading: Accessor<boolean>
  error: Accessor<Error | null>
  
  // Actions
  sendMessage: (message: Partial<Message>) => void
  joinRoom: (roomId: string) => void
  leaveRoom: () => void
  
  // Typing indicators
  typingUsers: Accessor<User[]>
  startTyping: () => void
  stopTyping: () => void
}
```

#### `useChatMessages`

```tsx
function useChatMessages(): {
  messages: Accessor<Message[]>
  sendMessage: (message: Partial<Message>) => void
  editMessage: (id: string, updates: Partial<Message>) => void
  deleteMessage: (id: string) => void
  reactToMessage: (id: string, emoji: string) => void
  loadMoreMessages: () => void
  hasMore: Accessor<boolean>
  isLoading: Accessor<boolean>
}
```

### Services

#### ChatService

```tsx
class ChatService {
  static sendMessage(message: Partial<Message>): Effect<Message, ChatError, never>
  static joinRoom(roomId: string): Effect<void, ChatError, never>
  static leaveRoom(roomId: string): Effect<void, ChatError, never>
  static getMessageHistory(options: HistoryOptions): Effect<Message[], ChatError, never>
  static getUserList(roomId: string): Effect<User[], ChatError, never>
}

interface HistoryOptions {
  roomId: string
  limit?: number
  before?: Date
  after?: Date
}
```

### Types

#### Message

```tsx
interface Message {
  id: string
  content: string
  type: MessageType
  userId: string
  user: User
  timestamp: Date
  reactions?: Reaction[]
  edited?: boolean
  replyTo?: string
}

type MessageType = 'text' | 'file' | 'image' | 'system'
```

#### User

```tsx
interface User {
  id: string
  name: string
  avatar?: string
  status: UserStatus
  lastSeen?: Date
}

type UserStatus = 'online' | 'away' | 'offline'
```

#### Reaction

```tsx
interface Reaction {
  emoji: string
  users: string[]
  count: number
}
```

#### ChatError

```tsx
class ChatError extends Error {
  readonly _tag = 'ChatError'
  constructor(
    message: string,
    readonly code: ChatErrorCode,
    readonly cause?: unknown
  )
}

type ChatErrorCode = 
  | 'CONNECTION_FAILED'
  | 'MESSAGE_SEND_FAILED'
  | 'AUTHENTICATION_FAILED'
  | 'ROOM_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'PERMISSION_DENIED'
```

## SolidJS-Specific Patterns

### Reactive Queries

```tsx
// Query that reacts to signal changes
const [userId, setUserId] = createSignal(1)

const userQuery = createQuery(() => ({
  queryKey: ['user', userId()],
  queryFn: () => Effect.runPromise(fetchUser(userId()))
}))
```

### Resource Integration

```tsx
// Using createResource with Effect
const [user, { mutate, refetch }] = createResource(
  () => userId(),
  (id) => Effect.runPromise(fetchUser(id))
)
```

### Store Integration

```tsx
import { createStore } from 'solid-js/store'

const [chatState, setChatState] = createStore({
  messages: [],
  users: [],
  currentRoom: null
})

// Update store with Effect results
Effect.runPromise(
  fetchMessages(roomId).pipe(
    Effect.tap(messages => Effect.sync(() => 
      setChatState('messages', messages)
    ))
  )
)
```

## Error Handling Patterns

### Effect Error Types

```tsx
// Base error class
class EffectifyError extends Error {
  readonly _tag: string
  constructor(message: string, readonly cause?: unknown) {
    super(message)
  }
}

// Network errors
class NetworkError extends EffectifyError {
  readonly _tag = 'NetworkError'
}

// Validation errors
class ValidationError extends EffectifyError {
  readonly _tag = 'ValidationError'
  constructor(message: string, readonly errors: string[]) {
    super(message)
  }
}
```

### Error Boundaries

```tsx
import { ErrorBoundary } from 'solid-js'

function App() {
  return (
    <ErrorBoundary fallback={(err) => <div>Error: {err.message}</div>}>
      <ChatProvider>
        <ChatRoom />
      </ChatProvider>
    </ErrorBoundary>
  )
}
```

## Performance Optimization

### Memoization

```tsx
import { createMemo } from 'solid-js'

const filteredMessages = createMemo(() => {
  const term = searchTerm()
  return messages().filter(msg => 
    msg.content.toLowerCase().includes(term.toLowerCase())
  )
})
```

### Lazy Loading

```tsx
import { lazy } from 'solid-js'

const ChatRoom = lazy(() => import('./ChatRoom'))

function App() {
  return (
    <Suspense fallback={<div>Loading chat...</div>}>
      <ChatRoom />
    </Suspense>
  )
}
```

### Virtual Scrolling

```tsx
import { createVirtualizer } from '@tanstack/solid-virtual'

const virtualizer = createVirtualizer({
  count: messages().length,
  getScrollElement: () => scrollElement,
  estimateSize: () => 50,
})
```
