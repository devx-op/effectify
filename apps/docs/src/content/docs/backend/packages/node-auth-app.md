---
title: "@effectify/node-auth-app"
description: Complete authentication server application built with Effect and better-auth
---

# @effectify/node-auth-app

The `@effectify/node-auth-app` package provides a complete, production-ready authentication server application built with Effect, better-auth, and modern Node.js patterns. It's designed to be deployed as a standalone service or integrated into existing applications.

## Installation

```bash
npm install @effectify/node-auth-app
```

**Dependencies:**
```bash
npm install express cors helmet dotenv better-auth better-sqlite3
```

## Quick Start

### 1. Environment Setup

Create a `.env` file:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=file:./auth.db

# Authentication
BETTER_AUTH_SECRET=your-super-secret-key-here
BETTER_AUTH_URL=http://localhost:3001
JWT_SECRET=your-jwt-secret-here

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Social Auth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. Basic Usage

```typescript
import { createAuthApp } from '@effectify/node-auth-app'
import { Effect } from 'effect'

// Create and start the auth server
const startAuthServer = Effect.gen(function* () {
  const app = yield* createAuthApp({
    port: 3001,
    corsOrigin: 'http://localhost:3000',
    database: {
      provider: 'sqlite',
      url: 'file:./auth.db'
    }
  })
  
  console.log('Auth server running on port 3001')
  return app
})

Effect.runPromise(startAuthServer)
```

### 3. Custom Configuration

```typescript
import { createAuthApp, AuthAppConfig } from '@effectify/node-auth-app'

const config: AuthAppConfig = {
  port: 3001,
  corsOrigin: ['http://localhost:3000', 'https://myapp.com'],
  database: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL!
  },
  auth: {
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24 // 1 day
    },
    emailVerification: {
      enabled: true,
      expiresIn: 60 * 60 * 24 // 24 hours
    },
    passwordReset: {
      enabled: true,
      expiresIn: 60 * 60 // 1 hour
    }
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }
  },
  email: {
    provider: 'smtp',
    config: {
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT!),
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!
      }
    }
  }
}

const app = await Effect.runPromise(createAuthApp(config))
```

## API Endpoints

The auth app provides the following endpoints:

### Authentication

#### POST `/api/auth/sign-up`

Register a new user with email and password.

```typescript
// Request
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}

// Response
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "session": {
    "id": "session-id",
    "token": "jwt-token",
    "expiresAt": "2024-01-08T00:00:00.000Z"
  }
}
```

#### POST `/api/auth/sign-in`

Sign in with email and password.

```typescript
// Request
{
  "email": "user@example.com",
  "password": "securepassword123"
}

// Response
{
  "user": { /* user object */ },
  "session": { /* session object */ }
}
```

#### POST `/api/auth/sign-out`

Sign out the current user.

```typescript
// Headers
Authorization: Bearer <session-token>

// Response
{
  "success": true
}
```

#### GET `/api/auth/session`

Get current session information.

```typescript
// Headers
Authorization: Bearer <session-token>

// Response
{
  "user": { /* user object */ },
  "session": { /* session object */ }
}
```

### User Management

#### GET `/api/auth/user`

Get current user profile.

```typescript
// Headers
Authorization: Bearer <session-token>

// Response
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "John Doe",
  "emailVerified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### PUT `/api/auth/user`

Update user profile.

```typescript
// Headers
Authorization: Bearer <session-token>

// Request
{
  "name": "John Smith",
  "email": "john.smith@example.com"
}

// Response
{
  "user": { /* updated user object */ }
}
```

#### POST `/api/auth/change-password`

Change user password.

```typescript
// Headers
Authorization: Bearer <session-token>

// Request
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}

// Response
{
  "success": true
}
```

### Email Verification

#### POST `/api/auth/send-verification-email`

Send email verification.

```typescript
// Headers
Authorization: Bearer <session-token>

// Response
{
  "success": true,
  "message": "Verification email sent"
}
```

#### POST `/api/auth/verify-email`

Verify email with token.

```typescript
// Request
{
  "token": "verification-token"
}

// Response
{
  "success": true,
  "user": { /* updated user object */ }
}
```

### Password Reset

#### POST `/api/auth/forgot-password`

Request password reset.

```typescript
// Request
{
  "email": "user@example.com"
}

// Response
{
  "success": true,
  "message": "Password reset email sent"
}
```

#### POST `/api/auth/reset-password`

Reset password with token.

```typescript
// Request
{
  "token": "reset-token",
  "password": "newpassword123"
}

// Response
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Social Authentication

#### GET `/api/auth/github`

Initiate GitHub OAuth flow.

#### GET `/api/auth/github/callback`

GitHub OAuth callback.

#### GET `/api/auth/google`

Initiate Google OAuth flow.

#### GET `/api/auth/google/callback`

Google OAuth callback.

## Integration Examples

### Frontend Integration (React)

