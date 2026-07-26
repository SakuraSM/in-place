import type { Household, HouseholdMember, HouseholdRole } from '@inplace/domain';
import type { AppCoreRequest } from './shared';

interface ServerHousehold {
  id: string;
  name: string;
  isPersonal: boolean;
  createdByUserId: string;
  role: HouseholdRole;
  createdAt: string;
  updatedAt: string;
}

interface ServerHouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  displayName: string | null;
  email: string;
  role: HouseholdRole;
  joinedAt: string;
}

function mapHousehold(household: ServerHousehold): Household {
  return {
    id: household.id,
    name: household.name,
    is_personal: household.isPersonal,
    created_by_user_id: household.createdByUserId,
    role: household.role,
    created_at: household.createdAt,
    updated_at: household.updatedAt,
  };
}

function mapMember(member: ServerHouseholdMember): HouseholdMember {
  return {
    id: member.id,
    household_id: member.householdId,
    user_id: member.userId,
    display_name: member.displayName,
    email: member.email,
    role: member.role,
    joined_at: member.joinedAt,
  };
}

export function createHouseholdsApi(request: AppCoreRequest) {
  return {
    async fetchHouseholds(): Promise<Household[]> {
      const response = await request<{ data: ServerHousehold[] }>('/v1/households');
      return response.data.map(mapHousehold);
    },

    async createHousehold(name: string): Promise<Household> {
      const response = await request<{ data: ServerHousehold }>('/v1/households', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      return mapHousehold({ ...response.data, role: 'owner' });
    },

    async fetchMembers(householdId: string): Promise<HouseholdMember[]> {
      const response = await request<{ data: ServerHouseholdMember[] }>(`/v1/households/${householdId}/members`);
      return response.data.map(mapMember);
    },

    async createInvite(input: {
      householdId: string;
      role: Exclude<HouseholdRole, 'owner'>;
    }): Promise<{ id: string; token: string; role: HouseholdRole; expiresAt: string }> {
      const response = await request<{ data: { id: string; token: string; role: HouseholdRole; expiresAt: string } }>(
        `/v1/households/${input.householdId}/invites`,
        { method: 'POST', body: JSON.stringify({ role: input.role }) },
      );
      return response.data;
    },

    async revokeInvite(householdId: string, inviteId: string): Promise<void> {
      await request(`/v1/households/${householdId}/invites/${inviteId}`, { method: 'DELETE' });
    },

    async acceptInvite(token: string): Promise<string> {
      const response = await request<{ data: { householdId: string } }>(`/v1/households/invites/${token}/accept`, {
        method: 'POST',
      });
      return response.data.householdId;
    },

    async updateMemberRole(input: {
      householdId: string;
      memberId: string;
      role: Exclude<HouseholdRole, 'owner'>;
    }): Promise<void> {
      await request(`/v1/households/${input.householdId}/members/${input.memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: input.role }),
      });
    },

    async removeMember(input: { householdId: string; memberId: string }): Promise<void> {
      await request(`/v1/households/${input.householdId}/members/${input.memberId}`, {
        method: 'DELETE',
      });
    },
  };
}
