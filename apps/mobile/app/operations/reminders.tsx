import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from 'react-native';
import type { Reminder, ReminderType } from '@inplace/domain';
import { lifecycleApi } from '@/shared/api/mobileClient';
import { useHousehold } from '@/providers/HouseholdProvider';
import { PageHeader } from '@/shared/ui/PageHeader';
import { CompactListRow } from '@/shared/ui/CompactListRow';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { useNotify } from '@/shared/ui/ToastProvider';
import { palette } from '@/shared/ui/theme';

const REMINDER_PRESENTATION: Record<ReminderType, { label: string; icon: 'shield-checkmark-outline' | 'return-down-back-outline' | 'construct-outline' | 'clipboard-outline' }> = {
  warranty: { label: '保修', icon: 'shield-checkmark-outline' },
  loan: { label: '借用', icon: 'return-down-back-outline' },
  maintenance: { label: '维护', icon: 'construct-outline' },
  stocktake: { label: '久未盘点', icon: 'clipboard-outline' },
};

export default function RemindersScreen() {
  const { canEditInventory, currentHouseholdId } = useHousehold();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const remindersQuery = useQuery({
    queryKey: ['mobile', 'reminders', currentHouseholdId],
    queryFn: () => lifecycleApi.listReminders(),
  });
  const statusMutation = useMutation({
    mutationFn: ({ reminder, nextStatus }: { reminder: Reminder; nextStatus: 'read' | 'unread' }) => (
      lifecycleApi.updateReminderStatus(reminder.id, nextStatus)
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'reminders'] });
    },
    onError: (error) => notify({
      tone: 'error',
      title: '提醒状态更新失败',
      description: error instanceof Error ? error.message : '请稍后重试',
    }),
  });

  if (remindersQuery.isLoading) return <Screen><StateBlock title="加载提醒" loading /></Screen>;
  if (remindersQuery.isError) {
    return <Screen><StateBlock title="提醒加载失败" body={remindersQuery.error instanceof Error ? remindersQuery.error.message : '请稍后重试'} /></Screen>;
  }

  const reminders = remindersQuery.data?.filter((reminder) => reminder.status !== 'dismissed') ?? [];
  const unreadCount = reminders.filter((reminder) => reminder.status === 'unread').length;

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <PageHeader title="提醒" subtitle="保修、借用、维护与盘点" />
      <SectionCard title={`提醒中心 · ${unreadCount} 条未读`} subtitle="保修、借用、维护和久未盘点" density="compact">
        {reminders.length === 0 ? <Text style={emptyTextStyle}>当前没有提醒。</Text> : null}
        {reminders.map((reminder) => {
          const presentation = REMINDER_PRESENTATION[reminder.type];
          return (
            <CompactListRow
              key={reminder.id}
              title={reminder.title}
              subtitle={reminder.description || presentation.label}
              caption={`到期：${new Date(reminder.due_at).toLocaleDateString('zh-CN')}`}
              meta={canEditInventory ? (reminder.status === 'unread' ? '标为已读' : '设为未读') : undefined}
              iconName={presentation.icon}
              selected={reminder.status === 'unread'}
              disabled={statusMutation.isPending}
              onPress={canEditInventory ? () => statusMutation.mutate({
                reminder,
                nextStatus: reminder.status === 'unread' ? 'read' : 'unread',
              }) : undefined}
            />
          );
        })}
      </SectionCard>
    </Screen>
  );
}

const emptyTextStyle = { fontSize: 14, color: palette.textSoft };
