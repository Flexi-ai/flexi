# Contributing to FlexiAI

Thank you for your interest in contributing to FlexiAI! We welcome contributions from the community and are pleased to have you join us. This document will guide you through the contribution process.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How to Contribute

### Fork and Clone the Repository

1. Fork the repository by clicking the 'Fork' button at the top right of this page
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/FlexiAI.git
   cd FlexiAI
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/Flexi-ai/flexi.git
   ```

### Set Up Development Environment

1. Ensure you have the prerequisites installed:

   - Node.js >= 18.0.0
   - Bun runtime

2. Install dependencies:

   ```bash
   bun install
   ```

3. Create your environment file:

   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`

### Create a New Branch

Create a new branch for your feature or bugfix:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bugfix-name
```

### Make Your Changes

1. Write your code following our coding standards
2. Add or update tests as needed
3. Run the test suite:
   ```bash
   bun run test
   ```
4. Ensure code formatting, linting, and type checking pass:

   ```bash
   bun run format
   bun run lint
   bun run typecheck
   ```

   Make sure there are no type errors before submitting your PR. TypeScript type checking helps catch potential issues early and ensures type safety across the codebase.

### Commit Your Changes

We follow conventional commits for our commit messages. Format your commits as:

```
type(scope): description

[optional body]

[optional footer]
```

Types include:

- feat: A new feature
- fix: A bug fix
- docs: Documentation changes
- style: Code style changes (formatting, etc)
- refactor: Code changes that neither fix a bug nor add a feature
- test: Adding or updating tests
- chore: Changes to build process or auxiliary tools

### Push and Create a Pull Request

1. Push your changes to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

2. Go to the original repository on GitHub
3. Click 'New Pull Request'
4. Select your fork and branch
5. Fill out the PR template with:
   - Description of changes
   - Related issue(s)
   - Breaking changes (if any)
   - Screenshots (if applicable)

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged

## Development Guidelines

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier configurations provided
- Write clear, self-documenting code
- Add comments for complex logic

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Maintain or improve code coverage

### Documentation

- Update README.md if needed
- Document new features or changes in API
- Keep code comments up to date

## Questions or Need Help?

Feel free to open an issue for:

- Bug reports
- Feature requests
- Questions about the codebase

Thank you for contributing to FlexiAI! 🎉
