# FlexiAI

FlexiAI is a flexible AI solution that provides a unified interface for multiple AI providers, including OpenAI and Anthropic Claude. It's built with TypeScript and uses the Hono framework for a fast and efficient API server.

## Features

- Multiple AI provider support (OpenAI, Anthropic Claude)
- RESTful API with Swagger documentation
- Built with TypeScript for type safety
- Fast and efficient with Bun runtime
- Comprehensive validation using Zod
- Modern development setup with ESLint and Prettier

## Prerequisites

- Node.js >= 18.0.0
- Bun runtime

## Setup

1. Clone the repository

```bash
git clone https://github.com/yourusername/FlexiAI.git
cd FlexiAI
```

2. Install dependencies

```bash
bun install
```

3. Set up environment variables

```bash
cp .env.example .env
```

Edit the `.env` file and add your API keys for the AI providers you want to use.

## Development

To start the development server with hot reload:

```bash
bun run dev
```

### Other Development Commands

- `bun run typecheck`: Run TypeScript type checking
- `bun run test`: Run tests
- `bun run test:watch`: Run tests in watch mode
- `bun run test:coverage`: Run tests with coverage report
- `bun run format`: Format code with Prettier
- `bun run lint`: Lint and fix code with ESLint

## API Documentation

Once the server is running, you can access the Swagger UI documentation at:

```
http://localhost:3000/swagger
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
