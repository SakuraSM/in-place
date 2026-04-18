import type { ItemType } from './inventory';

export interface AIRecognitionResult {
  type?: ItemType;
  name: string;
  category: string;
  brand?: string;
  description: string;
  tags: string[];
  price?: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface AiSettings {
  baseUrl: string;
  model: string;
  hasStoredApiKey: boolean;
  enabled: boolean;
  source: 'env' | 'user';
}

export interface UpdateAiSettingsInput {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}
