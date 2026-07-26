import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHousehold } from '../../../app/providers/household-context';
import { householdsApi } from '../api';

export default function AcceptInvitePage() {
  const { token = '' } = useParams();
  const { refreshHouseholds, switchHousehold } = useHousehold();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    void householdsApi.acceptInvite(token).then(async (householdId) => {
      await refreshHouseholds();
      await switchHousehold(householdId);
      navigate('/household', { replace: true });
    }).catch((inviteError) => setError(inviteError instanceof Error ? inviteError.message : '邀请链接无效或已使用'));
  }, [navigate, refreshHouseholds, switchHousehold, token]);

  return (
    <div className="app-page-gutter flex min-h-dvh items-center justify-center bg-canvas py-5 md:py-6">
      <div className="w-full max-w-md rounded-3xl border border-borderSoft bg-surface p-7 text-center shadow-sm">
        <Users size={34} className="mx-auto text-brandStrong" />
        <h1 className="mt-3 text-xl font-bold text-slate-900">{error ? '无法加入家庭空间' : '正在加入家庭空间…'}</h1>
        {error ? <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p> : <p className="mt-2 text-sm text-slate-500">正在验证一次性邀请链接</p>}
      </div>
    </div>
  );
}
