---
title: Referencia de API
description: Referencia completa de API para los paquetes React de Effectify
---

# Referencia de API

Esta página proporciona una referencia completa de API para todos los paquetes React de Effectify.

## @effectify/react-query

### Funciones

#### `createEffectQuery`

Crea una función de query que integra Effect con TanStack Query.

```tsx
function createEffectQuery<T, E>(effect: Effect<T, E, never>): () => Promise<T>
```

Parámetros:

- `effect`: El Effect a ejecutar

Retorna:

- Función utilizable como `queryFn` de TanStack Query

Ejemplo:

```tsx
const fetchUser = (id: number) => Effect.succeed({ id, name: "John" })
const queryFn = createEffectQuery(fetchUser(1))
const { data } = useQuery({ queryKey: ["user", 1], queryFn })
```

#### `createEffectMutation`

Crea una función de mutation que integra Effect con TanStack Query.

```tsx
function createEffectMutation<T, E, A>(effect: (args: A) => Effect<T, E, never>): (args: A) => Promise<T>
```

### Hooks

#### `useEffectQuery`

Hook que combina useQuery con ejecución de Effect.

```tsx
function useEffectQuery<T, E>(
  queryKey: QueryKey,
  effect: Effect<T, E, never>,
  options?: UseQueryOptions<T, E>,
): UseQueryResult<T, E>
```

#### `useEffectMutation`

Hook que combina useMutation con ejecución de Effect.

```tsx
function useEffectMutation<T, E, A>(
  effect: (args: A) => Effect<T, E, never>,
  options?: UseMutationOptions<T, E, A>,
): UseMutationResult<T, E, A>
```

## @effectify/react-ui

### Componentes

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

### Utilidades

#### `cn`

Utilidad para combinar classNames con precedencia adecuada.

```tsx
function cn(...inputs: ClassValue[]): string
```

#### Funciones de validación

```tsx
function validateEmail(email: string): string | undefined
function validateRequired(value: any): string | undefined
function validateMinLength(value: string, min: number): string | undefined
function validateMaxLength(value: string, max: number): string | undefined
```

## @effectify/chat-react

### Componentes

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
