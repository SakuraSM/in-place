import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createInventoryDraft, getInventoryDraftScope, toInventoryItemInput, validateInventoryDraft, type InventoryDraft, type InventoryDraftErrors } from '@inplace/app-core';
import type { CategoryScope, Item, ItemCreateInput, ItemType } from '@inplace/domain';
import { getMediaLibraryPermissionError } from '@/shared/lib/imagePickerPermission';
import { uploadImageFromUri } from '@/shared/api/mobileClient';

const MAX_IMAGE_SIZE_BYTES = 10_485_760;
const IMAGE_PICKER_QUALITY = 0.82;
interface InventoryFormOptions {
  item?: Item;
  parentId?: string | null;
  type?: ItemType;
  userId?: string;
  canEdit: boolean;
  persist: (payload: ItemCreateInput) => Promise<Item>;
  onSaved: (item: Item) => void;
  onClose: () => void;
}

export interface InventoryFormController {
  draft: InventoryDraft;
  errors: InventoryDraftErrors;
  error: string | null;
  isBusy: boolean;
  isDirty: boolean;
  expanded: boolean;
  scope: CategoryScope;
  setExpanded: (expanded: boolean) => void;
  update: <Key extends keyof InventoryDraft>(field: Key, value: InventoryDraft[Key]) => void;
  changeKind: (scope: CategoryScope) => void;
  save: () => Promise<void>;
  pickImage: () => Promise<void>;
  requestClose: () => void;
  requestReset: () => void;
}

export function useInventoryForm(options: InventoryFormOptions): InventoryFormController {
  const { onClose } = options;
  const [baseline, setBaseline] = useState(() => createInventoryDraft(options));
  const [draft, setDraft] = useState(baseline);
  const [errors, setErrors] = useState<InventoryDraftErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const busy = useRef(false);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  const update: InventoryFormController['update'] = (field, value) => {
    if (busy.current || !options.canEdit) return;
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setError(null);
  };
  const changeKind = (scope: CategoryScope) => {
    if (busy.current || !options.canEdit || options.item) return;
    setDraft((current) => ({ ...current, type: scope === 'item' ? 'item' : 'container', isLocation: scope === 'location', category: '' }));
    setErrors({});
    setError(null);
  };

  const requestClose = useCallback(() => {
    if (busy.current) return;
    if (!isDirty) { onClose(); return; }
    Alert.alert('放弃修改？', '尚未保存的内容将被丢弃。', [
      { text: '继续编辑', style: 'cancel' },
      { text: '放弃修改', style: 'destructive', onPress: onClose },
    ]);
  }, [isDirty, onClose]);

  const requestReset = () => {
    if (busy.current || !options.canEdit || !isDirty) return;
    Alert.alert('重置表单？', '恢复打开表单时的内容。', [
      { text: '取消', style: 'cancel' },
      { text: '重置', style: 'destructive', onPress: () => { setDraft(baseline); setErrors({}); setError(null); } },
    ]);
  };

  const save = async () => {
    if (busy.current) return;
    if (!options.userId || !options.canEdit) { setError('当前家庭为只读，无法保存库存'); return; }
    const validation = validateInventoryDraft(draft);
    setErrors(validation);
    if (Object.keys(validation).length) {
      setError(Object.values(validation)[0] ?? '请检查表单');
      setExpanded(true);
      return;
    }
    busy.current = true;
    setIsBusy(true);
    setError(null);
    let saved: Item | undefined;
    try {
      saved = await options.persist(toInventoryItemInput({ draft, userId: options.userId }));
      const next = createInventoryDraft({ item: saved });
      setBaseline(next);
      setDraft(next);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '保存失败，请重试');
    } finally {
      busy.current = false;
      setIsBusy(false);
    }
    if (saved) options.onSaved(saved);
  };

  const pickImage = async () => {
    if (busy.current || !options.canEdit) return;
    busy.current = true;
    setIsBusy(true);
    setError(null);
    try {
      const permissionError = await getMediaLibraryPermissionError();
      if (permissionError) throw new Error(permissionError);
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: IMAGE_PICKER_QUALITY });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;
      if ((asset.type && asset.type !== 'image') || (asset.mimeType && !asset.mimeType.startsWith('image/'))) throw new Error('仅支持上传图片文件');
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE_BYTES) throw new Error('图片不能超过 10MB，请压缩后重试');
      const url = await uploadImageFromUri({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
      setDraft((current) => ({ ...current, images: [...current.images, url] }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '图片上传失败，请重试');
    } finally {
      busy.current = false;
      setIsBusy(false);
    }
  };

  return { draft, errors, error, isBusy, isDirty, expanded, setExpanded, scope: getInventoryDraftScope(draft), update, changeKind, save, pickImage, requestClose, requestReset };
}
