import { recordError, getRecentErrors, clearRecentErrors } from '../utils/errorCapture';

describe('errorCapture', () => {
  beforeEach(() => {
    clearRecentErrors();
  });

  it('starts empty', () => {
    expect(getRecentErrors()).toEqual([]);
  });

  it('records an error with a timestamp', () => {
    recordError('boom');
    const errors = getRecentErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('boom');
    expect(errors[0].timestamp).toEqual(expect.any(String));
  });

  it('keeps errors in insertion order', () => {
    recordError('first');
    recordError('second');
    const errors = getRecentErrors();
    expect(errors.map((e) => e.message)).toEqual(['first', 'second']);
  });

  it('caps at the most recent 10 errors', () => {
    for (let i = 0; i < 15; i++) {
      recordError(`error-${i}`);
    }
    const errors = getRecentErrors();
    expect(errors).toHaveLength(10);
    expect(errors[0].message).toBe('error-5');
    expect(errors[9].message).toBe('error-14');
  });

  it('clears all recorded errors', () => {
    recordError('one');
    clearRecentErrors();
    expect(getRecentErrors()).toEqual([]);
  });
});
