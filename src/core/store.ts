import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JournalEntry, TopicId } from './types'

interface LearningState {
  journal: JournalEntry[]
  completed: string[]
  projector: boolean
  addJournal: (entry: Omit<JournalEntry, 'id' | 'at'>) => void
  markComplete: (key: string) => void
  toggleProjector: () => void
  clearProgress: () => void
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set) => ({
      journal: [],
      completed: [],
      projector: false,
      addJournal: (entry) =>
        set((state) => ({
          journal: [
            ...state.journal,
            {
              ...entry,
              id: `${entry.topic}-${Date.now()}-${state.journal.length}`,
              at: Date.now(),
            },
          ].slice(-160),
        })),
      markComplete: (key) =>
        set((state) => ({
          completed: state.completed.includes(key)
            ? state.completed
            : [...state.completed, key],
        })),
      toggleProjector: () => set((state) => ({ projector: !state.projector })),
      clearProgress: () => set({ journal: [], completed: [] }),
    }),
    {
      name: 'mci-learning-v1',
      version: 1,
      partialize: (state) => ({
        journal: state.journal,
        completed: state.completed,
        projector: state.projector,
      }),
    },
  ),
)

export function journalAction(topic: TopicId, message: string) {
  useLearningStore.getState().addJournal({ topic, kind: 'action', message })
}
