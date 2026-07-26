import { Image, type ImageProps, type ImageSourcePropType } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { resolveInventoryImageUri } from './mobileInventoryFormat';

function isProtectedUploadUri(uri: string) {
  try {
    return new URL(uri).pathname.startsWith('/api/uploads/');
  } catch {
    return uri.startsWith('/api/uploads/');
  }
}

export function buildAuthenticatedInventoryImageSource(
  url: string | undefined,
  token: string | null | undefined,
): ImageSourcePropType | null {
  const uri = resolveInventoryImageUri(url);
  if (!uri) {
    return null;
  }

  if (!token || !isProtectedUploadUri(uri)) {
    return { uri };
  }

  return {
    uri,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export function InventoryImage({
  url,
  ...imageProps
}: Omit<ImageProps, 'source'> & { url: string | undefined }) {
  const { session } = useAuth();
  const source = buildAuthenticatedInventoryImageSource(url, session?.token);

  if (!source) {
    return null;
  }

  return <Image {...imageProps} source={source} />;
}
