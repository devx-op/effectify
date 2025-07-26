---
title: Getting Started with Backend
description: Learn how to set up Effectify in your Node.js backend application
---

# Getting Started with Backend

This guide will help you get started with Effectify in your Node.js backend application. We'll walk through setting up the basic dependencies and creating your first Effect-powered backend service.

## Prerequisites

Before you begin, make sure you have:

- Node.js 18 or later
- Basic knowledge of Node.js and TypeScript
- Familiarity with backend development concepts

## Installation

Choose the packages you need for your project:

### Core Authentication Package

For authentication with better-auth and Effect:

```bash
npm install @effectify/node-better-auth better-auth effect
```

### Complete Auth App

For a ready-to-deploy authentication service:

```bash
npm install @effectify/node-auth-app
```

### Additional Dependencies

You'll likely need these common dependencies:

```bash
npm install express cors helmet dotenv
npm install -D @types/express @types/cors typescript ts-node nodemon
```

## Basic Setup

### 1. Project Structure

Create a well-organized project structure:

```
my-backend/
├── src/
│   ├── config/
│   │   └── index.ts
│   ├── services/
│   │   ├── auth.ts
│   │   └── user.ts
│   ├── repositories/
│   │   └── user.ts
│   ├── routes/
│   │   └── auth.ts
│   ├── middleware/
│   │   └── auth.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── .env
```

### 2. TypeScript Configuration

Create a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. Environment Configuration

Create a `.env` file:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
JWT_SECRET=your-super-secret-jwt-key
BETTER_AUTH_SECRET=your-better-auth-secret
BETTER_AUTH_URL=http://localhost:3000
```

### 4. Basic Server Setup

Create `src/index.ts`:

```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { Effect, Layer } from 'effect'
import { config } from './config'
import { authRoutes } from './routes/auth'

