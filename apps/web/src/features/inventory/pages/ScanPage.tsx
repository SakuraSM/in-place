import { useEffect, useRef, useState } from 'react';
import { Camera, Sparkles, Check, Loader2, AlertCircle, Plus, CreditCard as Edit2, Crop, Package, Box } from 'lucide-react';
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingDraft, setEditingDraft] = useState<{ idx: number; result: AIRecognitionResult } | null>(null);
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [croppingDraftIndex, setCroppingDraftIndex] = useState<number | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);

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

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedImage(file);
    setError('');
    setAnalyzing(true);
    setDrafts([]);

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
      setSourceImageUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return URL.createObjectURL(file);
      });
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

    setDrafts((prev) => prev.map((draft, index) => {
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
    }));
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={APP_PAGE_HEADER}>
        <div className={APP_PAGE_HEADER_STACK}>
          <h1 className="text-xl font-bold text-slate-900">AI 扫描</h1>
          <p className="text-slate-400 text-xs mt-0.5">拍照自动识别物品并录入</p>
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
          <div className="grid gap-6 xl:grid-cols-[minmax(420px,0.95fr)_minmax(520px,1.15fr)] xl:items-start">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm xl:sticky xl:top-28"
            >
              {capturedImage ? (
                <div className="relative">
                  <img
                    src={URL.createObjectURL(capturedImage)}
                    alt="拍摄的图片"
                    className="w-full aspect-video object-cover"
                  />
                  {analyzing && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                      <Loader2 size={32} className="text-white animate-spin" />
                      <p className="text-white text-sm font-medium">AI 识别中...</p>
                    </div>
                  )}
                </div>
              ) : (
                <motion.button
                  onClick={() => fileRef.current?.click()}
                  whileHover={{ backgroundColor: '#f0f9ff' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full aspect-video flex flex-col items-center justify-center gap-3 bg-slate-50 transition-colors"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 8 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                    className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center"
                  >
                    <Camera size={28} className="text-sky-500" />
                  </motion.div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-700 mb-0.5">拍摄或选择图片</p>
                    <p className="text-slate-400 text-sm">AI 将自动识别图中物品</p>
                  </div>
                </motion.button>
              )}
            </motion.div>

            {capturedImage && !analyzing && (
              <div className="flex items-start xl:pt-2">
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    setDrafts((prev) => {
                      prev.forEach((draft) => draft.imageUrl && URL.revokeObjectURL(draft.imageUrl));
                      return [];
                    });
                    setError('');
                    setSourceImageUrl((previousUrl) => {
                      if (previousUrl) {
                        URL.revokeObjectURL(previousUrl);
                      }
                      return null;
                    });
                    fileRef.current?.click();
                  }}
                  className="w-full rounded-xl bg-slate-100 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 flex items-center justify-center gap-2"
                >
                  <Camera size={16} />
                  重新拍摄
                </button>
              </div>
            )}
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
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
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

      {croppingDraftIndex !== null && sourceImageUrl && (
        <CropImageSheet
          imageUrl={sourceImageUrl}
          initialCrop={drafts[croppingDraftIndex]?.cropBox ?? null}
          onConfirm={handleManualCrop}
          onClose={() => setCroppingDraftIndex(null)}
        />
      )}
    </div>
  );
}
