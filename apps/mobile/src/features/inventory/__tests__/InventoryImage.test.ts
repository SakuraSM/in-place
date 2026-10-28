import { buildAuthenticatedInventoryImageSource } from '../InventoryImage';
import { getMobileApiBaseUrl } from '@/shared/api/mobileClient';

jest.mock('@/providers/AuthProvider', () => ({ useAuth: () => ({ session: null }) }));
jest.mock('@/shared/api/mobileClient', () => ({ getMobileApiBaseUrl: jest.fn(() => 'https://inventory.example.com/api') }));

beforeEach(() => jest.mocked(getMobileApiBaseUrl).mockReturnValue('https://inventory.example.com/api'));

it('authenticates uploaded images on the configured API origin', () => {
  expect(buildAuthenticatedInventoryImageSource('/api/uploads/own/photo.jpg', 'test-session')).toEqual({
    uri: 'https://inventory.example.com/api/uploads/own/photo.jpg?format=jpeg',
    headers: { Authorization: 'Bearer test-session' },
  });
});

it.each([
  'HTTPS://external.example/api/uploads/photo.jpg',
  ' https://external.example/api/uploads/photo.jpg',
])('does not send session credentials to an external image origin: %s', url => {
  expect(buildAuthenticatedInventoryImageSource(url, 'test-session')).toEqual({
    uri: 'https://external.example/api/uploads/photo.jpg?format=jpeg',
  });
});

it('does not attach credentials when the configured API origin cannot be resolved', () => {
  jest.mocked(getMobileApiBaseUrl).mockReturnValue('invalid-base-url');
  expect(buildAuthenticatedInventoryImageSource('https://external.example/api/uploads/photo.jpg', 'test-session')).toEqual({
    uri: 'https://external.example/api/uploads/photo.jpg?format=jpeg',
  });
});