const app = express()

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Routes
app.use('/auth', authRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
const startServer = Effect.gen(function* () {
  const { port } = yield* config
  
  return yield* Effect.async<void>((resume) => {
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`)
      resume(Effect.succeed(void 0))
    })
    
    server.on('error', (error) => {
      resume(Effect.fail(error))
    })
  })
})

// Run the server
Effect.runPromise(startServer).catch(console.error)
```

## Configuration Management

Create `src/config/index.ts`:

```typescript
import { Effect, Context } from 'effect'

// Define configuration interface
export interface AppConfig {
  readonly port: number
  readonly nodeEnv: string
  readonly database: {
    readonly url: string
  }
  readonly auth: {
    readonly jwtSecret: string
    readonly betterAuthSecret: string
    readonly betterAuthUrl: string
  }
}

// Create configuration context
export class AppConfigService extends Context.Tag("AppConfigService")<
  AppConfigService,
  AppConfig
>() {}

// Load configuration with validation
export const loadConfig = Effect.gen(function* () {
  const port = Number(process.env.PORT) || 3000
  const nodeEnv = process.env.NODE_ENV || 'development'
  
  const databaseUrl = yield* Effect.fromNullable(process.env.DATABASE_URL).pipe(
    Effect.orElseFail(() => new Error('DATABASE_URL is required'))
  )
  
  const jwtSecret = yield* Effect.fromNullable(process.env.JWT_SECRET).pipe(
    Effect.orElseFail(() => new Error('JWT_SECRET is required'))
  )
  
  const betterAuthSecret = yield* Effect.fromNullable(process.env.BETTER_AUTH_SECRET).pipe(
    Effect.orElseFail(() => new Error('BETTER_AUTH_SECRET is required'))
  )
  
  const betterAuthUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
  
  return {
    port,
    nodeEnv,
    database: { url: databaseUrl },
    auth: { jwtSecret, betterAuthSecret, betterAuthUrl }
  } satisfies AppConfig
})

// Create configuration layer
export const AppConfigLive = Layer.effect(AppConfigService, loadConfig)

// Export config for direct use
export const config = AppConfigService
```

## Error Handling

Create `src/types/errors.ts`:

```typescript
import { Data } from 'effect'

// Base application error
export class AppError extends Data.TaggedError("AppError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

// Authentication errors
export class AuthenticationError extends Data.TaggedError("AuthenticationError")<{
  readonly message: string
}> {}

export class AuthorizationError extends Data.TaggedError("AuthorizationError")<{
  readonly message: string
}> {}

// Validation errors
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly errors: Record<string, string>
}> {}

// Database errors
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

// User-related errors
export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string
}> {}

export class UserAlreadyExistsError extends Data.TaggedError("UserAlreadyExistsError")<{
  readonly email: string
}> {}
```

## User Service Example

Create `src/services/user.ts`:

```typescript
import { Effect, Context } from 'effect'
import { UserNotFoundError, UserAlreadyExistsError, ValidationError } from '../types/errors'

// User types
export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserData {
  email: string
  name: string
  password: string
}

// User repository interface
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User | null, DatabaseError>
    readonly findByEmail: (email: string) => Effect.Effect<User | null, DatabaseError>
    readonly create: (data: CreateUserData) => Effect.Effect<User, DatabaseError>
    readonly update: (id: string, data: Partial<User>) => Effect.Effect<User, DatabaseError>
    readonly delete: (id: string) => Effect.Effect<void, DatabaseError>
  }
>() {}

// Password service interface
export class PasswordService extends Context.Tag("PasswordService")<
  PasswordService,
  {
    readonly hash: (password: string) => Effect.Effect<string, never>
    readonly verify: (password: string, hash: string) => Effect.Effect<boolean, never>
  }
>() {}

// User service implementation
export const UserService = {
  // Get user by ID
  getById: (id: string) =>
    Effect.gen(function* () {
      const userRepo = yield* UserRepository
      const user = yield* userRepo.findById(id)
      
      if (!user) {
        yield* Effect.fail(new UserNotFoundError({ userId: id }))
      }
      
      return user
    }),

  // Create new user
  create: (data: CreateUserData) =>
    Effect.gen(function* () {
      const userRepo = yield* UserRepository
      const passwordService = yield* PasswordService
      
      // Validate input
      const validation = yield* validateCreateUserData(data)
      
      // Check if user already exists
      const existingUser = yield* userRepo.findByEmail(validation.email)
      if (existingUser) {
        yield* Effect.fail(new UserAlreadyExistsError({ email: validation.email }))
      }
      
      // Hash password
      const hashedPassword = yield* passwordService.hash(validation.password)
      
      // Create user
      const user = yield* userRepo.create({
        ...validation,
        password: hashedPassword
      })
      
      return user
    }),

  // Update user
  update: (id: string, data: Partial<User>) =>
    Effect.gen(function* () {
      const userRepo = yield* UserRepository
      
      // Ensure user exists
      yield* UserService.getById(id)
      
      // Update user
      const updatedUser = yield* userRepo.update(id, data)
      
      return updatedUser
    }),

  // Delete user
  delete: (id: string) =>
    Effect.gen(function* () {
      const userRepo = yield* UserRepository
      
      // Ensure user exists
      yield* UserService.getById(id)
      
      // Delete user
      yield* userRepo.delete(id)
    })
}

// Validation helper
const validateCreateUserData = (data: CreateUserData) =>
  Effect.gen(function* () {
    const errors: Record<string, string> = {}
    
    if (!data.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
      errors.email = 'Invalid email format'
    }
    
    if (!data.name) {
      errors.name = 'Name is required'
    } else if (data.name.length < 2) {
      errors.name = 'Name must be at least 2 characters'
    }
    
    if (!data.password) {
      errors.password = 'Password is required'
    } else if (data.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }
    
    if (Object.keys(errors).length > 0) {
      yield* Effect.fail(new ValidationError({ errors }))
    }
    
    return data
  })
```

## HTTP Routes

Create `src/routes/auth.ts`:

```typescript
import { Router } from 'express'
import { Effect } from 'effect'
import { UserService } from '../services/user'
import { ValidationError, UserAlreadyExistsError } from '../types/errors'

export const authRoutes = Router()

// Register endpoint
authRoutes.post('/register', (req, res) => {
  Effect.runPromise(
    UserService.create(req.body).pipe(
      Effect.map(user => {
        // Don't return password in response
        const { password, ...userWithoutPassword } = user
        res.status(201).json({ user: userWithoutPassword })
      }),
      Effect.catchTag('ValidationError', error =>
        Effect.sync(() => res.status(400).json({ errors: error.errors }))
      ),
      Effect.catchTag('UserAlreadyExistsError', error =>
        Effect.sync(() => res.status(409).json({ 
          error: `User with email ${error.email} already exists` 
        }))
      ),
      Effect.catchAll(error =>
        Effect.sync(() => {
          console.error('Registration error:', error)
          res.status(500).json({ error: 'Internal server error' })
        })
      )
    )
  )
})

// Get user endpoint
authRoutes.get('/user/:id', (req, res) => {
  Effect.runPromise(
    UserService.getById(req.params.id).pipe(
      Effect.map(user => res.json({ user })),
      Effect.catchTag('UserNotFoundError', error =>
        Effect.sync(() => res.status(404).json({ 
          error: `User with ID ${error.userId} not found` 
        }))
      ),
      Effect.catchAll(error =>
        Effect.sync(() => {
          console.error('Get user error:', error)
          res.status(500).json({ error: 'Internal server error' })
        })
      )
    )
  )
})
```

## Running the Application

### Development Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  }
}
```

### Start Development Server

```bash
npm run dev
```

Your server should now be running on `http://localhost:3000`!

## Testing Your Setup

Test the health endpoint:

```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Next Steps

Now that you have the basics set up, explore the specific packages:

- [Node Better Auth](/backend/packages/node-better-auth/) - Learn authentication patterns
- [Node Auth App](/backend/packages/node-auth-app/) - Explore the complete auth service
- [Backend Reference](/backend/reference/) - Dive into the API documentation

## Common Patterns

### Database Integration

```typescript
import { Pool } from 'pg'

const makeDatabaseService = Effect.gen(function* () {
  const config = yield* AppConfigService
  const pool = new Pool({ connectionString: config.database.url })
  
  return {
    query: <T>(sql: string, params: any[] = []) =>
      Effect.tryPromise({
        try: () => pool.query(sql, params).then(result => result.rows as T[]),
        catch: (error) => new DatabaseError({ 
          message: 'Database query failed', 
          cause: error 
        })
      })
  }
})
```

### Middleware Integration

```typescript
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  Effect.runPromise(
    validateAuthToken(req.headers.authorization).pipe(
      Effect.map(user => {
        req.user = user
        next()
      }),
      Effect.catchAll(error => Effect.sync(() => 
        res.status(401).json({ error: 'Unauthorized' })
      ))
    )
  )
}
```

## Troubleshooting

### Common Issues

1. **Environment variables not loading**: Make sure to install and configure `dotenv`
2. **TypeScript compilation errors**: Check your `tsconfig.json` configuration
3. **Effect context errors**: Ensure all services are properly provided
4. **Database connection issues**: Verify your `DATABASE_URL` is correct

### Getting Help

If you run into issues:

- Check the [GitHub Issues](https://github.com/devx-op/effectify/issues)
- Join the [Discussions](https://github.com/devx-op/effectify/discussions)
- Review the package-specific documentation
- Ask in the [Effect Discord](https://discord.gg/effect-ts)
