# FlexiAI

FlexiAI is a flexible AI solution that provides a unified interface for multiple AI providers, including OpenAI, Anthropic. Claude, Gemini, Deepseek, Perplexity, Groq, and AssemblyAI. It offers a RESTful API with Swagger documentation, built with TypeScript for type safety, and fast and efficient with Bun runtime. It also includes comprehensive validation using Zod and a modern development setup with ESLint and Prettier.

## Features

- Multiple AI provider support (OpenAI, Anthropic, Claude, Gemini, Deepseek, Perplexity, Groq, and AssemblyAI)
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
git clone https://github.com/Flexi-ai/flexi.git
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

### Environment Variables Configuration

The following environment variables can be configured in your `.env` file:

| Variable             | Description                             | Default Value | Available Options                 |
| -------------------- | --------------------------------------- | ------------- | --------------------------------- |
| `PORT`               | The port number for the server          | 3000          | Any valid port number             |
| `API_USERNAME`       | Username for API authentication         | -             | Any string                        |
| `API_PASSWORD`       | Password for API authentication         | -             | Any string                        |
| `LOG_LEVEL`          | Controls the verbosity of logging       | info          | error, warn, info, debug, verbose |
| `LOGGING_ENABLED`    | Enable/disable request/response logging | true          | true, false                       |
| `OPENAI_API_KEY`     | Your OpenAI API key                     | -             | Valid API key                     |
| `ANTHROPIC_API_KEY`  | Your Anthropic API key                  | -             | Valid API key                     |
| `GEMINI_API_KEY`     | Your Google Gemini API key              | -             | Valid API key                     |
| `DEEPSEEK_API_KEY`   | Your Deepseek API key                   | -             | Valid API key                     |
| `PERPLEXITY_API_KEY` | Your Perplexity API key                 | -             | Valid API key                     |
| `GROQ_API_KEY`       | Your Groq API key                       | -             | Valid API key                     |
| `ASSEMBLYAI_API_KEY` | Your AssemblyAI API key                 | -             | Valid API key                     |

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

Detailed API documentation is available in the `docs` folder:

- [Provider API Documentation](docs/provider.md) - Endpoints for managing and interacting with AI providers
- [Text Completion API Documentation](docs/text-provider.md) - Endpoints for text completion and chat functionality
- [Audio Transcription API Documentation](docs/audio-provider.md) - Endpoints for audio transcription functionality

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to the project.

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
