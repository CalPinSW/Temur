import { Alert, AlertButton } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import { useSavedRingerActions } from '@/hooks/useSavedRingerActions';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('useSavedRingerActions', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('handleAddSavedRinger', () => {
    it('saves the trimmed name and calls onSuccess', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { saved_ringers: builder });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useSavedRingerActions('user-1'));

      await act(async () => {
        await result.current.handleAddSavedRinger('  Alex Smith  ', onSuccess);
      });

      expect(builder.upsert).toHaveBeenCalledWith(
        { user_id: 'user-1', name: 'Alex Smith' },
        { onConflict: 'user_id,name' }
      );
      expect(onSuccess).toHaveBeenCalled();
      expect(result.current.isAddingRinger).toBe(false);
    });

    it('does nothing without a logged-in user', async () => {
      const { result } = renderHook(() => useSavedRingerActions(undefined));

      await act(async () => {
        await result.current.handleAddSavedRinger('Alex', jest.fn());
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('does nothing for a blank name', async () => {
      const { result } = renderHook(() => useSavedRingerActions('user-1'));

      await act(async () => {
        await result.current.handleAddSavedRinger('   ', jest.fn());
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('shows an error alert when the save fails', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('boom') });
      mockFromTables(mockSupabase, { saved_ringers: builder });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useSavedRingerActions('user-1'));

      await act(async () => {
        await result.current.handleAddSavedRinger('Alex', onSuccess);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Error', expect.any(String));
    });
  });

  describe('handleDeleteSavedRinger', () => {
    it('asks for confirmation before deleting anything', () => {
      const { result } = renderHook(() => useSavedRingerActions('user-1'));

      result.current.handleDeleteSavedRinger('ringer-1', 'Alex Smith', jest.fn());

      expect(alertSpy).toHaveBeenCalledWith(
        'Remove Ringer',
        expect.stringContaining('Alex Smith'),
        expect.any(Array)
      );
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('deletes the saved ringer and calls onSuccess once confirmed', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { saved_ringers: builder });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useSavedRingerActions('user-1'));

      result.current.handleDeleteSavedRinger('ringer-1', 'Alex Smith', onSuccess);

      const buttons = alertSpy.mock.calls[0][2];
      const removeButton = buttons.find((b: AlertButton) => b.text === 'Remove')!;

      await act(async () => {
        await removeButton.onPress!();
      });

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'ringer-1');
      expect(onSuccess).toHaveBeenCalled();
      expect(result.current.isDeletingRinger).toBe(false);
    });

    it('does not delete anything when cancelled', () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { saved_ringers: builder });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useSavedRingerActions('user-1'));

      result.current.handleDeleteSavedRinger('ringer-1', 'Alex Smith', onSuccess);

      const buttons = alertSpy.mock.calls[0][2];
      const cancelButton = buttons.find((b: AlertButton) => b.text === 'Cancel')!;

      expect(cancelButton.onPress).toBeUndefined();
      expect(builder.delete).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('shows an error alert when the delete fails', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('boom') });
      mockFromTables(mockSupabase, { saved_ringers: builder });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useSavedRingerActions('user-1'));

      result.current.handleDeleteSavedRinger('ringer-1', 'Alex Smith', onSuccess);

      const buttons = alertSpy.mock.calls[0][2];
      const removeButton = buttons.find((b: AlertButton) => b.text === 'Remove')!;

      await act(async () => {
        await removeButton.onPress!();
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Error', expect.any(String));
    });
  });
});
