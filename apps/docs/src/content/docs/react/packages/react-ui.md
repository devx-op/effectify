---
title: "@effectify/react-ui"
description: Comprehensive UI component library for React applications
---

# @effectify/react-ui

The `@effectify/react-ui` package provides a comprehensive set of UI components built with React, Radix UI, and Tailwind CSS. It includes forms, layouts, interactive components, and utilities designed to work seamlessly with Effect-based applications.

## Installation

```bash
npm install @effectify/react-ui
```

**Peer Dependencies:**

```bash
npm install react react-dom tailwindcss
```

## Setup

### 1. Configure Tailwind CSS

Add the package to your Tailwind config:

```js
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@effectify/react-ui/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 2. Import Global Styles

```tsx
// src/index.tsx or src/main.tsx
import "@effectify/react-ui/globals.css"
```

## Components

### Form Components

#### Button

```tsx
import { Button } from "@effectify/react-ui/components/button"

function MyComponent() {
  return (
    <div>
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
import { Input } from "@effectify/react-ui/components/input"
import { Label } from "@effectify/react-ui/components/label"

function LoginForm() {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
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
import { useForm } from "@tanstack/react-form"
import { Button } from "@effectify/react-ui/components/button"
import { Input } from "@effectify/react-ui/components/input"
import { Label } from "@effectify/react-ui/components/label"

interface LoginData {
  email: string
  password: string
}

function LoginForm() {
  const form = useForm<LoginData>({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      // Handle form submission with Effect
      console.log("Form data:", value)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      <form.Field
        name="email"
        children={(field) => (
          <div>
            <Label htmlFor={field.name}>Email</Label>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              type="email"
              placeholder="Enter your email"
            />
            {field.state.meta.errors && (
              <p className="text-sm text-red-600">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      />

      <form.Field
        name="password"
        children={(field) => (
          <div>
            <Label htmlFor={field.name}>Password</Label>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              type="password"
              placeholder="Enter your password"
            />
            {field.state.meta.errors && (
              <p className="text-sm text-red-600">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
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
  CardTitle,
} from "@effectify/react-ui/components/card"
import { Button } from "@effectify/react-ui/components/button"

function UserCard({ user }) {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Member since {user.joinDate}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
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
} from "@effectify/react-ui/components/dialog"
import { Button } from "@effectify/react-ui/components/button"

function DeleteUserDialog({ onConfirm }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete User</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this user? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## Hooks

### useAppForm

A custom hook that integrates TanStack Form with common patterns:

```tsx
import { useAppForm } from "@effectify/react-ui/hooks/use-app-form"
import { Effect } from "effect"

const submitLoginEffect = (data: LoginData) =>
  Effect.tryPromise({
    try: () =>
      fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json()),
    catch: (error) => new Error(`Login failed: ${error}`),
  })

function LoginForm() {
  const form = useAppForm({
    defaultValues: { email: "", password: "" },
    onSubmit: (data) => Effect.runPromise(submitLoginEffect(data)),
  })

  return (
    <form onSubmit={form.handleSubmit} className="space-y-4">
      {/* form fields */}
    </form>
  )
}
```

## Utilities

### Class Name Utilities

```tsx
import { cn } from "@effectify/react-ui/lib/utils"

function MyComponent({ className, ...props }) {
  return (
    <div
      className={cn("default-classes", className)}
      {...props}
    />
  )
}
```

### Validation Utilities

```tsx
import { validateEmail, validateRequired } from "@effectify/react-ui/lib/validation"

const form = useForm({
  defaultValues: { email: "" },
  validators: {
    onChange: ({ value }) => ({
      fields: {
        email: validateEmail(value.email) || validateRequired(value.email),
      },
    }),
  },
})
```

## Theming

### CSS Variables

The components use CSS variables for theming. You can customize the theme by overriding these variables:

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
import { Button } from '@effectify/react-ui/components/button'

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
function SubmitButton({ isLoading }) {
  return (
    <Button disabled={isLoading}>
      {isLoading ? "Submitting..." : "Submit"}
    </Button>
  )
}
```

### 3. Use Form Validation

```tsx
const form = useForm({
  validators: {
    onChange: ({ value }) => ({
      fields: {
        email: !value.email ?
          "Email is required" :
          !validateEmail(value.email)
          ? "Invalid email"
          : undefined,
      },
    }),
  },
})
```

## Available Components

- **Forms**: Button, Input, Label, Textarea, Select, Checkbox, Radio
- **Layout**: Card, Container, Grid, Stack
- **Navigation**: Tabs, Breadcrumb, Pagination
- **Feedback**: Alert, Toast, Progress, Spinner
- **Overlay**: Dialog, Popover, Tooltip, Sheet
- **Data Display**: Table, Badge, Avatar, Separator

## Examples

Check out the [React SPA example](https://github.com/devx-op/effectify/tree/main/apps/react-app-spa) for complete component usage examples.
