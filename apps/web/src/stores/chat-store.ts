// ---------------------------------------------------------------------------
// DAI Platform – Chat Store (Zustand)
// ---------------------------------------------------------------------------
// Holds the state for the AI chat panel: message history, loading indicator,
// panel visibility, and contextual suggestions.
// ---------------------------------------------------------------------------

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessageEntry {
  role: string;
  content: string;
  toolCalls?: unknown[];
}

interface ChatState {
  /** Ordered list of chat messages. */
  messages: ChatMessageEntry[];
  /** Whether the chat panel is open. */
  isOpen: boolean;
  /** Whether a response is currently being streamed. */
  isLoading: boolean;
  /** Contextual follow-up suggestions. */
  suggestions: string[];

  // -- Actions ---------------------------------------------------------------
  addMessage: (msg: ChatMessageEntry) => void;
  /** Append text to the last message (used during streaming). */
  appendToLastMessage: (text: string) => void;
  setLoading: (loading: boolean) => void;
  togglePanel: () => void;
  setOpen: (open: boolean) => void;
  setSuggestions: (s: string[]) => void;
  clearMessages: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],
  isOpen: false,
  isLoading: false,
  suggestions: [],

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  appendToLastMessage: (text) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (!last) return state;
      messages[messages.length - 1] = {
        ...last,
        content: last.content + text,
      };
      return { messages };
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),

  setOpen: (open) => set({ isOpen: open }),

  setSuggestions: (s) => set({ suggestions: s }),

  clearMessages: () => set({ messages: [], suggestions: [] }),
}));
