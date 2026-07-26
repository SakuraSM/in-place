import { useCallback, useEffect, useState } from 'react';
import { Copy, Home, Link2, Plus, Shield, Trash2, Users } from 'lucide-react';
import type { HouseholdMember, HouseholdRole } from '@inplace/domain';
import { useHousehold } from '../../../app/providers/household-context';
import { useToast } from '../../../shared/ui/toast';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import { householdsApi } from '../api';

const ROLE_LABELS: Record<HouseholdRole, string> = {
  owner: 'Owner',
  editor: '可编辑',
  viewer: '只读',
};

export default function HouseholdPage() {
  const { currentHousehold, refreshHouseholds, switchHousehold } = useHousehold();
  const { notify } = useToast();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteId, setInviteId] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshMembers = useCallback(async () => {
    if (!currentHousehold) return;
    try {
      setMembers(await householdsApi.fetchMembers(currentHousehold.id));
    } catch (error) {
      notify({ tone: 'error', title: '成员加载失败', description: error instanceof Error ? error.message : undefined });
    }
  }, [currentHousehold, notify]);

  useEffect(() => {
    void refreshMembers();
  }, [refreshMembers]);

  const createHousehold = async () => {
    if (!newHouseholdName.trim()) return;
    setSaving(true);
    try {
      const household = await householdsApi.createHousehold(newHouseholdName.trim());
      await refreshHouseholds();
      await switchHousehold(household.id);
      setNewHouseholdName('');
      notify({ tone: 'success', title: '家庭空间已创建' });
    } catch (error) {
      notify({ tone: 'error', title: '创建失败', description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const createInvite = async () => {
    if (!currentHousehold) return;
    try {
      const invite = await householdsApi.createInvite({ householdId: currentHousehold.id, role: inviteRole });
      const url = `${window.location.origin}/household/join/${invite.token}`;
      setInviteId(invite.id);
      setInviteUrl(url);
      notify({ tone: 'success', title: '邀请链接已生成', description: '链接 7 天内有效且只能使用一次。' });
    } catch (error) {
      notify({ tone: 'error', title: '邀请创建失败', description: error instanceof Error ? error.message : undefined });
    }
  };

  const updateRole = async (memberId: string, role: 'editor' | 'viewer') => {
    if (!currentHousehold) return;
    try {
      await householdsApi.updateMemberRole({ householdId: currentHousehold.id, memberId, role });
      await refreshMembers();
      notify({ tone: 'success', title: '成员角色已更新' });
    } catch (error) {
      notify({ tone: 'error', title: '角色更新失败', description: error instanceof Error ? error.message : undefined });
    }
  };

  const removeMember = async (member: HouseholdMember) => {
    if (!currentHousehold || !window.confirm(`移除 ${member.display_name || member.email}？`)) return;
    try {
      await householdsApi.removeMember({ householdId: currentHousehold.id, memberId: member.id });
      await refreshMembers();
      notify({ tone: 'success', title: '成员已移除' });
    } catch (error) {
      notify({ tone: 'error', title: '移除失败', description: error instanceof Error ? error.message : undefined });
    }
  };

  const isOwner = currentHousehold?.role === 'owner';

  return (
    <PageShell>
      <PageHeader
        width="standard"
        eyebrow="共享家庭空间"
        title={currentHousehold?.name ?? '家庭成员'}
        titleSize="detail"
      />
      <PageContent width="standard" className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <section className="rounded-3xl border border-borderSoft bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Users className="text-brandStrong" size={22} />
            <div>
              <h2 className="font-bold text-slate-900">成员与权限</h2>
              <p className="text-sm text-slate-500">Viewer 只读，Editor 可维护库存与盘点，Owner 管理成员和危险操作。</p>
            </div>
          </div>
          <div className="mt-5 divide-y divide-borderSoft">
            {members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surfaceMuted text-slate-600">
                  {member.role === 'owner' ? <Shield size={18} /> : <Users size={18} />}
                </span>
                <div className="min-w-[12rem] flex-1">
                  <p className="truncate font-semibold text-slate-900">{member.display_name || member.email.split('@')[0]}</p>
                  <p className="truncate text-xs text-slate-500">{member.email}</p>
                </div>
                {isOwner && member.role !== 'owner' ? (
                  <>
                    <select value={member.role} onChange={(event) => void updateRole(member.id, event.target.value as 'editor' | 'viewer')} className="h-9 rounded-xl border border-border bg-surfaceMuted px-2 text-sm">
                      <option value="editor">可编辑</option>
                      <option value="viewer">只读</option>
                    </select>
                    <button type="button" aria-label={`移除 ${member.email}`} onClick={() => void removeMember(member)} className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button>
                  </>
                ) : <span className="rounded-full bg-surfaceMuted px-2.5 py-1 text-xs font-semibold text-slate-600">{ROLE_LABELS[member.role]}</span>}
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          {isOwner ? (
            <section className="rounded-3xl border border-borderSoft bg-surface p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-bold text-slate-900"><Link2 size={18} />邀请家庭成员</h2>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">加入后的角色</span>
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as 'editor' | 'viewer')} className="h-11 w-full rounded-2xl border border-border bg-surfaceMuted px-3 text-sm">
                  <option value="editor">可编辑</option>
                  <option value="viewer">只读</option>
                </select>
              </label>
              <button type="button" onClick={() => void createInvite()} className="mt-3 h-11 w-full rounded-2xl bg-brandStrong text-sm font-bold text-white">生成一次性邀请链接</button>
              {inviteUrl ? (
                <div className="mt-3 rounded-2xl bg-surfaceMuted p-3">
                  <p className="break-all text-xs text-slate-600">{inviteUrl}</p>
                  <button type="button" onClick={() => void navigator.clipboard.writeText(inviteUrl).then(() => notify({ tone: 'success', title: '链接已复制' }))} className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-brandStrong"><Copy size={15} />复制链接</button>
                  <button
                    type="button"
                    onClick={() => void householdsApi.revokeInvite(currentHousehold.id, inviteId).then(() => {
                      setInviteUrl('');
                      setInviteId('');
                      notify({ tone: 'success', title: '邀请链接已撤销' });
                    })}
                    className="ml-4 mt-2 text-sm font-bold text-rose-600"
                  >
                    撤销
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-3xl border border-borderSoft bg-surface p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-slate-900"><Home size={18} />新家庭空间</h2>
            <input value={newHouseholdName} onChange={(event) => setNewHouseholdName(event.target.value)} placeholder="例如：我们的家" className="mt-4 h-11 w-full rounded-2xl border border-border bg-surfaceMuted px-3 text-sm outline-none focus:border-brand" />
            <button type="button" disabled={saving || !newHouseholdName.trim()} onClick={() => void createHousehold()} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-bold text-white disabled:opacity-50"><Plus size={17} />创建空间</button>
          </section>
        </aside>
      </PageContent>
    </PageShell>
  );
}
