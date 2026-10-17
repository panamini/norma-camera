import { create } from 'zustand';
import { DEFAULT_CANON_ID } from '../composition/canons';
import type { CanonId } from '../composition/types';
import type { DetectionMode } from '../detection/types';

/**
 * The journal module touches the filesystem (expo-file-system), so it loads
 * lazily and strictly fire-and-forget: pure-logic consumers of this store
 * never pull native modules in, and a journal failure degrades to the
 * previous session-only behavior without ever throwing.
 */
async function withJournal(run: (journal: typeof import('../journal/journalStore')) => void): Promise<void> {
  try {
    const journal = await import('../journal/journalStore');
    run(journal);
  } catch {
    // Journal unavailable: stay session-only.
  }
}

export type DebugQualityMode = 'normal' | 'blurry' | 'badExposure' | 'motion';

export type CapturedPhoto = {
  uri: string;
  createdAtMs: number;
  label: string;
  score: number;
  canonId: CanonId;
};

type CameraUiState = {
  canonId: CanonId;
  detectionMode: DetectionMode;
  armed: boolean;
  lastCaptureAtMs: number | null;
  capturedPhotos: CapturedPhoto[];
  debugQualityMode: DebugQualityMode;
  debugPanelsHidden: boolean;
  setCanonId: (canonId: CanonId) => void;
  setDetectionMode: (detectionMode: DetectionMode) => void;
  setArmed: (armed: boolean) => void;
  toggleArmed: () => void;
  hydrateFromJournal: () => void;
  addCapturedPhoto: (photo: CapturedPhoto) => void;
  removeCapturedPhoto: (createdAtMs: number) => void;
  setDebugQualityMode: (mode: DebugQualityMode) => void;
  toggleDebugPanelsHidden: () => void;
};

export const useCameraUiStore = create<CameraUiState>((set) => ({
  canonId: DEFAULT_CANON_ID,
  detectionMode: 'native-heuristic',
  armed: false,
  lastCaptureAtMs: null,
  capturedPhotos: [],
  debugQualityMode: 'normal',
  debugPanelsHidden: true,
  setCanonId: (canonId) => set({ canonId }),
  setDetectionMode: (detectionMode) => set({ detectionMode }),
  setArmed: (armed) => set({ armed }),
  toggleArmed: () => set((state) => ({ armed: !state.armed })),
  hydrateFromJournal: () => {
    // loadJournal never throws; a broken journal hydrates as empty.
    void withJournal((journal) => {
      const journalPhotos = journal.loadJournal();
      if (journalPhotos.length === 0) return;
      set((state) => (state.capturedPhotos.length === 0 ? { capturedPhotos: journalPhotos } : {}));
    });
  },
  addCapturedPhoto: (photo) => {
    set((state) => ({
      capturedPhotos: [photo, ...state.capturedPhotos],
      lastCaptureAtMs: photo.createdAtMs
    }));
    void withJournal((journal) => void journal.appendJournalEntry(photo));
  },
  removeCapturedPhoto: (createdAtMs) => {
    set((state) => ({
      capturedPhotos: state.capturedPhotos.filter((photo) => photo.createdAtMs !== createdAtMs)
    }));
    void withJournal((journal) => void journal.removeJournalEntry(createdAtMs));
  },
  setDebugQualityMode: (debugQualityMode) => set({ debugQualityMode }),
  toggleDebugPanelsHidden: () => set((state) => ({ debugPanelsHidden: !state.debugPanelsHidden }))
}));
