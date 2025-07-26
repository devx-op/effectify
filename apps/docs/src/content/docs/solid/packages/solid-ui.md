---
title: "@effectify/solid-ui"
description: Comprehensive UI component library for SolidJS applications
---

# @effectify/solid-ui

The `@effectify/solid-ui` package provides a comprehensive set of UI components built with SolidJS, Kobalte, and Tailwind CSS. It includes forms, layouts, interactive components, and utilities designed to work seamlessly with Effect-based applications and SolidJS's reactive system.

## Installation

```bash
npm install @effectify/solid-ui
```

**Peer Dependencies:**
```bash
npm install solid-js tailwindcss @kobalte/core
```

## Setup

### 1. Configure Tailwind CSS

Add the package to your Tailwind config:

```js
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@effectify/solid-ui/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 2. Import Global Styles

```tsx
// src/index.tsx
import '@effectify/solid-ui/globals.css'
```

## Components

### Form Components

#### Button

```tsx
import { Button } from '@effectify/solid-ui/components/button'

function MyComponent() {
  return (
    <div class="space-x-2">
      <Button variant="default">Default Button</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
    </div>
  )
}
```

#### Input

```tsx
import { Input } from '@effectify/solid-ui/components/input'
import { Label } from '@effectify/solid-ui/components/label'

function LoginForm() {
  return (
    <div class="space-y-4">
      <div>
        <Label for="email">Email</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="Enter your email" 
        />
      </div>
      <div>
        <Label for="password">Password</Label>
        <Input 
          id="password" 
          type="password" 
          placeholder="Enter your password" 
        />
      </div>
    </div>
  )
}
```

#### Form with TanStack Form

```tsx
import { createForm } from '@tanstack/solid-form'
import { Button } from '@effectify/solid-ui/components/button'
import { Input } from '@effectify/solid-ui/components/input'
import { Label } from '@effectify/solid-ui/components/label'

interface LoginData {
  email: string
  password: string
}

