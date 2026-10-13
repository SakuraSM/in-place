import * as FileSystem from 'expo-file-system';
import { setMobileHouseholdId } from '@/shared/api/mobileClient';
import { exportInventoryFile } from '../mobileDataManagement';

jest.mock('@/platform/auth/secureTokenStorage', () => ({ secureTokenStorage: { get: async () => 'test-token' } }));
jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///qa/', EncodingType: { UTF8: 'utf8' }, writeAsStringAsync: jest.fn(),
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => false }));

afterEach(() => { jest.restoreAllMocks(); setMobileHouseholdId(null); });

describe('household inventory export', () => {
  it.each(['json', 'csv'] as const)('carries the selected household for %s downloads', async (format) => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 200, text: async () => 'synthetic inventory',
    } as Response);
    setMobileHouseholdId('shared-family-b');
    await exportInventoryFile(format);
    const options = fetchMock.mock.calls[0][1];
    const headers = new Headers(options?.headers);
    expect(headers.get('X-InPlace-Household-ID')).toBe('shared-family-b');
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(expect.stringContaining(`.${format}`), 'synthetic inventory', expect.anything());
  });

  it('never saves an HTTP failure as a backup file', async () => {
    jest.mocked(FileSystem.writeAsStringAsync).mockClear();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 403, text: async () => '{"message":"无权访问该家庭"}' } as Response);
    await expect(exportInventoryFile('json')).rejects.toThrow('无权访问该家庭');
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
  });
});
