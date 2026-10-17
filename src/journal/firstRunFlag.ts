import { File, Paths } from 'expo-file-system';

const FLAG_FILE_NAME = 'norma-first-run-done';

/** On any storage error we err on the side of not nagging the user. */
export function hasSeenFirstRun(): boolean {
  try {
    return new File(Paths.document, FLAG_FILE_NAME).exists;
  } catch {
    return true;
  }
}

export function markFirstRunSeen(): void {
  try {
    const file = new File(Paths.document, FLAG_FILE_NAME);
    if (!file.exists) {
      file.create();
      file.write('1');
    }
  } catch {
    // Worst case the coach shows again next launch.
  }
}
