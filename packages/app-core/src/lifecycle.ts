import type {
  Attachment,
  AttachmentKind,
  InventoryBatch,
  Loan,
  MaintenanceRecord,
  Reminder,
  ReminderStatus,
} from '@inplace/domain';
import type { AppCoreRequest } from './shared';

const toDateString = (value: string | Date | null) => value instanceof Date ? value.toISOString() : value;

export function createLifecycleApi(request: AppCoreRequest) {
  return {
    async uploadAttachment(file: File): Promise<{ url: string; name: string; mimeType: string }> {
      const formData = new FormData();
      formData.append('file', file);
      return request('/v1/uploads/attachments', { method: 'POST', body: formData });
    },

    async listLoans(activeOnly = false): Promise<Loan[]> {
      const response = await request<{ data: Array<{
        id: string; householdId: string; itemId: string; borrowerUserId: string | null;
        borrowerName: string; checkedOutAt: string; dueAt: string | null; returnedAt: string | null;
        notes: string; createdByUserId: string;
      }> }>(`/v1/loans${activeOnly ? '?active=true' : ''}`);
      return response.data.map((row) => ({
        id: row.id, household_id: row.householdId, item_id: row.itemId,
        borrower_user_id: row.borrowerUserId, borrower_name: row.borrowerName,
        checked_out_at: row.checkedOutAt, due_at: row.dueAt, returned_at: row.returnedAt,
        notes: row.notes, created_by_user_id: row.createdByUserId,
      }));
    },

    async createLoan(input: { itemId: string; borrowerUserId?: string | null; borrowerName: string; dueAt?: string | null; notes?: string }) {
      await request('/v1/loans', { method: 'POST', body: JSON.stringify(input) });
    },

    async returnLoan(loanId: string) {
      await request(`/v1/loans/${loanId}/return`, { method: 'POST' });
    },

    async listReminders(dueBefore?: string): Promise<Reminder[]> {
      const suffix = dueBefore ? `?dueBefore=${encodeURIComponent(dueBefore)}` : '';
      const response = await request<{ data: Array<{
        id: string; householdId: string; itemId: string | null; loanId: string | null;
        type: Reminder['type']; sourceKey: string; title: string; description: string;
        dueAt: string; status: Reminder['status']; createdAt: string; updatedAt: string;
      }> }>(`/v1/reminders${suffix}`);
      return response.data.map((row) => ({
        id: row.id, household_id: row.householdId, item_id: row.itemId, loan_id: row.loanId,
        type: row.type, source_key: row.sourceKey, title: row.title, description: row.description,
        due_at: row.dueAt, status: row.status, created_at: row.createdAt, updated_at: row.updatedAt,
      }));
    },

    async updateReminderStatus(reminderId: string, status: ReminderStatus) {
      await request(`/v1/reminders/${reminderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },

    async listAttachments(itemId: string): Promise<Attachment[]> {
      const response = await request<{ data: Array<{
        id: string; householdId: string; itemId: string; kind: AttachmentKind; name: string;
        fileUrl: string; mimeType: string; sizeBytes: number; createdByUserId: string; createdAt: string;
      }> }>(`/v1/items/${itemId}/attachments`);
      return response.data.map((row) => ({
        id: row.id, household_id: row.householdId, item_id: row.itemId, kind: row.kind,
        name: row.name, file_url: row.fileUrl, mime_type: row.mimeType, size_bytes: row.sizeBytes,
        created_by_user_id: row.createdByUserId, created_at: row.createdAt,
      }));
    },

    async createAttachment(itemId: string, input: { kind: AttachmentKind; name: string; fileUrl: string; mimeType: string; sizeBytes: number }) {
      await request(`/v1/items/${itemId}/attachments`, { method: 'POST', body: JSON.stringify(input) });
    },

    async deleteAttachment(attachmentId: string) {
      await request(`/v1/attachments/${attachmentId}`, { method: 'DELETE' });
    },

    async listMaintenance(itemId: string): Promise<MaintenanceRecord[]> {
      const response = await request<{ data: Array<{
        id: string; householdId: string; itemId: string; title: string; notes: string;
        cost: string | number | null; provider: string | null; performedAt: string; nextDueAt: string | null;
        createdByUserId: string; createdAt: string;
      }> }>(`/v1/items/${itemId}/maintenance`);
      return response.data.map((row) => ({
        id: row.id, household_id: row.householdId, item_id: row.itemId, title: row.title,
        notes: row.notes, cost: row.cost === null ? null : Number(row.cost), provider: row.provider,
        performed_at: row.performedAt, next_due_at: row.nextDueAt,
        created_by_user_id: row.createdByUserId, created_at: row.createdAt,
      }));
    },

    async createMaintenance(itemId: string, input: {
      title: string; notes?: string; cost?: number | null; provider?: string | null;
      performedAt: string; nextDueAt?: string | null;
    }) {
      await request(`/v1/items/${itemId}/maintenance`, { method: 'POST', body: JSON.stringify(input) });
    },

    async listBatches(itemId: string): Promise<InventoryBatch[]> {
      const response = await request<{ data: Array<{
        id: string; householdId: string; itemId: string; quantity: number; expiryDate: string | null;
        notes: string; createdAt: string; updatedAt: string;
      }> }>(`/v1/items/${itemId}/batches`);
      return response.data.map((row) => ({
        id: row.id, household_id: row.householdId, item_id: row.itemId, quantity: row.quantity,
        expiry_date: toDateString(row.expiryDate), notes: row.notes, created_at: row.createdAt, updated_at: row.updatedAt,
      }));
    },

    async createBatch(itemId: string, input: { quantity: number; expiryDate?: string | null; notes?: string }) {
      await request(`/v1/items/${itemId}/batches`, { method: 'POST', body: JSON.stringify(input) });
    },
  };
}
