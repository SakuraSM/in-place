import type { AuthUser } from '@inplace/domain';
import { mobileApiClient } from '@/shared/api/mobileClient';

export async function fetchProfileUpdate(displayName: string) {
  const response = await mobileApiClient.request<{ user: AuthUser }>('/v1/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });

  return response.user;
}

export async function fetchPasswordChange(currentPassword: string, newPassword: string) {
  await mobileApiClient.request<void>('/v1/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
