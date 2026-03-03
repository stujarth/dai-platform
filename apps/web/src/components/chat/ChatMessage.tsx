// ---------------------------------------------------------------------------
// DAI Platform -- Chat Message
// ---------------------------------------------------------------------------
// Renders a single chat message with support for markdown content, tool call
// display, and a streaming/typing indicator.
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Sparkles, Copy, Check, ChevronDown, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolCall {
  name: string;
  input?: Record<string, unknown>;
  result?: unknown;
}

export interface ChatMessageProps {
  message: {
    role: string;
    content: string;
    toolCalls?: ToolCall[];
  };
}

// ---------------------------------------------------------------------------
// Typing indicator (3 animated dots)
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
      <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
      <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible tool call card
// ---------------------------------------------------------------------------

function ToolCallCard({ tool }: { tool: ToolCall }) {
  const [expanded, setExpanded] = useState(false);

  const summary = (() => {
    if (tool.name === 'query_data') {
      const sql =
        typeof tool.input?.sql === 'string'
          ? tool.input.sql.slice(0, 60) + (tool.input.sql.length > 60 ? '...' : '')
          : 'SQL query';
      return sql;
    }
    if (tool.name === 'suggest_chart') {
      const chartType =
        typeof tool.input?.chart_type === 'string'
          ? tool.input.chart_type
          : 'chart';
      return `Chart generated (${chartType})`;
    }
    // Generic fallback
    const keys = tool.input ? Object.keys(tool.input).slice(0, 3).join(', ') : '';
    return keys ? `Params: ${keys}` : 'Executed';
  })();

  const renderResult = () => {
    if (tool.name === 'query_data' && tool.result) {
      const r = tool.result as Record<string, unknown>;
      return (
        <div className="space-y-2">
          {typeof tool.input?.sql === 'string' && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">SQL</p>
              <pre className="bg-gray-900 text-gray-100 text-xs p-2 rounded overflow-x-auto">
                {tool.input.sql}
              </pre>
            </div>
          )}
          {r.row_count !== undefined && (
            <p className="text-xs text-gray-500">
              {String(r.row_count)} row{Number(r.row_count) !== 1 ? 's' : ''} returned
              {r.execution_time_ms !== undefined && (
                <> in {String(r.execution_time_ms)}ms</>
              )}
            </p>
          )}
        </div>
      );
    }

    if (tool.name === 'suggest_chart' && tool.result) {
      const r = tool.result as Record<string, unknown>;
      return (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">
            Chart type:{' '}
            <span className="font-medium text-gray-700">
              {String(r.chart_type ?? tool.input?.chart_type ?? 'unknown')}
            </span>
          </p>
          {r.title && (
            <p className="text-xs text-gray-500">
              Title: {String(r.title)}
            </p>
          )}
        </div>
      );
    }

    // Generic result display
    if (tool.result) {
      return (
        <pre className="bg-gray-50 text-xs p-2 rounded overflow-x-auto text-gray-700 max-h-40">
          {JSON.stringify(tool.result, null, 2)}
        </pre>
      );
    }

    return <p className="text-xs text-gray-400 italic">No result</p>;
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden my-2">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Wrench className="h-3.5 w-3.5 text-gray-500 shrink-0" />
        <span className="font-medium text-gray-700 truncate">{tool.name}</span>
        <span className="text-gray-400 truncate flex-1">{summary}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform duration-200',
            expanded && 'rotate-180',
          )}
        />
      </button>
      {expanded && <div className="px-3 py-2 border-t border-gray-200">{renderResult()}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Code block with copy button
// ---------------------------------------------------------------------------

function CodeBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const text = String(children).replace(/\n$/, '');

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  // Detect language from className (e.g. "language-sql")
  const lang = className?.replace('language-', '') ?? '';

  return (
    <div className="relative group my-2">
      {lang && (
        <div className="absolute top-0 left-0 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-400 bg-gray-800 rounded-br">
          {lang}
        </div>
      )}
      <pre className="bg-gray-900 text-gray-100 text-xs p-3 pt-6 rounded-lg overflow-x-auto">
        <code>{text}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white hover:bg-gray-700"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isLoading = isAssistant && message.content === '' && !message.toolCalls?.length;

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-violet-500 to-indigo-600',
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Sparkles className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm',
        )}
      >
        {isLoading ? (
          <TypingIndicator />
        ) : isUser ? (
          // User messages are plain text
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          // Assistant messages rendered as Markdown
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  // Distinguish inline code from code blocks.
                  // react-markdown wraps fenced code in <pre><code>, so if the
                  // parent is <pre> we treat it as a block.  However the
                  // `node` prop isn't always reliable, so we fall back to
                  // checking for a language className which is only set on
                  // fenced blocks.
                  const isBlock = className?.startsWith('language-');
                  if (isBlock) {
                    return <CodeBlock className={className}>{children}</CodeBlock>;
                  }
                  return (
                    <code
                      className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                pre({ children }) {
                  // If the child is already a CodeBlock we rendered above,
                  // don't wrap it in another <pre>
                  return <>{children}</>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((tool, idx) => (
              <ToolCallCard key={idx} tool={tool as ToolCall} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
