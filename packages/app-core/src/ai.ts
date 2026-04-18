import type { AIRecognitionResult, AiSettings, UpdateAiSettingsInput } from '@inplace/domain';
import type { AppCoreRequest } from './shared';

export function createAiApi(request: AppCoreRequest) {
  return {
    async fetchAiAvailability(): Promise<boolean> {
      const data = await request<{ enabled: boolean }>('/v1/ai/status');
      return data.enabled;
    },

    async recognizeItemsFromPreparedImage(imageFile: File): Promise<AIRecognitionResult[]> {
      const formData = new FormData();
      formData.append('image', imageFile);

      const data = await request<{ items: AIRecognitionResult[] }>('/v1/ai/recognize', {
        method: 'POST',
        body: formData,
      });

      return data.items;
    },

    async fetchAiSettings(): Promise<AiSettings> {
      const response = await request<{ data: AiSettings }>('/v1/ai/settings');
      return response.data;
    },

    async updateAiSettings(input: UpdateAiSettingsInput): Promise<AiSettings> {
      const response = await request<{ data: AiSettings }>('/v1/ai/settings', {
        method: 'PUT',
        body: JSON.stringify(input),
      });

      return response.data;
    },

    async resetAiSettings(): Promise<void> {
      await request<void>('/v1/ai/settings', {
        method: 'DELETE',
      });
    },
  };
}
