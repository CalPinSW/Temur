type ToastListener = (message: string) => void;

let listener: ToastListener | null = null;

// A module-level singleton rather than React context: showToast() needs
// to be callable from the class-based ErrorBoundary's lifecycle methods,
// which can't use hooks. ToastHost is the sole subscriber, mounted once
// near the app root.
export function showToast(message: string): void {
  listener?.(message);
}

export function subscribeToast(fn: ToastListener): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}
