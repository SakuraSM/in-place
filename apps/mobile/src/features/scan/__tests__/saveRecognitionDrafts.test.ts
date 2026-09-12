import type { Item, ItemCreateInput } from '@inplace/domain';
import type { DraftRecognition } from '../ScanRecognitionResults';
import { applySavedRecognitionDrafts, saveRecognitionDrafts } from '../saveRecognitionDrafts';

function draft(id: string): DraftRecognition {
  return {
    id, selected: true, saved: false, editing: false, imageUri: `file:///${id}.jpg`, cropBox: null,
    result: { name: id, description: '', category: '数码', tags: [], type: 'item', brand: '' },
  };
}

describe('recognition draft recovery', () => {
  it('keeps successful item IDs and retries only failed drafts', async () => {
    let drafts = [draft('a'), draft('b'), draft('c')];
    let shouldFail = true;
    const upload = jest.fn(async (asset: { uri: string }) => `https://inventory.test/${asset.uri.split('/').pop()}`);
    const create = jest.fn(async (payload: ItemCreateInput): Promise<Item> => {
      if (payload.name === 'b' && shouldFail) throw new Error('创建失败');
      return { ...payload, id: `saved-${payload.name}`, household_id: 'household-1', created_at: '', updated_at: '' };
    });

    const first = await saveRecognitionDrafts({ drafts, userId: 'user', upload, create });
    drafts = applySavedRecognitionDrafts(drafts, first);
    expect(drafts.map((entry) => entry.saved)).toEqual([true, false, true]);
    expect(drafts[0].savedItemId).toBe('saved-a');
    expect(first.failed.map((entry) => entry.id)).toEqual(['b']);

    shouldFail = false;
    const retry = await saveRecognitionDrafts({ drafts, userId: 'user', upload, create });
    drafts = applySavedRecognitionDrafts(drafts, retry);
    expect(create.mock.calls.map(([payload]) => payload.name)).toEqual(['a', 'b', 'c', 'b']);
    expect(drafts.every((entry) => entry.saved)).toBe(true);
  });

  it('does not create inventory when image upload fails', async () => {
    const create = jest.fn();
    const result = await saveRecognitionDrafts({
      drafts: [draft('a')], userId: 'user', create,
      upload: async () => { throw new Error('图片上传失败'); },
    });
    expect(create).not.toHaveBeenCalled();
    expect(result.succeeded).toHaveLength(0);
    expect(result.failed.map((entry) => entry.id)).toEqual(['a']);
  });
});
