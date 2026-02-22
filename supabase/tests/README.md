# Edge Function Integration Tests

Tests for Supabase Edge Functions using Deno.

## Prerequisites

- [Deno](https://deno.land/) installed
- Supabase local dev server running (`supabase start`)

## Running Tests

### Against local Supabase

```bash
# Start Supabase locally first
supabase start

# Run tests
cd supabase
deno task test
```

### Against deployed Supabase

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

# Run tests
cd supabase
deno task test
```

## Test Coverage

### avatar-cleanup
- Deleting old avatar file when user changes profile avatar
- Deleting old avatar file when user is deleted

### send-notification
- CORS preflight handling
- Missing push token response
- Request body validation
