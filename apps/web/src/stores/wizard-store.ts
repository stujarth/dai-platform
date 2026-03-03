// ---------------------------------------------------------------------------
// DAI Platform – Wizard Store (Zustand)
// ---------------------------------------------------------------------------
// Manages the state of the 5-step data wizard flow:
//   1. Select / upload a data source
//   2. Preview & explore the data
//   3. Apply transforms
//   4. Build charts / reports
//   5. Review & publish dashboard
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { DataSource, ChartConfig } from '@/lib/api';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface WizardState {
  /** Current wizard step (1-based, 1–5). */
  currentStep: number;
  /** Steps the user has completed. */
  completedSteps: number[];
  /** The data source the user chose in step 1. */
  selectedSource: DataSource | null;
  /** The table currently being worked on. */
  activeTable: string | null;
  /** Transforms applied during the session. */
  transforms: unknown[];
  /** Charts configured during the session. */
  chartConfigs: ChartConfig[];

  // -- Actions ---------------------------------------------------------------
  setStep: (step: number) => void;
  completeStep: (step: number) => void;
  selectSource: (source: DataSource) => void;
  setActiveTable: (table: string) => void;
  addTransform: (t: unknown) => void;
  addChart: (chart: ChartConfig) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Initial / default values
// ---------------------------------------------------------------------------

const initialState = {
  currentStep: 1,
  completedSteps: [] as number[],
  selectedSource: null as DataSource | null,
  activeTable: null as string | null,
  transforms: [] as unknown[],
  chartConfigs: [] as ChartConfig[],
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWizardStore = create<WizardState>()((set) => ({
  ...initialState,

  setStep: (step) =>
    set({ currentStep: Math.max(1, Math.min(5, step)) }),

  completeStep: (step) =>
    set((state) => ({
      completedSteps: state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step].sort((a, b) => a - b),
    })),

  selectSource: (source) =>
    set({ selectedSource: source }),

  setActiveTable: (table) =>
    set({ activeTable: table }),

  addTransform: (t) =>
    set((state) => ({ transforms: [...state.transforms, t] })),

  addChart: (chart) =>
    set((state) => ({ chartConfigs: [...state.chartConfigs, chart] })),

  reset: () => set({ ...initialState }),
}));
