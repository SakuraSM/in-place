import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { Item, ItemCreateInput } from '@inplace/domain';
import { useInventoryForm } from '../form/useInventoryForm';

jest.mock('@/shared/api/mobileClient', () => ({ uploadImageFromUri: jest.fn() }));
jest.mock('@/shared/lib/imagePickerPermission', () => ({ getMediaLibraryPermissionError: async () => null }));

describe('inventory form submission guard', () => {
  it('blocks duplicate save, reset, editing and close until persistence finishes', async () => {
    let complete: (item: Item) => void = () => undefined;
    let payload: ItemCreateInput | undefined;
    const persist = jest.fn((input: ItemCreateInput) => {
      payload = input;
      return new Promise<Item>((resolve) => { complete = resolve; });
    });
    const onClose = jest.fn();
    const onSaved = jest.fn();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { result } = renderHook(() => useInventoryForm({ userId: 'user', canEdit: true, persist, onClose, onSaved }));
    act(() => result.current.update('name', '保留草稿'));
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.save();
      void result.current.save();
      result.current.requestClose();
      result.current.requestReset();
      result.current.update('name', '不应写入');
    });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(result.current.isBusy).toBe(true);
    expect(result.current.draft.name).toBe('保留草稿');
    expect(onClose).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
    await act(async () => {
      if (!payload) throw new Error('Missing captured payload');
      complete({ ...payload, id: 'saved', household_id: 'family', created_at: '', updated_at: '' });
      await pending;
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(result.current.isBusy).toBe(false);
    expect(result.current.isDirty).toBe(false);
    alert.mockRestore();
  });
  it('keeps a failed save editable and rejects read-only mutations', async () => {
    const persist = jest.fn(async (): Promise<Item> => { throw new Error('保存被拒绝'); });
    const { result, rerender } = renderHook(({ canEdit }) => useInventoryForm({ userId: 'user', canEdit, persist, onClose: jest.fn(), onSaved: jest.fn() }), { initialProps: { canEdit: true } });
    act(() => result.current.update('name', '草稿'));
    await act(() => result.current.save());
    expect(result.current.error).toBe('保存被拒绝');
    expect(result.current.isDirty).toBe(true);
    rerender({ canEdit: false });
    await act(() => result.current.save());
    expect(persist).toHaveBeenCalledTimes(1);
    expect(result.current.error).toContain('只读');
  });
});
