'use client';

import { ComponentPropsWithoutRef } from 'react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Send, Bot, User, Loader2, Copy, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type CodeProps = ComponentPropsWithoutRef<'code'> & { inline?: boolean };

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error(response.statusText);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId 
            ? { ...m, content: m.content + chunk }
            : m
        ));
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: 'Sorry, something went wrong. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Custom code block component with copy functionality
  const CodeBlock = ({ inline, className, children, ...props }: CodeProps) => {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const code = String(children).replace(/\n$/, '');

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (inline) {
      return <code className="bg-neutral-800/50 px-1.5 py-0.5 rounded text-sm text-blue-300 font-mono border border-white/10" {...props}>{children}</code>;
    }

    return (
      <div className="relative group my-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/80 backdrop-blur-sm border-b border-white/5">
          <span className="text-xs text-neutral-400 font-mono">{match?.[1] || 'text'}</span>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
          </button>
        </div>
        <div className="bg-neutral-950/90 p-4 overflow-x-auto">
          <code className={`${className} !bg-transparent`} {...props}>
            {children}
          </code>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-blue-500/30">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-neutral-950/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-lg opacity-20" />
            <div className="relative p-2 bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-xl border border-white/10 shadow-lg">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Muradian AI
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Online</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden relative z-10">
        <ScrollArea ref={scrollAreaRef} className="h-full w-full">
          <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 space-y-8">
            {messages.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6"
              >
                <div className="relative group">
                  <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full group-hover:bg-blue-500/30 transition-all duration-500" />
                  <div className="relative p-6 bg-neutral-900/50 rounded-3xl border border-white/10 backdrop-blur-sm shadow-2xl">
                    <Bot className="w-16 h-16 text-neutral-200" />
                  </div>
                </div>
                <div className="space-y-2 max-w-md">
                  <h2 className="text-2xl font-bold text-white">Welcome to Muradian AI</h2>
                  <p className="text-neutral-400">
                    I&apos;m here to help you with coding, analysis, and creative tasks. 
                    Ask me anything in Bangla or English.
                  </p>
                </div>
              </motion.div>
            )}
            
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`flex gap-6 ${
                    m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <Avatar className={`w-10 h-10 border border-white/10 shadow-lg ${
                    m.role === 'user' 
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600' 
                      : 'bg-gradient-to-br from-neutral-700 to-neutral-800'
                  }`}>
                    <AvatarFallback className="bg-transparent text-white">
                      {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`group relative max-w-[85%] lg:max-w-[75%] ${
                    m.role === 'user' ? 'items-end' : 'items-start'
                  }`}>
                    <div className={`
                      relative px-6 py-4 rounded-2xl shadow-sm
                      ${m.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-neutral-900/80 backdrop-blur-md border border-white/5 text-neutral-200 rounded-tl-sm hover:bg-neutral-900/90 transition-colors'
                      }
                    `}>
                      <div className={`prose prose-invert prose-sm max-w-none break-words leading-relaxed
                        ${m.role === 'user' ? 'prose-headings:text-white prose-p:text-white prose-strong:text-white prose-code:text-blue-100' : 'prose-pre:bg-transparent prose-pre:p-0'}
                      `}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            code: CodeBlock,
                            pre: ({ children }) => <>{children}</>,
                            a: ({ children, href }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 transition-all">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <span className={`text-[10px] text-neutral-500 mt-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5 ${m.role === 'user' ? 'right-0' : 'left-0'}`}>
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="flex gap-6"
               >
                 <Avatar className="w-10 h-10 bg-neutral-800 border border-white/10">
                   <AvatarFallback><Bot className="w-5 h-5 text-neutral-400" /></AvatarFallback>
                 </Avatar>
                 <div className="flex items-center gap-2 text-neutral-500 text-sm p-3 bg-neutral-900/50 rounded-2xl rounded-tl-sm border border-white/5">
                   <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                   <span className="animate-pulse">Muradian is thinking...</span>
                 </div>
               </motion.div>
            )}
            <div className="h-4" /> {/* Spacer */}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-transparent relative z-20">
        <div className="max-w-[1600px] mx-auto">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <form 
              onSubmit={handleSubmit} 
              className="relative flex items-end gap-3 p-2 bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
            >
              <Textarea
                ref={textareaRef}
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-neutral-100 placeholder:text-neutral-500 min-h-[50px] max-h-[200px] resize-none py-3 px-4 text-base"
                value={input}
                placeholder="Message Muradian..."
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                autoFocus
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white h-10 w-10 rounded-xl transition-all shadow-lg shadow-blue-900/20 mb-1 mr-1"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
          <p className="text-center text-[10px] text-neutral-600 mt-3 font-medium tracking-wide">
            MURADIAN AI • POWERED BY ADVANCED MODELS
          </p>
        </div>
      </div>
    </div>
  );
}
