import { describe, expect, it } from 'vitest';
import type { AppEnv } from '../env.js';
import { resolveExistingUploadPath } from './uploads.js';

const env = {
  MAX_UPLOAD_SIZE_MB: 10,
} as AppEnv;

describe('upload filesystem containment', () => {
  it('rejects encoded traversal before reading a backup asset', async () => {
    await expect(resolveExistingUploadPath(env, '..%2f..%2f.env'))
      .rejects.toThrow('非法的上传文件路径');
  });

  it('rejects encoded backslashes', async () => {
    await expect(resolveExistingUploadPath(env, '..%5c..%5c.env'))
      .rejects.toThrow('非法的上传文件路径');
  });
});
