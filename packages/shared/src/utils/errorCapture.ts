// A small in-memory ring buffer of recent uncaught errors, for attaching
// to a bug report as diagnostic context. Framework-free — each app wires a
// platform-specific global error hook (window.onerror on web, ErrorUtils
// on mobile) that calls recordError(); nothing here does the capturing
// itself. Module-level state is intentional: this needs to survive across
// component renders/screens for the lifetime of the app session.

export interface CapturedError {
  message: string;
  timestamp: string;
}

const MAX_CAPTURED_ERRORS = 10;

let recentErrors: CapturedError[] = [];

export function recordError(message: string): void {
  const entry: CapturedError = { message, timestamp: new Date().toISOString() };
  recentErrors = [...recentErrors, entry].slice(-MAX_CAPTURED_ERRORS);
}

export function getRecentErrors(): CapturedError[] {
  return recentErrors;
}

export function clearRecentErrors(): void {
  recentErrors = [];
}
