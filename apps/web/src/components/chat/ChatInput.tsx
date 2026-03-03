// ---------------------------------------------------------------------------
// DAI Platform -- Chat Input
// ---------------------------------------------------------------------------
// Auto-growing textarea with send button. Handles message dispatch including
// SSE streaming from the backend and tool call accumulation.
// ---------------------------------------------------------------------------

import { useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/stores/chat-store';
import { useWizardStore } from '@/stores/wizard-store';
import * as api from '@/lib/api';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Step number -> wizard step name mapping
// ---------------------------------------------------------------------------

const STEP_NAME_MAP: Record<number, string> = {
  1: 'connect',
  2: 'connect',
  3: 'explore',
  4: 'transform',
  5: 'visualize',
};

// ---------------------------------------------------------------------------
// Hook: useSendMessage
// ---------------------------------------------------------------------------
// Encapsulates the full send-message flow so it can be reused by both
// ChatInput and ChatSuggestions.
// ---------------------------------------------------------------------------

export function useSendMessage() {
  const {
    messages,
    addMessage,
    appendToLastMessage,
    setLoading,
    isLoading,
  } = useChatStore();
  const { currentStep, activeTable } = useWizardStore();

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      // 1. Add user message
      addMessage({ role: 'user', content: trimmed });

      // 2. Set loading and add placeholder assistant message
      setLoading(true);
      addMessage({ role: 'assistant', content: '', toolCalls: [] });

      // 3. Build context
      const context: Record<string, unknown> = {
        wizard_step: STEP_NAME_MAP[currentStep] ?? 'connect',
        table_name: activeTable ?? undefined,
      };

      // 4. Build history (exclude the empty assistant placeholder)
      const history: api.ChatMessage[] = useChatStore
        .getState()
        .messages.slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        // 5. Stream SSE events
        const stream = api.sendChatMessage(trimmed, history, context);

        for await (const event of stream) {
          if (event.type === 'text' || event.type === 'message') {
            // Append streamed text to the last (assistant) message
            const chunk =
              typeof event.data === 'string'
                ? event.data
                : typeof event.data === 'object' &&
                    event.data !== null &&
                    'text' in event.data
                  ? String((event.data as { text: string }).text)
                  : '';
            if (chunk) {
              appendToLastMessage(chunk);
            }
          } else if (event.type === 'tool_call' || event.type === 'tool_result') {
            // Append to the last message's toolCalls array.
            // Because the store only exposes appendToLastMessage for text,
            // we reach directly into the store to mutate the toolCalls array.
            const state = useChatStore.getState();
            const msgs = [...state.messages];
            const last = msgs[msgs.length - 1];
            if (last) {
              const existingCalls = (last.toolCalls ?? []) as unknown[];

              if (event.type === 'tool_call') {
                // A new tool invocation -- push a new entry
                const newCall = event.data as Record<string, unknown>;
                msgs[msgs.length - 1] = {
                  ...last,
                  toolCalls: [...existingCalls, { ...newCall, result: undefined }],
                };
              } else {
                // tool_result -- attach the result to the most recent tool call
                const calls = [...existingCalls] as Record<string, unknown>[];
                if (calls.length > 0) {
                  calls[calls.length - 1] = {
                    ...calls[calls.length - 1],
                    result: (event.data as Record<string, unknown>).result ?? event.data,
                  };
                }
                msgs[msgs.length - 1] = { ...last, toolCalls: calls };
              }
              useChatStore.setState({ messages: msgs });
            }
          }
          // Other event types (e.g. "done", "error") are silently ignored
        }
      } catch (err) {
        const errorMessage =
          err instanceof api.ApiError
            ? err.message
            : 'Something went wrong. Please try again.';
        const lastMsg = useChatStore.getState().messages.at(-1);
        appendToLastMessage(
          !lastMsg?.content
            ? errorMessage
            : `\n\n---\n\n**Error:** ${errorMessage}`,
        );
        toast.error('Chat request failed', { description: errorMessage });
      } finally {
        setLoading(false);
      }
    },
    [addMessage, appendToLastMessage, setLoading, isLoading, currentStep, activeTable, messages],
  );

  return send;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLoading = useChatStore((s) => s.isLoading);
  const send = useSendMessage();

  // ---- Auto-grow textarea -------------------------------------------------

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = 'auto';
    // Clamp between 1 line (~36px) and 4 lines (~112px)
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, []);

  // ---- Submit on Enter (plain), newline on Shift+Enter --------------------

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const value = textareaRef.current?.value ?? '';
        if (value.trim() && !isLoading) {
          send(value);
          if (textareaRef.current) {
            textareaRef.current.value = '';
            textareaRef.current.style.height = 'auto';
          }
        }
      }
    },
    [send, isLoading],
  );

  const handleSendClick = useCallback(() => {
    const value = textareaRef.current?.value ?? '';
    if (value.trim() && !isLoading) {
      send(value);
      if (textareaRef.current) {
        textareaRef.current.value = '';
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [send, isLoading]);

  return (
    <div className="flex items-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder="Ask DAI anything..."
        className={cn(
          'flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm',
          'placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'min-h-[36px] max-h-[112px]',
        )}
        disabled={isLoading}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <Button
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={isLoading}
        onClick={handleSendClick}
        aria-label="Send message"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
