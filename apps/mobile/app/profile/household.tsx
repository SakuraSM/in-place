import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Share, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { Household, HouseholdMember, HouseholdRole } from '@inplace/domain';
import { householdsApi, saveMobileHouseholdId } from '@/shared/api/mobileClient';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { CompactListRow } from '@/shared/ui/CompactListRow';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { FormField } from '@/shared/ui/FormField';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { useNotify } from '@/shared/ui/ToastProvider';
import { palette } from '@/shared/ui/theme';

type InviteRecord = Awaited<ReturnType<typeof householdsApi.createInvite>>;

const ROLE_LABELS: Record<HouseholdRole, string> = {
  owner: '所有者',
  editor: '可编辑',
  viewer: '只读',
};

export default function HouseholdScreen() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [invite, setInvite] = useState<InviteRecord | null>(null);
  const [removeTarget, setRemoveTarget] = useState<HouseholdMember | null>(null);

  const householdsQuery = useQuery({
    queryKey: ['mobile', 'households'],
    queryFn: () => householdsApi.fetchHouseholds(),
  });
  useEffect(() => {
    const firstHousehold = householdsQuery.data?.[0];
    if (!selectedHouseholdId && firstHousehold) setSelectedHouseholdId(firstHousehold.id);
  }, [householdsQuery.data, selectedHouseholdId]);
  const selectedHousehold = householdsQuery.data?.find((household) => household.id === selectedHouseholdId) ?? null;
  const membersQuery = useQuery({
    queryKey: ['mobile', 'household-members', selectedHouseholdId],
    enabled: Boolean(selectedHouseholdId),
    queryFn: () => householdsApi.fetchMembers(selectedHouseholdId!),
  });

  const createMutation = useMutation({
    mutationFn: () => householdsApi.createHousehold(householdName.trim()),
    onSuccess: async (household) => {
      setCreateOpen(false);
      setHouseholdName('');
      setSelectedHouseholdId(household.id);
      await householdsQuery.refetch();
      notify({ tone: 'success', title: '家庭空间已创建', description: household.name });
    },
    onError: (error) => notify({ tone: 'error', title: '创建失败', description: error instanceof Error ? error.message : '请稍后重试' }),
  });
  const inviteMutation = useMutation({
    mutationFn: () => householdsApi.createInvite({ householdId: selectedHouseholdId!, role: inviteRole }),
    onSuccess: (createdInvite) => {
      setInvite(createdInvite);
      notify({ tone: 'success', title: '邀请已生成' });
    },
    onError: (error) => notify({ tone: 'error', title: '邀请生成失败', description: error instanceof Error ? error.message : '请稍后重试' }),
  });
  const memberMutation = useMutation({
    mutationFn: async ({ member, action }: { member: HouseholdMember; action: 'role' | 'remove' }) => {
      if (action === 'remove') {
        await householdsApi.removeMember({ householdId: selectedHouseholdId!, memberId: member.id });
        return;
      }
      await householdsApi.updateMemberRole({
        householdId: selectedHouseholdId!,
        memberId: member.id,
        role: member.role === 'editor' ? 'viewer' : 'editor',
      });
    },
    onSuccess: async () => {
      setRemoveTarget(null);
      await membersQuery.refetch();
      notify({ tone: 'success', title: '成员设置已更新' });
    },
    onError: (error) => notify({ tone: 'error', title: '成员设置失败', description: error instanceof Error ? error.message : '请稍后重试' }),
  });

  if (householdsQuery.isLoading) return <Screen><StateBlock title="加载家庭空间" loading /></Screen>;
  if (householdsQuery.isError) {
    return <Screen><StateBlock title="加载失败" body={householdsQuery.error instanceof Error ? householdsQuery.error.message : '请稍后重试'} /></Screen>;
  }

  const switchHousehold = async (household: Household) => {
    await saveMobileHouseholdId(household.id);
    setSelectedHouseholdId(household.id);
    await queryClient.invalidateQueries({ queryKey: ['mobile'] });
    notify({ tone: 'success', title: `已切换到${household.name}` });
  };
  const inviteUrl = invite ? `inplace://household/join/${invite.token}` : '';
  const shareInvite = async () => {
    await Share.share({ message: `加入我的归位家庭空间：${inviteUrl}` });
  };
  const revokeInvite = async () => {
    if (!invite || !selectedHouseholdId) return;
    try {
      await householdsApi.revokeInvite(selectedHouseholdId, invite.id);
      setInvite(null);
      notify({ tone: 'success', title: '邀请已撤销' });
    } catch (error) {
      notify({ tone: 'error', title: '撤销失败', description: error instanceof Error ? error.message : '请稍后重试' });
    }
  };

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <Stack.Screen options={{ title: '家庭空间', headerShown: true }} />
      <SectionCard title="家庭空间" subtitle="切换后库存操作只影响当前家庭" density="compact">
        {(householdsQuery.data ?? []).map((household) => (
          <CompactListRow
            key={household.id}
            title={household.name}
            subtitle={`${household.is_personal ? '个人空间' : '共享空间'} · ${ROLE_LABELS[household.role]}`}
            iconName={household.is_personal ? 'person-outline' : 'people-outline'}
            selected={household.id === selectedHouseholdId}
            meta={household.id === selectedHouseholdId ? '当前' : '切换'}
            onPress={() => void switchHousehold(household)}
          />
        ))}
        <Pressable onPress={() => setCreateOpen(true)} style={secondaryButtonStyle}>
          <Ionicons name="add" size={18} color={palette.brandStrong} />
          <Text style={secondaryButtonTextStyle}>创建家庭空间</Text>
        </Pressable>
      </SectionCard>

      {selectedHousehold ? (
        <>
          <SectionCard title={`成员 ${membersQuery.data?.length ?? 0}`} subtitle={selectedHousehold.name} density="dense" headerMode="compact">
            {membersQuery.isLoading ? <StateBlock title="加载成员" loading /> : null}
            {membersQuery.data?.map((member) => (
              <CompactListRow
                key={member.id}
                title={member.display_name || member.email}
                subtitle={member.display_name ? member.email : ROLE_LABELS[member.role]}
                meta={ROLE_LABELS[member.role]}
                iconName="person-circle-outline"
                right={selectedHousehold.role === 'owner' && member.role !== 'owner' ? (
                  <View style={memberActionsStyle}>
                    <Pressable onPress={() => memberMutation.mutate({ member, action: 'role' })} style={miniButtonStyle}>
                      <Text style={miniButtonTextStyle}>{member.role === 'editor' ? '设只读' : '设编辑'}</Text>
                    </Pressable>
                    <Pressable onPress={() => setRemoveTarget(member)} style={dangerButtonStyle}>
                      <Ionicons name="close" size={16} color={palette.danger} />
                    </Pressable>
                  </View>
                ) : undefined}
              />
            ))}
          </SectionCard>

          {selectedHousehold.role === 'owner' ? (
            <SectionCard title="邀请成员" subtitle="邀请链接一次有效，可随时撤销" density="compact">
              <View style={roleRowStyle}>
                {(['editor', 'viewer'] as const).map((role) => (
                  <Pressable key={role} onPress={() => setInviteRole(role)} style={[roleButtonStyle, inviteRole === role ? activeRoleStyle : null]}>
                    <Text style={inviteRole === role ? activeRoleTextStyle : roleTextStyle}>{ROLE_LABELS[role]}</Text>
                  </Pressable>
                ))}
              </View>
              {!invite ? (
                <Pressable disabled={inviteMutation.isPending} onPress={() => inviteMutation.mutate()} style={primaryButtonStyle}>
                  <Text style={primaryButtonTextStyle}>{inviteMutation.isPending ? '生成中…' : '生成邀请'}</Text>
                </Pressable>
              ) : (
                <View style={inviteBoxStyle}>
                  <Text selectable style={inviteUrlStyle}>{inviteUrl}</Text>
                  <View style={memberActionsStyle}>
                    <Pressable onPress={() => void Clipboard.setStringAsync(inviteUrl).then(() => notify({ tone: 'success', title: '邀请链接已复制' }))} style={miniButtonStyle}><Text style={miniButtonTextStyle}>复制</Text></Pressable>
                    <Pressable onPress={() => void shareInvite()} style={miniButtonStyle}><Text style={miniButtonTextStyle}>分享</Text></Pressable>
                    <Pressable onPress={() => void revokeInvite()} style={dangerMiniStyle}><Text style={dangerTextStyle}>撤销</Text></Pressable>
                  </View>
                </View>
              )}
            </SectionCard>
          ) : null}
        </>
      ) : null}

      <BottomSheet visible={createOpen} title="创建家庭空间" onClose={() => setCreateOpen(false)}>
        <FormField label="空间名称" value={householdName} onChangeText={setHouseholdName} placeholder="例如：我们的家" autoFocus />
        <Pressable disabled={!householdName.trim() || createMutation.isPending} onPress={() => createMutation.mutate()} style={primaryButtonStyle}>
          <Text style={primaryButtonTextStyle}>{createMutation.isPending ? '创建中…' : '创建'}</Text>
        </Pressable>
      </BottomSheet>
      <ConfirmDialog
        visible={Boolean(removeTarget)}
        title="移除成员"
        message={`确认将 ${removeTarget?.display_name || removeTarget?.email || ''} 移出家庭空间？`}
        confirmLabel={memberMutation.isPending ? '移除中…' : '移除'}
        danger
        loading={memberMutation.isPending}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) memberMutation.mutate({ member: removeTarget, action: 'remove' });
        }}
      />
    </Screen>
  );
}

