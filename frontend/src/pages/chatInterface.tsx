import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Bot,
  User,
  Trash2,
  Plus,
  Sparkles,
  PlaySquare,
  Copy,
  Check,
} from 'lucide-react';

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp?: string;
}

interface ChatInterfaceProps {
  videoTitle?: string;
  onSendMessage: (message: string) => Promise<void>;
  messages: Message[];
  isGenerating: boolean;
  onReset: () => void;
  onClear: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  videoTitle,
  onSendMessage,
  messages,
  isGenerating,
  onReset,
  onClear,
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!isGenerating) {
      isSubmittingRef.current = false;
    }
  }, [isGenerating]);

  // Auto-scroll to bottom when new messages arrive or loading states change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // React form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput('');
    await onSendMessage(userMessage);
  };


  const handleQuickPrompt = (promptText: string) => {
    if (isGenerating || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    onSendMessage(promptText);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-950 text-gray-100 shadow-2xl relative overflow-hidden">
      {/* Decorative Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Header Bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-800/80 bg-gray-900/80 backdrop-blur-xl sticky top-0 z-10">
        {/* Left: Video Context Details */}
        <div className="flex items-center gap-3 overflow-hidden pr-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-md shadow-red-500/20 shrink-0">
            <PlaySquare className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h2 className="text-sm font-bold text-white truncate leading-tight">
              {videoTitle || 'Indexed Video Context'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs text-gray-400 font-medium">RAG Assistant Ready</p>
            </div>
          </div>
        </div>

        {/* Right: Actions Group */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all active:scale-95"
            title="Clear conversation history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>

          <div className="w-px h-4 bg-gray-800 hidden sm:block" />

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-gray-200 hover:text-white bg-gray-800/90 hover:bg-gray-800 border border-gray-700/80 rounded-lg transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-gray-400" />
            <span>New Video</span>
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 relative z-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 my-auto py-12">
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl shadow-inner">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>

            <div className="max-w-md space-y-1">
              <h3 className="text-xl font-bold text-white">Transcript Indexed Successfully</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                You can now ask questions about specific topics, timestamps, or action items discussed in the video.
              </p>
            </div>

            {/* Quick Action Prompt Chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg pt-4">
              {[
                'Give me a detailed summary of this video.',
                'What are the key takeaways?',
                'Extract all major action items or steps.',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickPrompt(suggestion)}
                  className="text-xs px-4 py-2.5 bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-red-500/40 text-gray-300 hover:text-white rounded-xl transition-all text-left shadow-sm active:scale-95"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 group ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row text-left'
                }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold shrink-0 shadow-md ${msg.sender === 'user'
                  ? 'bg-gradient-to-tr from-red-600 to-rose-600 text-white'
                  : 'bg-gray-800 border border-gray-700/80 text-gray-300'
                  }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble Container */}
              <div className="relative max-w-[85%] sm:max-w-[75%] space-y-1 text-left">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed text-left ${msg.sender === 'user'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-tr-none shadow-md shadow-red-900/20'
                    : 'bg-gray-900/90 border border-gray-800/80 text-gray-100 rounded-tl-none shadow-sm'
                    }`}
                >
                  {msg.sender === 'user' ? (
                    <p className="whitespace-pre-wrap text-left">{msg.text}</p>
                  ) : (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="text-left m-0">{children}</p>,
                        h1: ({ children }) => (
                          <h1 className="text-left text-lg font-bold text-white mt-1 mb-2">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-left text-base font-bold text-white mt-3 mb-1">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-left text-sm font-semibold text-white mt-2 mb-1">{children}</h3>
                        ),
                        ul: ({ children }) => (
                          <ul className="text-left list-disc list-inside space-y-1 my-1 pl-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="text-left list-decimal list-inside space-y-1 my-1 pl-1">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => <li className="text-left">{children}</li>,
                        strong: ({ children }) => (
                          <strong className="font-semibold text-white">{children}</strong>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-red-400/60 pl-3 italic text-gray-300">
                            {children}
                          </blockquote>
                        ),
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-red-300 underline underline-offset-2 hover:text-red-200"
                          >
                            {children}
                          </a>
                        ),
                        code: ({ children, className }) => (
                          <code className={`${className ?? ''} rounded bg-gray-950/80 px-1 py-0.5 text-red-200`}>
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  )}
                </div>

                {/* Message Actions / Metadata */}
                <div
                  className={`flex items-center gap-2 text-[10px] text-gray-500 px-1 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                >
                  {msg.timestamp && <span>{msg.timestamp}</span>}

                  {msg.sender === 'assistant' && (
                    <button
                      onClick={() => copyToClipboard(msg.text, msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-gray-300"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Streaming / Generating State */}
        {isGenerating && (
          <div className="flex items-start gap-3 text-left">
            {/* Bot Avatar */}
            <div className="w-8 h-8 rounded-xl bg-gray-800 border border-gray-700/80 flex items-center justify-center text-gray-300 shrink-0 shadow-md">
              <Bot className="w-4 h-4" />
            </div>

            {/* Typing Indicator Bubble */}
            <div className="bg-gray-900/90 border border-gray-800/80 rounded-2xl rounded-tl-none px-4 py-3.5 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-red-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-red-500 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Form */}
      <footer className="p-4 border-t border-gray-800/80 bg-gray-900/80 backdrop-blur-xl relative z-10">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the video..."
            disabled={isGenerating}
            className="w-full px-4 py-3.5 pr-14 text-sm bg-gray-950/60 text-white placeholder-gray-500 border border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 transition-all shadow-inner"
          />

          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="absolute right-2 p-2 text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 disabled:hover:from-red-600 disabled:hover:to-rose-600 rounded-lg transition-all shadow-md active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
};

export default ChatInterface;