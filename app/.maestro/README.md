# E2E Tests with Maestro

End-to-end tests for critical user flows using [Maestro](https://maestro.mobile.dev/).

## Installation

```bash
# macOS
curl -Ls "https://get.maestro.mobile.dev" | bash

# Or with Homebrew
brew tap mobile-dev-inc/tap
brew install maestro
```

## Running Tests

```bash
# Start the app in the simulator first
cd app && npx expo start

# Run all tests
maestro test .maestro/

# Run a specific test
maestro test .maestro/auth-flow.yaml
```

## Test Files

| File | Description |
|------|-------------|
| `auth-flow.yaml` | Sign up, sign in, sign out |
| `friends-flow.yaml` | Search users, send/accept friend request |