function LoginForm() {
  const form = createForm(() => ({
    defaultValues: {
      email: '',
      password: '',
    } as LoginData,
    onSubmit: async ({ value }) => {
      // Handle form submission with Effect
      console.log('Form data:', value)
    },
  }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      class="space-y-4"
    >
      <form.Field
        name="email"
        children={(field) => (
          <div>
            <Label for={field().name}>Email</Label>
            <Input
              id={field().name}
              name={field().name}
              value={field().state.value}
              onBlur={field().handleBlur}
              onInput={(e) => field().handleChange(e.currentTarget.value)}
              type="email"
              placeholder="Enter your email"
            />
            <Show when={field().state.meta.errors.length > 0}>
              <p class="text-sm text-red-600">
                {field().state.meta.errors.join(', ')}
              </p>
            </Show>
          </div>
        )}
      />
      
      <form.Field
        name="password"
        children={(field) => (
          <div>
            <Label for={field().name}>Password</Label>
            <Input
              id={field().name}
              name={field().name}
              value={field().state.value}
              onBlur={field().handleBlur}
              onInput={(e) => field().handleChange(e.currentTarget.value)}
              type="password"
              placeholder="Enter your password"
            />
            <Show when={field().state.meta.errors.length > 0}>
              <p class="text-sm text-red-600">
                {field().state.meta.errors.join(', ')}
              </p>
            </Show>
          </div>
        )}
      />
      
      <Button type="submit">Sign In</Button>
    </form>
  )
}
```

### Layout Components

#### Card

```tsx
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@effectify/solid-ui/components/card'
import { Button } from '@effectify/solid-ui/components/button'

function UserCard(props: { user: User }) {
  return (
    <Card class="w-[350px]">
      <CardHeader>
        <CardTitle>{props.user.name}</CardTitle>
        <CardDescription>{props.user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Member since {props.user.joinDate}</p>
      </CardContent>
      <CardFooter class="flex justify-between">
        <Button variant="outline">Edit</Button>
        <Button>View Profile</Button>
      </CardFooter>
    </Card>
  )
}
```

### Interactive Components

#### Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@effectify/solid-ui/components/dialog'
import { Button } from '@effectify/solid-ui/components/button'
import { createSignal } from 'solid-js'

function DeleteUserDialog(props: { onConfirm: () => void }) {
  const [open, setOpen] = createSignal(false)

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogTrigger as={Button} variant="destructive">
        Delete User
      </DialogTrigger>
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this user? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              props.onConfirm()
              setOpen(false)
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

#### Drawer (Mobile-friendly)

```tsx
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@effectify/solid-ui/components/drawer'
import { Button } from '@effectify/solid-ui/components/button'

function MobileMenu() {
  return (
    <Drawer>
      <DrawerTrigger as={Button} variant="outline">
        Open Menu
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Navigation</DrawerTitle>
          <DrawerDescription>
            Choose where you'd like to go
          </DrawerDescription>
        </DrawerHeader>
        <div class="p-4 space-y-2">
          <Button variant="ghost" class="w-full justify-start">
            Home
          </Button>
          <Button variant="ghost" class="w-full justify-start">
            Profile
          </Button>
          <Button variant="ghost" class="w-full justify-start">
            Settings
          </Button>
        </div>
        <DrawerFooter>
          <Button variant="outline">Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
```

## Reactive Form Patterns

### Form with SolidJS Signals

```tsx
import { createSignal } from 'solid-js'
import { Effect } from 'effect'

const submitLoginEffect = (data: LoginData) =>
  Effect.tryPromise({
    try: () => fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    catch: (error) => new Error(`Login failed: ${error}`)
  })

function ReactiveLoginForm() {
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await Effect.runPromise(
        submitLoginEffect({ email: email(), password: password() })
      )
      // Handle success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div>
        <Label for="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email()}
          onInput={(e) => setEmail(e.currentTarget.value)}
          placeholder="Enter your email"
        />
      </div>
      
      <div>
        <Label for="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password()}
          onInput={(e) => setPassword(e.currentTarget.value)}
          placeholder="Enter your password"
        />
      </div>

      <Show when={error()}>
        <p class="text-sm text-red-600">{error()}</p>
      </Show>

      <Button type="submit" disabled={loading()}>
        {loading() ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  )
}
```

### Form Validation with Effect

```tsx
import { Effect, pipe } from 'effect'

class ValidationError {
  readonly _tag = 'ValidationError'
  constructor(readonly errors: Record<string, string>) {}
}

const validateLoginForm = (data: LoginData) =>
  pipe(
    Effect.succeed(data),
    Effect.flatMap(data => {
      const errors: Record<string, string> = {}
      
      if (!data.email) errors.email = 'Email is required'
      else if (!/\S+@\S+\.\S+/.test(data.email)) errors.email = 'Invalid email'
      
      if (!data.password) errors.password = 'Password is required'
      else if (data.password.length < 6) errors.password = 'Password must be at least 6 characters'
      
      return Object.keys(errors).length > 0
        ? Effect.fail(new ValidationError(errors))
        : Effect.succeed(data)
    })
  )

function ValidatedLoginForm() {
  const [formData, setFormData] = createSignal({ email: '', password: '' })
  const [errors, setErrors] = createSignal<Record<string, string>>({})
  const [loading, setLoading] = createSignal(false)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const validatedData = await Effect.runPromise(
        validateLoginForm(formData())
      )
      
      await Effect.runPromise(submitLoginEffect(validatedData))
      // Handle success
    } catch (err) {
      if (err instanceof ValidationError) {
        setErrors(err.errors)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div>
        <Label for="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData().email}
          onInput={(e) => setFormData(prev => ({ 
            ...prev, 
            email: e.currentTarget.value 
          }))}
          placeholder="Enter your email"
          class={errors().email ? 'border-red-500' : ''}
        />
        <Show when={errors().email}>
          <p class="text-sm text-red-600">{errors().email}</p>
        </Show>
      </div>
      
      <div>
        <Label for="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData().password}
          onInput={(e) => setFormData(prev => ({ 
            ...prev, 
            password: e.currentTarget.value 
          }))}
          placeholder="Enter your password"
          class={errors().password ? 'border-red-500' : ''}
        />
        <Show when={errors().password}>
          <p class="text-sm text-red-600">{errors().password}</p>
        </Show>
      </div>

      <Button type="submit" disabled={loading()}>
        {loading() ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  )
}
```

## Utilities

### Class Name Utilities

```tsx
import { cn } from '@effectify/solid-ui/lib/utils'

function MyComponent(props: { class?: string }) {
  return (
    <div 
      class={cn("default-classes", props.class)} 
    />
  )
}
```

### Validation Utilities

```tsx
import { validateEmail, validateRequired } from '@effectify/solid-ui/lib/validation'

const form = createForm(() => ({
  defaultValues: { email: '' },
  validators: {
    onChange: ({ value }) => ({
      fields: {
        email: validateEmail(value.email) || validateRequired(value.email)
      }
    })
  }
}))
```

## Theming

### CSS Variables

The components use CSS variables for theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  /* ... more variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark theme variables */
}
```

### Component Variants

Components use `class-variance-authority` for variant management:

```tsx
import { Button } from '@effectify/solid-ui/components/button'

// Built-in variants
<Button variant="default">Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Size variants
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon</Button>
```

## Available Components

- **Forms**: Button, Input, Label, Textarea, Select, Checkbox, Radio
- **Layout**: Card, Container, Grid, Stack
- **Navigation**: Tabs, Breadcrumb, Pagination
- **Feedback**: Alert, Toast, Progress, Spinner
- **Overlay**: Dialog, Popover, Tooltip, Sheet, Drawer
- **Data Display**: Table, Badge, Avatar, Separator

## Best Practices

### 1. Use Semantic HTML

```tsx
// Good
<Button type="submit">Submit Form</Button>

// Better
<Button type="submit" aria-label="Submit login form">
  Submit
</Button>
```

### 2. Handle Loading States

```tsx
function SubmitButton(props: { isLoading: boolean }) {
  return (
    <Button disabled={props.isLoading}>
      {props.isLoading ? 'Submitting...' : 'Submit'}
    </Button>
  )
}
```

### 3. Use Reactive Patterns

```tsx
function DynamicForm() {
  const [formType, setFormType] = createSignal<'login' | 'register'>('login')

  return (
    <div>
      <Switch>
        <Match when={formType() === 'login'}>
          <LoginForm />
        </Match>
        <Match when={formType() === 'register'}>
          <RegisterForm />
        </Match>
      </Switch>
    </div>
  )
}
```

## Examples

Check out the complete component usage in:
- [SolidJS SPA example](https://github.com/devx-op/effectify/tree/main/apps/solid-app-spa)
- [SolidJS Start example](https://github.com/devx-op/effectify/tree/main/apps/solid-app-start)
