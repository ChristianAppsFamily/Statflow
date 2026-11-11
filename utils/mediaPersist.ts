import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Copy a picked media URI into the app documents directory so it survives cache cleanup.
 */
export async function persistLocalFile(
  uri: string,
  folder: string,
  prefix: string
): Promise<string> {
  if (Platform.OS === 'web') return uri;

  try {
    const dir = new Directory(Paths.document, folder);
    if (!dir.exists) {
      dir.create({ intermediates: true });
    }

    const rawExt = uri.split('.').pop()?.split('?')[0] || 'bin';
    const ext = rawExt.length <= 5 ? rawExt : 'bin';
    const destFile = new File(dir, `${prefix}_${Date.now()}.${ext}`);
    new File(uri).copy(destFile);
    return destFile.uri;
  } catch (e) {
    if (__DEV__) console.log('[mediaPersist] Failed to persist file:', e);
    return uri;
  }
}
