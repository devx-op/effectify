---
title: API Reference
description: Complete API reference for Effectify React packages
---

# API Reference

This page provides a comprehensive API reference for all Effectify React packages.

## @effectify/react-query

### Functions

#### `createEffectQuery`

Creates a query function that integrates Effect with TanStack Query.

```tsx
function createEffectQuery<T, E>(
  effect: Effect<T, E, never>,
): () => Promise<T>
```

**Parameters:**

- `effect`: The Effect to execute

**Returns:**

- A function that can be used as a TanStack Query `queryFn`

**Example:**

```tsx
const fetchUser = (id: number) => Effect.succeed({ id, name: "John" })
const queryFn = createEffectQuery(fetchUser(1))

const { data } = useQuery({
  queryKey: ["user", 1],
  queryFn,
})
```

#### `createEffectMutation`

Creates a mutation function that integrates Effect with TanStack Query.

```tsx
function createEffectMutation<T, E, A>(
  effect: (args: A) => Effect<T, E, never>,
): (args: A) => Promise<T>
```

### Hooks

#### `useEffectQuery`

A hook that combines useQuery with Effect execution.

```tsx
function useEffectQuery<T, E>(
  queryKey: QueryKey,
  effect: Effect<T, E, never>,
  options?: UseQueryOptions<T, E>,
): UseQueryResult<T, E>
```

#### `useEffectMutation`

A hook that combines useMutation with Effect execution.

```tsx
function useEffectMutation<T, E, A>(
  effect: (args: A) => Effect<T, E, never>,
  options?: UseMutationOptions<T, E, A>,
): UseMutationResult<T, E, A>
```

## @effectify/react-ui

### Components

#### Button

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

function Button(props: ButtonProps): JSX.Element
```

#### Input

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

function Input(props: InputProps): JSX.Element
```

#### Card

```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
function Card(props: CardProps): JSX.Element

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
function CardHeader(props: CardHeaderProps): JSX.Element

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
function CardTitle(props: CardTitleProps): JSX.Element

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
function CardDescription(props: CardDescriptionProps): JSX.Element

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
function CardContent(props: CardContentProps): JSX.Element

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
function CardFooter(props: CardFooterProps): JSX.Element
```

#### Dialog

```tsx
interface DialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Dialog(props: DialogProps): JSX.Element
function DialogTrigger(props: { children: React.ReactNode; asChild?: boolean }): JSX.Element
function DialogContent(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element
function DialogHeader(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element
function DialogTitle(props: React.HTMLAttributes<HTMLHeadingElement>): JSX.Element
function DialogDescription(props: React.HTMLAttributes<HTMLParagraphElement>): JSX.Element
function DialogFooter(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element
```

### Hooks

#### `useAppForm`

```tsx
interface UseAppFormOptions<T> {
  defaultValues: T
  onSubmit: (data: T) => Promise<void> | void
  validators?: FormValidators<T>
}

function useAppForm<T>(options: UseAppFormOptions<T>): {
  handleSubmit: (e: React.FormEvent) => void
  register: (name: keyof T) => FormFieldProps
  formState: FormState<T>
  reset: () => void
  setValue: (name: keyof T, value: any) => void
  watch: (name?: keyof T) => any
}
```

### Utilities

#### `cn`

Utility for combining class names with proper precedence.

```tsx
function cn(...inputs: ClassValue[]): string
```

#### Validation Functions

```tsx
function validateEmail(email: string): string | undefined
function validateRequired(value: any): string | undefined
function validateMinLength(value: string, min: number): string | undefined
function validateMaxLength(value: string, max: number): string | undefined
```

## @effectify/chat-react

### Components

#### ChatProvider

```tsx
interface ChatProviderProps {
  userId: string
  roomId: string
  websocketUrl: string
  options?: ChatOptions
  children: React.ReactNode
}

interface ChatOptions {
  reconnectAttempts?: number
  reconnectDelay?: number
  messageHistory?: number
  heartbeatInterval?: number
}

function ChatProvider(props: ChatProviderProps): JSX.Element
```

#### ChatRoom

```tsx
interface ChatRoomProps extends React.HTMLAttributes<HTMLDivElement> {
  showUserList?: boolean
  showTypingIndicator?: boolean
  messageLimit?: number
}

function ChatRoom(props: ChatRoomProps): JSX.Element
```

#### ChatMessages

```tsx
interface ChatMessagesProps extends React.HTMLAttributes<HTMLDivElement> {
  messages: Message[]
  renderMessage?: (message: Message) => React.ReactNode
  onLoadMore?: () => void
  hasMore?: boolean
}

function ChatMessages(props: ChatMessagesProps): JSX.Element
```

#### ChatInput

```tsx
interface ChatInputProps extends React.HTMLAttributes<HTMLDivElement> {
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
interface ChatUserListProps extends React.HTMLAttributes<HTMLDivElement> {
  users: User[]
  renderUser?: (user: User) => React.ReactNode
  onUserClick?: (user: User) => void
}

function ChatUserList(props: ChatUserListProps): JSX.Element
```

### Hooks

#### `useChatRoom`

```tsx
function useChatRoom(): {
  // State
  messages: Message[]
  users: User[]
  currentUser: User | null
  isConnected: boolean
  isLoading: boolean
  error: Error | null

  // Actions
  sendMessage: (message: Partial<Message>) => void
  joinRoom: (roomId: string) => void
  leaveRoom: () => void

  // Typing
  typingUsers: User[]
  startTyping: () => void
  stopTyping: () => void
}
```

#### `useChatMessages`

```tsx
function useChatMessages(): {
  messages: Message[]
  sendMessage: (message: Partial<Message>) => void
  editMessage: (id: string, updates: Partial<Message>) => void
  deleteMessage: (id: string) => void
  reactToMessage: (id: string, emoji: string) => void
  loadMoreMessages: () => void
  hasMore: boolean
  isLoading: boolean
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

type MessageType = "text" | "file" | "image" | "system"
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

type UserStatus = "online" | "away" | "offline"
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
  readonly _tag = "ChatError"
  constructor(
    message: string,
    readonly code: ChatErrorCode,
    readonly cause?: unknown,
  )
}

type ChatErrorCode =
  | "CONNECTION_FAILED"
  | "MESSAGE_SEND_FAILED"
  | "AUTHENTICATION_FAILED"
  | "ROOM_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "PERMISSION_DENIED"
```

## Error Types

### Common Error Types

All packages use consistent error types based on Effect's error handling patterns:

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
  readonly _tag = "NetworkError"
}

// Validation errors
class ValidationError extends EffectifyError {
  readonly _tag = "ValidationError"
  constructor(message: string, readonly errors: string[]) {
    super(message)
  }
}

// Authentication errors
class AuthenticationError extends EffectifyError {
  readonly _tag = "AuthenticationError"
}
```
