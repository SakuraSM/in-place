import { useEffect, useRef, useState } from 'react';
import { Camera, Sparkles, Check, Loader2, AlertCircle, Plus, CreditCard as Edit2, Crop, Package, Box, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAiAvailability, recognizeItemFromImage } from '../../../legacy/openai';
import { createItem, uploadImage } from '../../../legacy/items';
import { useAuth } from '../../../app/providers/AuthContext';
import type { AIRecognitionResult } from '../../../legacy/database.types';
import ItemForm from '../components/ItemForm';
import type { Item } from '../../../legacy/database.types';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { APP_PAGE_CONTENT, APP_PAGE_HEADER, APP_PAGE_HEADER_STACK } from '../../../shared/ui/pageHeader';
import CropImageSheet from '../components/CropImageSheet';
import { createObjectUrl, cropImageFromFile, fullImageCropBox, normalizeBoundingBox, type NormalizedCropBox } from '../lib/imageCrop';

interface DraftItem {
  result: AIRecognitionResult;
  selected: boolean;
  imageUrl: string;
  imageFile: File | null;
  cropBox: NormalizedCropBox | null;
  saved: boolean;
}

export default function ScanPage() {
  const { user } = useAuth();
  const cameraFileRef = useRef<HTMLInputElement>(null);
  const photoLibraryRef = useRef<HTMLInputElement>(null);
  const activeDraftImageUrlsRef = useRef<string[]>([]);
  const activeSourceImageUrlRef = useRef<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingDraft, setEditingDraft] = useState<{ idx: number; result: AIRecognitionResult } | null>(null);
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [croppingDraftIndex, setCroppingDraftIndex] = useState<number | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [lastPickMode, setLastPickMode] = useState<'camera' | 'album'>('camera');
  const lastPickModeMeta = lastPickMode === 'album'
    ? { retryLabel: '重新选图', icon: ImageIcon }
    : { retryLabel: '重新拍摄', icon: Camera };
  const RetryPickIcon = lastPickModeMeta.icon;

  useEffect(() => {
    let active = true;

    void fetchAiAvailability()
      .then((enabled) => {
        if (active) {
          setAiEnabled(enabled);
        }
      })
      .catch(() => {
        if (active) {
          setAiEnabled(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => {
    activeDraftImageUrlsRef.current.forEach((imageUrl) => {
      URL.revokeObjectURL(imageUrl);
    });

    if (activeSourceImageUrlRef.current) {
      URL.revokeObjectURL(activeSourceImageUrlRef.current);
    }
  }, []);

  const revokeDraftImageUrls = (entries: DraftItem[]) => {
    entries.forEach((draft) => {
      if (draft.imageUrl) {
        URL.revokeObjectURL(draft.imageUrl);
      }
    });
  };

  const rememberDraftImageUrls = (entries: DraftItem[]) => {
    const nextUrls = entries.flatMap((draft) => (draft.imageUrl ? [draft.imageUrl] : []));
    const nextUrlSet = new Set(nextUrls);

    activeDraftImageUrlsRef.current.forEach((imageUrl) => {
      if (!nextUrlSet.has(imageUrl)) {
        URL.revokeObjectURL(imageUrl);
      }
    });

    activeDraftImageUrlsRef.current = nextUrls;
  };

  const replaceSourceImageUrl = (nextUrl: string | null) => {
    if (activeSourceImageUrlRef.current) {
      URL.revokeObjectURL(activeSourceImageUrlRef.current);
    }
    activeSourceImageUrlRef.current = nextUrl;
    setSourceImageUrl(nextUrl);
  };

  const resetScanState = () => {
    setCapturedImage(null);
    setError('');
    setCroppingDraftIndex(null);
    setEditingDraft(null);
    setDrafts((previous) => {
      revokeDraftImageUrls(previous);
      activeDraftImageUrlsRef.current = [];
      return [];
    });
    replaceSourceImageUrl(null);
  };

  const openPicker = (mode: 'camera' | 'album') => {
    setLastPickMode(mode);
    if (mode === 'camera') {
      cameraFileRef.current?.click();
      return;
    }

    photoLibraryRef.current?.click();
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'camera' | 'album') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLastPickMode(mode);
    setCapturedImage(file);
    setError('');
    setAnalyzing(true);
    setEditingDraft(null);
    setCroppingDraftIndex(null);
    setDrafts((previous) => {
      revokeDraftImageUrls(previous);
      activeDraftImageUrlsRef.current = [];
      return [];
    });
    replaceSourceImageUrl(URL.createObjectURL(file));

    try {
      const results = await recognizeItemFromImage(file);
      if (results.length === 0) {
        throw new Error('AI 未识别到可用对象，请更换图片或检查服务端模型返回');
      }
      const nextDrafts = await Promise.all(results.map(async (result) => {
        const cropBox = normalizeBoundingBox(result) ?? fullImageCropBox();
        const imageFile = await cropImageFromFile(file, cropBox, `scan-${result.type ?? 'item'}`);

        return {
          result,
          selected: true,
          imageUrl: await createObjectUrl(imageFile),
          imageFile,
          cropBox,
          saved: false,
        };
      }));
      setDrafts(nextDrafts);
      rememberDraftImageUrls(nextDrafts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI 识别失败，请重试');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setDrafts((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, selected: !d.selected } : d))
    );
  };

  const handleSaveSelected = async () => {
    if (!user) return;
    setSaving(true);
    const selected = drafts.filter((d) => d.selected && !d.saved);
    try {
      await Promise.all(
        selected.map((draft) => {
          const idx = drafts.indexOf(draft);
          return saveDraftWithImage(draft, {
            user_id: user.id,
            parent_id: null,
            type: draft.result.type ?? 'item',
            name: draft.result.name,
            description: draft.result.description,
            category: draft.result.category,
            status: 'in_stock',
            price: draft.result.price ?? null,
            purchase_date: null,
            warranty_date: null,
            images: [],
            tags: draft.result.tags,
            metadata: { ai_recognized: true, brand: draft.result.brand, bounding_box: draft.cropBox, source_image: 'scan' },
          }, { includeDraftImageByDefault: true }).then(() => {
            setDrafts((prev) =>
              prev.map((d, i) => (i === idx ? { ...d, saved: true } : d))
            );
          });
        })
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (data: Omit<Item, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingDraft || !user) return;
    await saveDraftWithImage(drafts[editingDraft.idx], data, { includeDraftImageByDefault: false });
    setDrafts((prev) =>
      prev.map((d, i) => (i === editingDraft.idx ? { ...d, saved: true } : d))
    );
    setEditingDraft(null);
  };

  const handleManualCrop = async (crop: NormalizedCropBox) => {
    if (croppingDraftIndex === null || !capturedImage) {
      return;
    }

    const imageFile = await cropImageFromFile(capturedImage, crop, `scan-manual-${croppingDraftIndex + 1}`);
    const imageUrl = await createObjectUrl(imageFile);

    setDrafts((prev) => {
      const nextDrafts = prev.map((draft, index) => {
        if (index !== croppingDraftIndex) {
          return draft;
        }

        if (draft.imageUrl) {
          URL.revokeObjectURL(draft.imageUrl);
        }

        return {
          ...draft,
          imageFile,
          imageUrl,
          cropBox: crop,
        };
      });

      rememberDraftImageUrls(nextDrafts);
      return nextDrafts;
    });
    setCroppingDraftIndex(null);
  };

  const saveDraftWithImage = async (
    draft: DraftItem,
    data: Omit<Item, 'id' | 'created_at' | 'updated_at'>,
    options: { includeDraftImageByDefault: boolean },
  ) => {
    const uploadedImages = data.images.filter((image) => !image.startsWith('blob:'));
    const draftImageFile = draft.imageFile;
    const currentUser = user;
    const shouldUploadDraftImage =
      Boolean(draftImageFile) &&
      Boolean(currentUser) &&
      (
        options.includeDraftImageByDefault ||
        (Boolean(draft.imageUrl) && data.images.includes(draft.imageUrl))
      );

    if (shouldUploadDraftImage && draftImageFile && currentUser) {
      const uploadedUrl = await uploadImage(draftImageFile, currentUser.id);
      uploadedImages.unshift(uploadedUrl);
    }

    await createItem({
      ...data,
      images: uploadedImages,
    });
  };

  const selectedCount = drafts.filter((d) => d.selected && !d.saved).length;
  const resultCount = drafts.length;
  const blobSourceImageUrl = sourceImageUrl?.startsWith('blob:') ? sourceImageUrl : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={APP_PAGE_HEADER}>
        <div className={APP_PAGE_HEADER_STACK}>
          <h1 className="text-xl font-bold text-slate-900">AI 扫描</h1>
          <p className="text-slate-400 text-xs mt-0.5">拍照或选图自动识别物品并录入</p>
        </div>
      </div>

      <div className={`mx-auto w-full max-w-[1480px] ${APP_PAGE_CONTENT}`}>
        {aiEnabled === false ? (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Sparkles size={22} className="text-amber-500" />
            </div>
            <h3 className="font-semibold text-amber-800 mb-1">AI 功能即将开放</h3>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px] 2xl:grid-cols-[minmax(0,1.2fr)_400px] xl:items-start">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm xl:sticky xl:top-28"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">识别图片</p>
                  <p className="mt-1 text-xs text-slate-400">支持直接拍照，也支持从相册选取已有图片</p>
                </div>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-600">
                  多目标识别
                </span>
              </div>

              {blobSourceImageUrl ? (
                <div className="relative bg-slate-950">
                  <img
                    src={blobSourceImageUrl}
                    alt="待识别图片"
                    className="aspect-[4/3] w-full object-cover xl:aspect-[16/11]"
                  />
                  {analyzing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/65">
                      <Loader2 size={32} className="animate-spin text-white" />
                      <p className="text-sm font-medium text-white">AI 识别中...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 bg-gradient-to-br from-sky-50 via-white to-slate-100 px-6 text-center xl:aspect-[16/11]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-sky-100">
                    <Sparkles size={28} className="text-sky-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-slate-800">拍照或导入一张物品照片</p>
                    <p className="text-sm text-slate-500">AI 会自动识别图片中的多个物品，并生成待保存草稿</p>
                  </div>
                  <div className="grid w-full max-w-sm gap-3 sm:grid-cols-2 xl:hidden">
                    <button
                      type="button"
                      disabled={analyzing}
                      onClick={() => openPicker('camera')}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-medium text-white shadow-sm shadow-sky-200 transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-300"
                    >
                      <Camera size={16} />
                      拍照扫描
                    </button>
                    <button
                      type="button"
                      disabled={analyzing}
                      onClick={() => openPicker('album')}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <ImageIcon size={16} />
                      相册选图
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.04 }}
              className="space-y-4 xl:sticky xl:top-28"
            >
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">开始扫描</p>
                  <p className="text-sm leading-6 text-slate-500">
                    上传一张清晰图片，系统会自动识别物品、分类并生成可编辑的录入草稿。
                  </p>
                </div>

                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={() => openPicker('camera')}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3.5 text-sm font-medium text-white shadow-sm shadow-sky-200 transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-300"
                  >
                    <Camera size={16} />
                    拍照扫描
                  </button>
                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={() => openPicker('album')}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <ImageIcon size={16} />
                    从相册选择
                  </button>
                  {blobSourceImageUrl && !analyzing && (
                    <button
                      type="button"
                      onClick={() => {
                        resetScanState();
                        openPicker(lastPickMode);
                      }}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <RetryPickIcon size={16} />
                      {lastPickModeMeta.retryLabel}
                    </button>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-400">识别结果</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{resultCount}</p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 px-4 py-3">
                    <p className="text-xs text-sky-500">待保存</p>
                    <p className="mt-2 text-2xl font-semibold text-sky-600">{selectedCount}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">建议</p>
                <ul className="mt-3 space-y-3 text-sm text-slate-500">
                  <li className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                    尽量保持物品完整入镜，避免遮挡。
                  </li>
                  <li className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                    PC 端可先从相册导入，再批量确认识别结果。
                  </li>
                  <li className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                    识别后可手动裁图或编辑信息再保存。
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-4 text-sm overflow-hidden"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {drafts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="mt-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">识别结果</h2>
              <span className="text-xs text-slate-400">{drafts.length} 个物品</span>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3"
            >
              {drafts.map((draft, idx) => (
                <motion.div
                  key={idx}
                  variants={staggerItem}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${
                    draft.saved
                      ? 'border-emerald-200 opacity-60'
                      : draft.selected
                      ? 'border-sky-200'
                      : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3 p-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                      {draft.imageUrl ? (
                        <img src={draft.imageUrl} alt={draft.result.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          {draft.result.type === 'container' ? <Box size={28} /> : <Package size={28} />}
                        </div>
                      )}
                    </div>

                    <motion.button
                      onClick={() => !draft.saved && toggleSelect(idx)}
                      disabled={draft.saved}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        draft.saved
                          ? 'bg-emerald-500 border-emerald-500'
                          : draft.selected
                          ? 'bg-sky-500 border-sky-500'
                          : 'border-slate-300'
                      }`}
                    >
                      <AnimatePresence>
                        {(draft.selected || draft.saved) && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                          >
                            <Check size={12} className="text-white" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900 text-sm">{draft.result.name}</p>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                          {(draft.result.type ?? 'item') === 'container' ? '收纳' : '物品'}
                        </span>
                        <AnimatePresence>
                          {draft.saved && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium"
                            >
                              已保存
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <p className="text-xs text-slate-500 mb-1.5">{draft.result.description}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{draft.result.category}</span>
                        {draft.result.brand && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{draft.result.brand}</span>
                        )}
                        {draft.result.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[10px] bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>

                    {!draft.saved && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <motion.button
                          onClick={() => setCroppingDraftIndex(idx)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          title="手动裁图"
                        >
                          <Crop size={14} />
                        </motion.button>
                        <motion.button
                          onClick={() => setEditingDraft({ idx, result: draft.result })}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-sky-50 hover:text-sky-500 transition-colors"
                          title="编辑信息"
                        >
                          <Edit2 size={14} />
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <AnimatePresence>
              {selectedCount > 0 && (
                <motion.button
                  onClick={handleSaveSelected}
                  disabled={saving}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                  className="w-full py-4 bg-sky-500 disabled:bg-sky-300 text-white font-semibold rounded-2xl text-sm shadow-sm shadow-sky-200 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><Loader2 size={16} className="animate-spin" />保存中...</>
                  ) : (
                    <><Plus size={16} />保存选中 ({selectedCount} 个)</>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <input
        ref={cameraFileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => void handleCapture(event, 'camera')}
      />

      <input
        ref={photoLibraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleCapture(event, 'album')}
      />

      {editingDraft && (
        <ItemForm
          initial={{
            type: drafts[editingDraft.idx]?.result.type ?? 'item',
            name: editingDraft.result.name,
            description: editingDraft.result.description,
            category: editingDraft.result.category,
            tags: editingDraft.result.tags,
            status: 'in_stock',
            images: drafts[editingDraft.idx]?.imageUrl ? [drafts[editingDraft.idx].imageUrl] : [],
          }}
          defaultType={drafts[editingDraft.idx]?.result.type ?? 'item'}
          onSave={handleEditSave}
          onClose={() => setEditingDraft(null)}
        />
      )}

      {croppingDraftIndex !== null && blobSourceImageUrl && (
        <CropImageSheet
          imageUrl={blobSourceImageUrl}
          initialCrop={drafts[croppingDraftIndex]?.cropBox ?? null}
          onConfirm={handleManualCrop}
          onClose={() => setCroppingDraftIndex(null)}
        />
      )}
    </div>
  );
}