const secondaryButtonStyle = { minHeight: 44, borderRadius: 14, backgroundColor: palette.brandTint, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 7 };
const secondaryButtonTextStyle = { fontSize: 14, fontWeight: '900' as const, color: palette.brandStrong };
const primaryButtonStyle = { minHeight: 46, borderRadius: 15, backgroundColor: palette.brandStrong, alignItems: 'center' as const, justifyContent: 'center' as const };
const primaryButtonTextStyle = { fontSize: 14, fontWeight: '900' as const, color: '#ffffff' };
const memberActionsStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 };
const miniButtonStyle = { borderRadius: 10, backgroundColor: palette.canvasStrong, paddingHorizontal: 9, paddingVertical: 7 };
const miniButtonTextStyle = { fontSize: 11, fontWeight: '800' as const, color: palette.textMuted };
const dangerButtonStyle = { width: 30, height: 30, borderRadius: 10, backgroundColor: palette.dangerTint, alignItems: 'center' as const, justifyContent: 'center' as const };
const roleRowStyle = { flexDirection: 'row' as const, gap: 8 };
const roleButtonStyle = { flex: 1, minHeight: 40, borderRadius: 13, backgroundColor: palette.surfaceMuted, alignItems: 'center' as const, justifyContent: 'center' as const };
const activeRoleStyle = { backgroundColor: palette.brandTint, borderWidth: 1, borderColor: palette.brand };
const roleTextStyle = { fontSize: 13, fontWeight: '800' as const, color: palette.textMuted };
const activeRoleTextStyle = { fontSize: 13, fontWeight: '900' as const, color: palette.brandStrong };
const inviteBoxStyle = { gap: 10, borderRadius: 14, backgroundColor: palette.surfaceMuted, padding: 12 };
const inviteUrlStyle = { fontSize: 12, lineHeight: 18, color: palette.textMuted };
const dangerMiniStyle = { borderRadius: 10, backgroundColor: palette.dangerTint, paddingHorizontal: 9, paddingVertical: 7 };
const dangerTextStyle = { fontSize: 11, fontWeight: '900' as const, color: palette.danger };