```typescript
// auth.ts
const API_BASE = 'http://localhost:3001/api/auth'

export const authAPI = {
  signUp: async (email: string, password: string, name: string) => {
    const response = await fetch(`${API_BASE}/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    })
    return response.json()
  },

  signIn: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    return response.json()
  },

  getSession: async (token: string) => {
    const response = await fetch(`${API_BASE}/session`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.json()
  },

  signOut: async (token: string) => {
    const response = await fetch(`${API_BASE}/sign-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.json()
  }
}

// React hook
import { useState, useEffect } from 'react'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth-token')
    if (token) {
      authAPI.getSession(token)
        .then(data => {
          if (data.user) {
            setUser(data.user)
          } else {
            localStorage.removeItem('auth-token')
          }
        })
        .catch(() => {
          localStorage.removeItem('auth-token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const data = await authAPI.signIn(email, password)
    if (data.session) {
      localStorage.setItem('auth-token', data.session.token)
      setUser(data.user)
    }
    return data
  }

  const signOut = async () => {
    const token = localStorage.getItem('auth-token')
    if (token) {
      await authAPI.signOut(token)
      localStorage.removeItem('auth-token')
      setUser(null)
    }
  }

  return { user, loading, signIn, signOut }
}
```

### SolidJS Integration

```typescript
// auth.ts
import { createSignal, createEffect } from 'solid-js'

export function createAuth() {
  const [user, setUser] = createSignal(null)
  const [loading, setLoading] = createSignal(true)

  createEffect(() => {
    const token = localStorage.getItem('auth-token')
    if (token) {
      authAPI.getSession(token)
        .then(data => {
          if (data.user) {
            setUser(data.user)
          } else {
            localStorage.removeItem('auth-token')
          }
        })
        .catch(() => {
          localStorage.removeItem('auth-token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  })

  const signIn = async (email: string, password: string) => {
    const data = await authAPI.signIn(email, password)
    if (data.session) {
      localStorage.setItem('auth-token', data.session.token)
      setUser(data.user)
    }
    return data
  }

  const signOut = async () => {
    const token = localStorage.getItem('auth-token')
    if (token) {
      await authAPI.signOut(token)
      localStorage.removeItem('auth-token')
      setUser(null)
    }
  }

  return { user, loading, signIn, signOut }
}
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY dist ./dist

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/auth.db

# Start application
CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  auth-server:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/data/auth.db
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=https://auth.yourdomain.com
      - CORS_ORIGIN=https://yourdomain.com
    volumes:
      - auth_data:/app/data
    restart: unless-stopped

volumes:
  auth_data:
```

### Railway Deployment

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

### Vercel Deployment

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ]
}
```

## Configuration Options

### AuthAppConfig Interface

```typescript
interface AuthAppConfig {
  port?: number
  corsOrigin?: string | string[]
  database: {
    provider: 'sqlite' | 'postgresql' | 'mysql'
    url: string
  }
  auth?: {
    session?: {
      expiresIn?: number
      updateAge?: number
    }
    emailVerification?: {
      enabled?: boolean
      expiresIn?: number
    }
    passwordReset?: {
      enabled?: boolean
      expiresIn?: number
    }
  }
  socialProviders?: {
    github?: {
      clientId: string
      clientSecret: string
    }
    google?: {
      clientId: string
      clientSecret: string
    }
  }
  email?: {
    provider: 'smtp' | 'sendgrid' | 'mailgun'
    config: any
  }
  rateLimit?: {
    windowMs?: number
    max?: number
  }
  logging?: {
    level?: 'error' | 'warn' | 'info' | 'debug'
  }
}
```

## Security Features

- **Password Hashing**: Uses bcrypt for secure password hashing
- **JWT Tokens**: Secure session management with JWT
- **Rate Limiting**: Built-in rate limiting for authentication endpoints
- **CORS Protection**: Configurable CORS settings
- **Helmet Security**: Security headers with Helmet.js
- **Input Validation**: Comprehensive input validation
- **SQL Injection Protection**: Parameterized queries
- **Session Management**: Secure session handling with expiration

## Monitoring and Logging

The auth app includes built-in logging and monitoring:

```typescript
// Health check endpoint
GET /health

// Response
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345,
  "database": "connected"
}

// Metrics endpoint (if enabled)
GET /metrics
```

## Examples

Check out the complete implementation:
- [Node Auth App Source](https://github.com/devx-op/effectify/tree/main/apps/node-auth-app)
- [Integration Examples](https://github.com/devx-op/effectify/tree/main/examples/auth-integration)

## Troubleshooting

### Common Issues

1. **Database connection errors**: Check your `DATABASE_URL`
2. **CORS errors**: Verify `CORS_ORIGIN` matches your frontend URL
3. **Email not sending**: Check SMTP configuration
4. **Social auth not working**: Verify OAuth app configuration

### Getting Help

- [GitHub Issues](https://github.com/devx-op/effectify/issues)
- [Discussions](https://github.com/devx-op/effectify/discussions)
- [Documentation](https://effectify.dev/backend/packages/node-auth-app/)
