import type { ErrorUtils as ErrorUtilsType } from 'react-native';
import { recordError } from '@temur/shared';

declare const ErrorUtils: ErrorUtilsType | undefined;

export function initErrorCapture() {
  if (typeof ErrorUtils === 'undefined') return;

  const previousHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    recordError(error instanceof Error ? error.message : String(error));
    previousHandler?.(error, isFatal);
  });
}
