import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';
import type { AIRecognitionResult } from '@inplace/domain';
import { ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import type { NormalizedCropBox } from './scanImageCrop';
import { palette } from '@/shared/ui/theme';

export interface DraftRecognition {
  id: string;
  result: AIRecognitionResult;
  selected: boolean;
  saved: boolean;
  editing: boolean;
  imageUri: string | null;
  cropBox: NormalizedCropBox | null;
}

interface ScanRecognitionResultsProps {
  drafts: DraftRecognition[];
  saving: boolean;
  onSaveSelected: () => void;
  onToggleDraft: (draftId: string) => void;
  onToggleEditing: (draftId: string) => void;
  onChangeDraft: (draftId: string, updater: (draft: DraftRecognition) => DraftRecognition) => void;
  onCropDraft: (draftId: string) => void;
}

export function ScanRecognitionResults({
  drafts,
  saving,
  onSaveSelected,
  onToggleDraft,
  onToggleEditing,
  onChangeDraft,
  onCropDraft,
}: ScanRecognitionResultsProps) {
  const selectedCount = drafts.filter((draft) => draft.selected && !draft.saved).length;
  const canSaveSelected = selectedCount > 0 && !saving;

  return (
    <View style={rootStyle}>
      <Pressable
        onPress={onSaveSelected}
        disabled={!canSaveSelected}
        style={[saveButtonStyle, !canSaveSelected ? disabledButtonStyle : null]}
      >
        {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={saveButtonTextStyle}>保存选中 ({selectedCount})</Text>}
      </Pressable>

      {drafts.length === 0 ? (
        <Text style={hintStyle}>暂无结果</Text>
      ) : (
        <View style={listStyle}>
          {drafts.map((draft) => (
            <DraftRecognitionCard
              key={draft.id}
              draft={draft}
              onToggleDraft={onToggleDraft}
              onToggleEditing={onToggleEditing}
              onChangeDraft={onChangeDraft}
              onCropDraft={onCropDraft}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface DraftRecognitionCardProps {
  draft: DraftRecognition;
  onToggleDraft: (draftId: string) => void;
  onToggleEditing: (draftId: string) => void;
  onChangeDraft: (draftId: string, updater: (draft: DraftRecognition) => DraftRecognition) => void;
  onCropDraft: (draftId: string) => void;
}

function DraftRecognitionCard({
  draft,
  onToggleDraft,
  onToggleEditing,
  onChangeDraft,
  onCropDraft,
}: DraftRecognitionCardProps) {
  const typeLabel = ITEM_TYPE_PRESENTATION[draft.result.type ?? 'item'].label;
  const selectedLabel = draft.saved ? '已保存' : draft.selected ? '已选中' : '未选中';

  const handleToggleDraft = () => {
    if (!draft.saved) {
      onToggleDraft(draft.id);
    }
  };

  const handleToggleEditing = () => {
    onToggleEditing(draft.id);
  };

  const handleCropDraft = () => {
    onCropDraft(draft.id);
  };

  return (
    <Pressable
      onPress={handleToggleDraft}
      disabled={draft.saved}
      style={[
        cardStyle,
        draft.selected && !draft.saved ? activeCardStyle : null,
        draft.saved ? savedCardStyle : null,
      ]}
    >
      <View style={cardTopRowStyle}>
        <View style={thumbStyle}>
          {draft.imageUri ? (
            <Image source={{ uri: draft.imageUri }} style={thumbImageStyle} />
          ) : (
            <Ionicons name={draft.result.type === 'container' ? 'cube-outline' : 'pricetag-outline'} size={28} color={palette.textSoft} />
          )}
        </View>

        <View style={contentStyle}>
          <View style={titleRowStyle}>
            <Text numberOfLines={1} style={titleStyle}>{draft.result.name}</Text>
            <View style={typeBadgeStyle}>
              <Text style={typeBadgeTextStyle}>{typeLabel}</Text>
            </View>
          </View>
          <Text numberOfLines={2} style={descriptionStyle}>{draft.result.description || '暂无描述'}</Text>
          <View style={chipRowStyle}>
            {draft.result.category ? <InfoChip label={draft.result.category} tone="neutral" /> : null}
            {draft.result.brand ? <InfoChip label={draft.result.brand} tone="neutral" /> : null}
            {draft.result.tags.slice(0, 2).map((tag) => <InfoChip key={tag} label={tag} tone="brand" />)}
          </View>
        </View>

        <View style={rightRailStyle}>
          <View style={[checkStyle, draft.selected || draft.saved ? checkActiveStyle : null]}>
            {(draft.selected || draft.saved) ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
          </View>
          <Text style={[stateTextStyle, draft.saved ? savedTextStyle : null]}>{selectedLabel}</Text>
        </View>
      </View>

      {!draft.saved ? (
        <View style={actionRowStyle}>
          <Pressable onPress={handleCropDraft} style={actionButtonStyle}>
            <Ionicons name="crop-outline" size={15} color={palette.textMuted} />
            <Text style={actionButtonTextStyle}>裁剪</Text>
          </Pressable>
          <Pressable onPress={handleToggleEditing} style={actionButtonStyle}>
            <Ionicons name="create-outline" size={15} color={palette.textMuted} />
            <Text style={actionButtonTextStyle}>{draft.editing ? '收起' : '编辑'}</Text>
          </Pressable>
        </View>
      ) : null}

      {draft.editing && !draft.saved ? (
        <DraftInlineEditor draft={draft} onChangeDraft={onChangeDraft} />
      ) : null}
    </Pressable>
  );
}

function InfoChip({ label, tone }: { label: string; tone: 'brand' | 'neutral' }) {
  return (
    <View style={[chipStyle, tone === 'brand' ? brandChipStyle : null]}>
      <Text style={[chipTextStyle, tone === 'brand' ? brandChipTextStyle : null]}>{label}</Text>
    </View>
  );
}

function DraftInlineEditor({
  draft,
  onChangeDraft,
}: {
  draft: DraftRecognition;
  onChangeDraft: (draftId: string, updater: (draft: DraftRecognition) => DraftRecognition) => void;
}) {
  const updateResult = (patch: Partial<AIRecognitionResult>) => {
    onChangeDraft(draft.id, (current) => ({
      ...current,
      result: {
        ...current.result,
        ...patch,
      },
    }));
  };

  return (
    <View style={editorStyle}>
      <TextInput value={draft.result.name} onChangeText={(name) => updateResult({ name })} placeholder="名称" style={inputStyle} />
      <TextInput value={draft.result.category} onChangeText={(category) => updateResult({ category })} placeholder="分类" style={inputStyle} />
      <TextInput
        value={draft.result.description}
        onChangeText={(description) => updateResult({ description })}
        placeholder="描述"
        style={[inputStyle, multilineInputStyle]}
        multiline
      />
      <TextInput
        value={draft.result.tags.join(', ')}
        onChangeText={(value) => updateResult({ tags: value.split(',').map((tag) => tag.trim()).filter(Boolean) })}
        placeholder="标签，英文逗号分隔"
        style={inputStyle}
      />
    </View>
  );
}

const rootStyle = {
  gap: 12,
};

const listStyle = {
  gap: 12,
};

const hintStyle = {
  fontSize: 14,
  color: palette.textSoft,
};

const saveButtonStyle = {
  borderRadius: 15,
  backgroundColor: palette.brand,
  paddingVertical: 13,
  alignItems: 'center' as const,
};

const disabledButtonStyle = {
  opacity: 0.55,
};

const saveButtonTextStyle = {
  color: '#ffffff',
  fontSize: 15,
  fontWeight: '700' as const,
};

const cardStyle = {
  borderRadius: 22,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  padding: 12,
  gap: 12,
};

const activeCardStyle = {
  borderColor: '#7dd3fc',
  backgroundColor: palette.brandTint,
};

const savedCardStyle = {
  borderColor: '#bbf7d0',
  opacity: 0.7,
};

const cardTopRowStyle = {
  flexDirection: 'row' as const,
  gap: 12,
  alignItems: 'flex-start' as const,
};

const thumbStyle = {
  width: 72,
  height: 72,
  borderRadius: 18,
  overflow: 'hidden' as const,
  backgroundColor: palette.surfaceMuted,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const thumbImageStyle = {
  width: '100%' as const,
  height: '100%' as const,
};

const contentStyle = {
  flex: 1,
  minWidth: 0,
  gap: 5,
};

const titleRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 7,
};

const titleStyle = {
  flex: 1,
  color: palette.text,
  fontSize: 15,
  fontWeight: '800' as const,
};

const typeBadgeStyle = {
  borderRadius: 999,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 8,
  paddingVertical: 3,
};

const typeBadgeTextStyle = {
  color: palette.textMuted,
  fontSize: 10,
  fontWeight: '700' as const,
};

const descriptionStyle = {
  color: palette.textMuted,
  fontSize: 12,
  lineHeight: 17,
};

const chipRowStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 5,
};

const chipStyle = {
  borderRadius: 999,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 8,
  paddingVertical: 3,
};

const brandChipStyle = {
  backgroundColor: '#e0f2fe',
};

const chipTextStyle = {
  color: palette.textMuted,
  fontSize: 10,
  fontWeight: '700' as const,
};

const brandChipTextStyle = {
  color: '#0284c7',
};

const rightRailStyle = {
  alignItems: 'center' as const,
  gap: 5,
};

const checkStyle = {
  width: 24,
  height: 24,
  borderRadius: 999,
  borderWidth: 2,
  borderColor: palette.border,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const checkActiveStyle = {
  borderColor: palette.brand,
  backgroundColor: palette.brand,
};

const stateTextStyle = {
  color: '#0369a1',
  fontSize: 11,
  fontWeight: '700' as const,
};

const savedTextStyle = {
  color: '#15803d',
};

const actionRowStyle = {
  flexDirection: 'row' as const,
  gap: 8,
};

const actionButtonStyle = {
  flex: 1,
  borderRadius: 13,
  backgroundColor: palette.canvasStrong,
  paddingVertical: 9,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  flexDirection: 'row' as const,
  gap: 6,
};

const actionButtonTextStyle = {
  color: palette.textMuted,
  fontSize: 12,
  fontWeight: '700' as const,
};

const editorStyle = {
  gap: 8,
};

const inputStyle = {
  backgroundColor: palette.surface,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: palette.text,
};

const multilineInputStyle = {
  minHeight: 84,
  textAlignVertical: 'top' as const,
};
