---
title: Referencia de API de SolidJS
description: Referencia completa de API para los paquetes SolidJS de Effectify
---

# Referencia de API de SolidJS

Esta página proporciona una referencia completa de API para todos los paquetes SolidJS de Effectify.

## @effectify/solid-query

### Integración con TanStack Query

#### `createQuery` con Effect

```tsx
import { createQuery } from "@tanstack/solid-query"
import { Effect } from "effect"

const userQuery = createQuery(() => ({
  queryKey: ["user", userId()],
  queryFn: () => Effect.runPromise(fetchUserEffect(userId())),
}))
```

#### `createMutation` con Effect

```tsx
import { createMutation } from "@tanstack/solid-query"

const updateMutation = createMutation(() => ({
  mutationFn: (data: UserData) => Effect.runPromise(updateUserEffect(data)),
}))
```

#### `createInfiniteQuery` con Effect

```tsx
import { createInfiniteQuery } from "@tanstack/solid-query"

const postsQuery = createInfiniteQuery(() => ({
  queryKey: ["posts"],
  queryFn: ({ pageParam = 1 }) => Effect.runPromise(fetchPostsEffect(pageParam)),
  getNextPageParam: (lastPage) => lastPage.nextPage,
  initialPageParam: 1,
}))
```

### Integración con recursos de SolidJS

#### `createResource` con Effect

```tsx
import { createResource } from "solid-js"

const [user] = createResource(() => userId(), (id) => Effect.runPromise(fetchUserEffect(id)))
```

## @effectify/solid-ui

### Componentes

#### Button

```tsx
interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
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

#### Componentes Card

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

#### Componentes Dialog

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

#### Componentes Drawer

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

### Utilidades

#### `cn` - Utilidad de className

```tsx
function cn(...inputs: ClassValue[]): string
```

Uso:

```tsx
import { cn } from "@effectify/solid-ui/lib/utils"

function MyComponent(props: { class?: string }) {
  return <div class={cn("base-classes", props.class)} />
}
```

#### Funciones de validación

```tsx
function validateEmail(email: string): string | undefined
function validateRequired(value: any): string | undefined
function validateMinLength(value: string, min: number): string | undefined
function validateMaxLength(value: string, max: number): string | undefined
```

## @effectify/chat-solid

### Componentes

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
