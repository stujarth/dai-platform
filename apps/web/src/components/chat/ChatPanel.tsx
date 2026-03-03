// ---------------------------------------------------------------------------
// DAI Platform -- Chat Panel
// ---------------------------------------------------------------------------
// Assembles the full chat experience: scrollable message list, contextual
// suggestions, and the input bar.  Mounted inside AppShell's sliding aside.
// ---------------------------------------------------------------------------

import { useRef, useEffect } from 'react';
import { X, Sparkles, Trash2 } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatSuggestions } from './ChatSuggestions';
import { Button } from '@/components/ui/button';

export default function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const setOpen = useChatStore((s) => s.setOpen);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">DAI Assistant</h3>
            <p className="text-[11px] text-gray-400">Powered by Claude</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-red-500"
              onClick={clearMessages}
              title="Clear chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-gray-600"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-indigo-100">
              <Sparkles className="h-6 w-6 text-indigo-500" />
            </div>
            <h4 className="text-sm font-medium text-gray-700">How can I help?</h4>
            <p className="text-xs text-gray-400 max-w-[260px]">
              Ask me to explore your data, suggest transforms, build charts, or write SQL queries.
            </p>
          </div>
        ) : (
          <div className="py-2">
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} />
            ))}
          </div>
        )}
      </div>

      {/* Suggestions */}
      <ChatSuggestions />

      {/* Input */}
      <ChatInput />
    </div>
  );
}
