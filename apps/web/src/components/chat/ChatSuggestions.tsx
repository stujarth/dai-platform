// ---------------------------------------------------------------------------
// DAI Platform -- Chat Suggestions
// ---------------------------------------------------------------------------
// Displays contextual quick-action suggestion chips that the user can click
// to send as a chat message.  Fetches suggestions on mount and whenever the
// wizard step or active table changes.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chat-store';
import { useWizardStore } from '@/stores/wizard-store';
import * as api from '@/lib/api';
import { useSendMessage } from './ChatInput';

// ---------------------------------------------------------------------------
// Step number -> wizard step name mapping (duplicated for independence, but
// kept consistent with ChatInput).
// ---------------------------------------------------------------------------

const STEP_NAME_MAP: Record<number, string> = {
  1: 'connect',
  2: 'connect',
  3: 'explore',
  4: 'transform',
  5: 'visualize',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatSuggestions() {
  const suggestions = useChatStore((s) => s.suggestions);
  const setSuggestions = useChatStore((s) => s.setSuggestions);
  const isLoading = useChatStore((s) => s.isLoading);
  const currentStep = useWizardStore((s) => s.currentStep);
  const activeTable = useWizardStore((s) => s.activeTable);
  const send = useSendMessage();

  // Track the previous step + table combo to avoid redundant fetches
  const prevKeyRef = useRef<string>('');

  useEffect(() => {
    const key = `${currentStep}:${activeTable ?? ''}`;
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    let cancelled = false;

    const fetchSuggestions = async () => {
      try {
        const context: Record<string, unknown> = {
          wizard_step: STEP_NAME_MAP[currentStep] ?? 'connect',
          table_name: activeTable ?? undefined,
        };
        const result = await api.getChatSuggestions(context);
        if (!cancelled && Array.isArray(result)) {
          setSuggestions(result);
        }
      } catch {
        // Silently ignore -- suggestions are non-critical
        if (!cancelled) {
          setSuggestions([]);
        }
      }
    };

    fetchSuggestions();

    return () => {
      cancelled = true;
    };
  }, [currentStep, activeTable, setSuggestions]);

  if (suggestions.length === 0 || isLoading) return null;

  return (
    <div className="border-t border-gray-100 px-4 py-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="h-3 w-3 text-gray-400" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
          Suggestions
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => send(suggestion)}
            className={cn(
              'shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600',
              'hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700',
              'transition-colors whitespace-nowrap',
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
