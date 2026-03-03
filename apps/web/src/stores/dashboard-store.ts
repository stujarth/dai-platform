// ---------------------------------------------------------------------------
// DAI Platform – Dashboard Store (Zustand)
// ---------------------------------------------------------------------------
// Manages the charts and metrics that make up the user's dashboard.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import * as api from '@/lib/api';
import type { ChartConfig, MetricConfig, DashboardConfig } from '@/lib/api';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface DashboardState {
  /** Charts currently on the dashboard. */
  charts: ChartConfig[];
  /** Metric cards on the dashboard. */
  metrics: MetricConfig[];
  /** Whether a dashboard generation request is in flight. */
  isGenerating: boolean;

  // -- Actions ---------------------------------------------------------------
  addChart: (chart: ChartConfig) => void;
  removeChart: (id: string) => void;
  setDashboard: (d: DashboardConfig) => void;
  generateDashboard: (table: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useDashboardStore = create<DashboardState>()((set) => ({
  charts: [],
  metrics: [],
  isGenerating: false,

  addChart: (chart) =>
    set((state) => ({ charts: [...state.charts, chart] })),

  removeChart: (id) =>
    set((state) => ({
      charts: state.charts.filter((c) => c.id !== id),
    })),

  setDashboard: (d) =>
    set({ charts: d.charts, metrics: d.metrics }),

  generateDashboard: async (table) => {
    set({ isGenerating: true });
    try {
      const dashboard = await api.generateDashboard(table);
      set({ charts: dashboard.charts, metrics: dashboard.metrics });
    } finally {
      set({ isGenerating: false });
    }
  },
}));
