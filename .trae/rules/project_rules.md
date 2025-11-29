# Project Rules & Guidelines

This document outlines the comprehensive rules, standards, and guidelines for the Bodo TypeScript project. All contributors must follow these standards to ensure code quality, consistency, and maintainability.

## Table of Contents

1. [Code Style & Formatting](#code-style--formatting)
2. [Architecture Patterns](#architecture-patterns)
3. [Naming Conventions](#naming-conventions)
4. [Testing Standards](#testing-standards)
5. [Git Workflow](#git-workflow)
6. [Development Practices](#development-practices)
7. [Security Guidelines](#security-guidelines)
8. [Performance Guidelines](#performance-guidelines)

## Code Style & Formatting

### TypeScript Configuration

- **Strict Type Checking**: All code must pass TypeScript strict mode checks
- **No Implicit Any**: Always explicitly type variables and function parameters
- **Prefer Interfaces**: Use `interface` over `type` for object shapes unless you need union types
- **Import/Export**: Use ES6 module syntax with `.js` extensions for TypeScript files

### ESLint Rules

- Follow the configured ESLint rules in [`eslint.config.js`](eslint.config.js:1)
- Use strict TypeScript ESLint rules for type safety
- No unused variables or imports
- Prefer `const` over `let` when possible
- Use semicolons (enforced by Prettier)

### Prettier Configuration

- **Semicolons**: Disabled (semi: false)
- **Tabs**: 2 spaces, no tabs
- **Quotes**: Use double quotes for strings
- **Trailing Commas**: Use trailing commas where valid
- **Arrow Parentheses**: Avoid parentheses when possible (arrowParens: "avoid")
- **End of Line**: LF (Unix-style)

### Import Organization

- Use the configured import order in [`prettier.config.js`](prettier.config.js:13)
- Group imports: external libraries, then internal modules, then relative imports
- Use absolute imports with `#` prefix for internal modules (configured in [`package.json`](package.json:58))
- Example:

  ```typescript
  import express from "express"
  import helmet from "helmet"

  import { Controller } from "#infrastructures/base/controller.base.js"
  import { ItemsService } from "./items.service.js"
  ```

## Architecture Patterns

### Project Structure

```
src/
├── core/            # Core business logic and types
│   ├── errors/      # Custom error classes
├── infrastructures/ # Infrastructure layer
│   ├── base/        # Base classes (Controller, Service)
│   └── config/      # Configuration files
│   └── database/    # Database-related code
│   └── types/       # TypeScript type definitions
│   └── utilities/   # Utility functions
├── middlewares/     # Express middleware functions
├── modules/         # Feature modules
    └── items/       # Example module
        ├── items.controller.ts
        ├── items.service.ts
        └── items.schema.ts
```

### Layered Architecture

1. **Controller Layer**: Handles HTTP requests and responses
   - Extends [`Controller`](src/infrastructures/base/controller.base.ts:15) base class
   - Uses route definitions with method, path, handler, and optional schema
   - Handles validation and error throwing

2. **Service Layer**: Contains business logic
   - Extends [`Service`](src/infrastructures/base/service.base.ts:3) base class
   - Handles database operations through Kysely
   - Implements CRUD operations and business rules

3. **Schema Layer**: Validation schemas using Zod
   - Define input validation schemas for create, update, query, and params
   - Export inferred types for TypeScript integration

### Dependency Injection

- Use constructor injection for service dependencies
- Services should be instantiated within controllers
- Database connection is injected through the base Service class

### Error Handling

- Use custom error classes from [`base.error.ts`](src/core/errors/base.error.ts:1)
- Throw appropriate errors in controllers and services
- Centralized error handling in [`error.middleware.ts`](src/middlewares/error.middleware.ts:14)
- Log all errors using the configured logger

## Naming Conventions

### Files

- **kebab-case**: Use kebab-case for all file names
- **Descriptive names**: File names should clearly indicate their purpose
- **Index files**: Use `index.ts` for barrel exports when appropriate
- Examples:
  - `items.controller.ts`
  - `validator.middleware.ts`
  - `env.config.ts`

### Classes

- **PascalCase**: Use PascalCase for class names
- **Descriptive names**: Class names should be descriptive and singular
- **Suffixes**: Use appropriate suffixes for clarity
  - Controllers: `ItemsController`
  - Services: `ItemsService`
  - Errors: `NotFoundError`, `BadRequestError`

### Functions and Methods

- **camelCase**: Use camelCase for function and method names
- **Verb-first**: Start with verbs for actions
- **Private methods**: Use private methods with descriptive names
- Examples:
  - `findAll()`, `findById()`, `create()`, `update()`, `delete()`
  - `asyncHandler()`, `bindRoutes()`

### Variables

- **camelCase**: Use camelCase for variable names
- **Descriptive names**: Use descriptive names that indicate purpose
- **Constants**: Use UPPER_SNAKE_CASE for constants
- Examples:
  - `const itemsService = new ItemsService()`
  - `const PORT = 3000`

### Interfaces and Types

- **PascalCase**: Use PascalCase for interface and type names
- **Prefixes**: Use appropriate prefixes for clarity
  - Interfaces: `IUser` (optional) or just `User`
  - Type aliases: `CreateItemInput`, `UpdateItemInput`
  - Generic types: `T`, `K`, `V` for generics

### Database

- **snake_case**: Use snake_case for database table and column names
- **Consistent naming**: Maintain consistency between database and TypeScript
- **Timestamps**: Use `created_at` and `updated_at` for timestamps

## Testing Standards

### Test Structure

- Use Vitest as the testing framework
- Place test files alongside source files with `.test.ts` or `.spec.ts` suffix
- Follow the Arrange-Act-Assert pattern

### Test Coverage

- Aim for minimum 80% code coverage
- Test all public methods and critical business logic
- Test error cases and edge cases
- Use coverage reports to identify untested code

### Test Types

1. **Unit Tests**: Test individual functions and methods in isolation
2. **Integration Tests**: Test interaction between components
3. **API Tests**: Test HTTP endpoints and responses

### Test Examples

```typescript
// Unit test example
import { describe, it, expect } from "vitest"
import { ItemsService } from "./items.service.js"

describe("ItemsService", () => {
  it("should create an item successfully", async () => {
    // Arrange
    const service = new ItemsService()
    const itemData = { name: "Test Item", space_id: 1 }

    // Act
    const result = await service.create(itemData)

    // Assert
    expect(result).toBeDefined()
    expect(result.name).toBe("Test Item")
  })
})
```

### Mocking

- Use Vitest's mocking capabilities for external dependencies
- Mock database operations in service tests
- Mock Express request/response objects in controller tests

## Git Workflow

### Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/\***: Feature branches for new functionality
- **bugfix/\***: Bug fix branches
- **hotfix/\***: Critical fixes for production

### Commit Messages

Follow the Conventional Commits specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(items): add search functionality
fix(auth): resolve token validation issue
docs(api): update endpoint documentation
```

### Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with proper tests
3. Ensure all tests pass and coverage is maintained
4. Create pull request with descriptive title and description
5. Request code review from team members
6. Address feedback and make necessary changes
7. Merge to `develop` after approval

### Code Review Guidelines

- Review for code quality and adherence to standards
- Check for proper error handling
- Verify test coverage and test quality
- Ensure documentation is updated if needed
- Look for potential security issues

## Development Practices

### Environment Management

- Use environment files for different environments:
  - `.env.development`
  - `.env.staging`
  - `.env.production`
- Never commit `.env` files (already in [`.gitignore`](.gitignore:69))
- Use `.env.example` as a template

### Development Scripts

Use the defined npm scripts from [`package.json`](package.json:7):

- `npm run dev`: Development server with hot reload
- `npm run build`: Build for production
- `npm run test`: Run tests in watch mode
- `npm run test:run`: Run tests once
- `npm run lint`: Check code style
- `npm run lint:fix`: Fix linting issues
- `npm run format`: Format code with Prettier

### Database Management

- Use Kysely for type-safe database operations
- Generate type definitions with `npm run db:generate`
- Use migrations for schema changes
- Always validate database operations

### Logging

- Use the configured logger from [`logger.utility.ts`](src/utilities/logger.utility.ts:1)
- Log appropriate levels: `info`, `warn`, `error`
- Include relevant context in log messages
- Avoid logging sensitive information

### Code Organization

- Keep files focused on a single responsibility
- Use barrel exports (`index.ts`) for clean imports
- Group related functionality in modules
- Maintain consistent folder structure across modules

### Documentation

- Use JSDoc comments for public APIs
- Document complex business logic
- Keep README files up to date
- Document configuration options

## Security Guidelines

### Input Validation

- Always validate user input using Zod schemas
- Sanitize data before database operations
- Use parameterized queries to prevent SQL injection
- Validate file uploads and file types

### Authentication & Authorization

- Implement proper authentication mechanisms
- Use JWT tokens for stateless authentication
- Implement role-based access control
- Secure sensitive data with encryption

### Dependencies

- Regularly update dependencies for security patches
- Use `npm audit` to check for vulnerabilities
- Review new dependencies before adding
- Pin dependency versions in production

### Environment Security

- Never expose sensitive data in client-side code
- Use environment variables for secrets
- Implement proper CORS configuration
- Use Helmet.js for security headers

## Performance Guidelines

### Database Optimization

- Use database indexes for frequently queried columns
- Implement pagination for large result sets
- Use connection pooling for database connections
- Optimize queries to avoid N+1 problems

### Caching Strategy

- Implement appropriate caching mechanisms
- Cache frequently accessed data
- Use cache invalidation strategies
- Monitor cache hit rates

### Code Performance

- Avoid blocking operations in request handlers
- Use async/await for asynchronous operations
- Implement proper error handling to avoid memory leaks
- Monitor application performance metrics

### Memory Management

- Avoid memory leaks in long-running processes
- Properly clean up resources and connections
- Use streaming for large data processing
- Monitor memory usage in production

## Tools & Configuration

### Required Tools

- **Node.js**: Version 22+ (as per [`tsconfig.json`](tsconfig.json:2))
- **pnpm**: Package manager (version 10.23.0+)
- **TypeScript**: Version 5.9.3+
- **Vitest**: Testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting

### IDE Configuration

- Use VS Code with recommended extensions
- Configure ESLint and Prettier integrations
- Use TypeScript language server features
- Enable auto-save and format on save

### CI/CD Pipeline

- Run linting and formatting checks
- Execute test suite with coverage
- Build project to ensure no compilation errors
- Run security audits on dependencies

---

**Note**: These rules are living documents and should be updated as the project evolves. All team members should contribute to improving these standards based on experience and best practices.
