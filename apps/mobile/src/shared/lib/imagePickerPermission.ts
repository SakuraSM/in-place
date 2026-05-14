import * as ImagePicker from 'expo-image-picker';

const MEDIA_LIBRARY_PERMISSION_MESSAGE = '未开启相册权限，请到系统设置允许访问相册后再选择图片';

export async function getMediaLibraryPermissionError(): Promise<string | null> {
  const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
  return permission.granted ? null : MEDIA_LIBRARY_PERMISSION_MESSAGE;
}
