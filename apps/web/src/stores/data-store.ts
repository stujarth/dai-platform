// ---------------------------------------------------------------------------
// DAI Platform – Data Store (Zustand)
// ---------------------------------------------------------------------------
// Manages the data-exploration state: tables, schema, preview, and ad-hoc
// query results.  Each "fetch" action calls the corresponding API method and
// stores the response in state.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import * as api from '@/lib/api';
import type { TableInfo, ColumnInfo, DataPreview, QueryResult } from '@/lib/api';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface DataState {
  /** Available tables in the data layer. */
  tables: TableInfo[];
  /** Schema (columns) for the currently-selected table. */
  currentSchema: ColumnInfo[] | null;
  /** Data preview rows for the currently-selected table. */
  previewData: DataPreview | null;
  /** Results of the most recent ad-hoc SQL query. */
  queryResults: QueryResult | null;
  /** Global loading flag for async operations in this store. */
  isLoading: boolean;

  // -- Actions ---------------------------------------------------------------
  fetchTables: () => Promise<void>;
  fetchSchema: (table: string) => Promise<void>;
  fetchPreview: (table: string) => Promise<void>;
  runQuery: (sql: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useDataStore = create<DataState>()((set) => ({
  tables: [],
  currentSchema: null,
  previewData: null,
  queryResults: null,
  isLoading: false,

  fetchTables: async () => {
    set({ isLoading: true });
    try {
      const tables = await api.getTables();
      set({ tables });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSchema: async (table) => {
    set({ isLoading: true, currentSchema: null });
    try {
      const currentSchema = await api.getSchema(table);
      set({ currentSchema });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPreview: async (table) => {
    set({ isLoading: true, previewData: null });
    try {
      const previewData = await api.getPreview(table);
      set({ previewData });
    } finally {
      set({ isLoading: false });
    }
  },

  runQuery: async (sql) => {
    set({ isLoading: true, queryResults: null });
    try {
      const queryResults = await api.executeQuery(sql);
      set({ queryResults });
    } finally {
      set({ isLoading: false });
    }
  },
}));
