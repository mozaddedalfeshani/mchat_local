'use client';

import { ComponentPropsWithoutRef } from 'react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Send, Bot, User, Loader2, Copy, Check, Sparkles, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsModal } from '@/components/settings-modal';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load settings from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem('ollama_url');
    if (savedUrl) {
      setOllamaUrl(savedUrl);
    }
  }, []);

  const handleSaveSettings = (url: string) => {
    setOllamaUrl(url);
    localStorage.setItem('ollama_url', url);
  };

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
          ollamaUrl, // Pass the configured URL
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
        content: 'দুঃখিত, কিছু ভুল হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন। (Sorry, something went wrong.)' 
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
    const code = String(children);

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
          <code className={`${className} !bg-transparent !whitespace-pre block font-mono text-sm leading-relaxed`} {...props}>
            {children}
          </code>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-blue-500/30 relative overflow-hidden">
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={handleSaveSettings}
        initialUrl={ollamaUrl}
      />

      {/* Background Image & Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105"
          style={{ backgroundImage: 'url(/bg.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/80 via-neutral-950/50 to-neutral-950/80 backdrop-blur-[2px]" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-neutral-950/30 backdrop-blur-2xl sticky top-0 z-20 shadow-lg shadow-black/5">
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="relative p-2.5 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-5 h-5 text-blue-300 drop-shadow-[0_0_8px_rgba(147,197,253,0.5)]" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-100 to-neutral-400 bg-clip-text text-transparent drop-shadow-sm">
              মুরাদিয়ান এআই (Muradian AI)
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              </span>
              <p className="text-[10px] font-medium text-blue-200/70 uppercase tracking-widest">অনলাইন (Online)</p>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsSettingsOpen(true)}
          className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-xl"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden relative z-10">
        <ScrollArea ref={scrollAreaRef} className="h-full w-full">
          <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-10 space-y-10">
            {messages.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col items-center justify-center h-[60vh] text-center space-y-8"
              >
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/30 to-purple-500/30 blur-[60px] rounded-full group-hover:blur-[80px] transition-all duration-700" />
                  <div className="relative p-8 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-xl shadow-2xl ring-1 ring-white/5 group-hover:scale-105 transition-transform duration-500">
                    <Bot className="w-20 h-20 text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                  </div>
                </div>
                <div className="space-y-3 max-w-lg relative">
                  <div className="absolute -inset-4 bg-black/20 blur-xl rounded-full -z-10" />
                  <h2 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg">মুরাদিয়ান এআই-তে স্বাগতম</h2>
                  <p className="text-lg text-blue-100/70 font-light leading-relaxed">
                    আমি আপনাকে কোডিং, বিশ্লেষণ এবং সৃজনশীল কাজে সাহায্য করতে এখানে আছি।
                    <br />
                    <span className="text-sm opacity-60 mt-2 block">বাংলা বা ইংরেজিতে আমাকে যা খুশি জিজ্ঞাসা করুন।</span>
                  </p>
                </div>
              </motion.div>
            )}
            
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                  className={`flex gap-6 ${
                    m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <Avatar className={`w-12 h-12 border-2 border-white/10 shadow-xl ring-2 ring-black/20 ${
                    m.role === 'user' 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                      : 'bg-gradient-to-br from-neutral-800 to-neutral-900'
                  }`}>
                    <AvatarFallback className="bg-transparent text-white font-bold">
                      {m.role === 'user' ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`group relative max-w-[85%] lg:max-w-[70%] ${
                    m.role === 'user' ? 'items-end' : 'items-start'
                  }`}>
                    <div className={`
                      relative px-8 py-6 shadow-lg backdrop-blur-xl border
                      ${m.role === 'user' 
                        ? 'bg-gradient-to-br from-blue-600/90 to-indigo-600/90 text-white rounded-[2rem] rounded-tr-md border-white/10' 
                        : 'bg-neutral-900/60 text-neutral-100 rounded-[2rem] rounded-tl-md border-white/5 hover:bg-neutral-900/70 transition-colors'
                      }
                    `}>
                      {/* Glass shine effect */}
                      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                      
                      <div className={`prose prose-invert prose-lg max-w-none break-words leading-relaxed relative z-10
                        ${m.role === 'user' ? 'prose-headings:text-white prose-p:text-white prose-strong:text-white prose-code:text-blue-100' : 'prose-pre:bg-transparent prose-pre:p-0'}
                      `}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            code: CodeBlock,
                            pre: ({ children }) => <>{children}</>,
                            a: ({ children, href }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 transition-all font-medium">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <span className={`text-[11px] font-medium text-white/30 mt-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-6 ${m.role === 'user' ? 'right-2' : 'left-2'}`}>
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
                 <Avatar className="w-12 h-12 bg-neutral-900/50 border border-white/10 backdrop-blur-md">
                   <AvatarFallback><Bot className="w-6 h-6 text-neutral-400" /></AvatarFallback>
                 </Avatar>
                 <div className="flex items-center gap-3 text-blue-200/70 text-sm px-6 py-4 bg-neutral-900/40 rounded-[2rem] rounded-tl-md border border-white/5 backdrop-blur-md shadow-lg">
                   <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                   <span className="animate-pulse font-medium tracking-wide">মুরাদিয়ান ভাবছে... (Thinking...)</span>
                 </div>
               </motion.div>
            )}
            <div className="h-8" /> {/* Spacer */}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="p-8 bg-transparent relative z-20">
        <div className="max-w-[1400px] mx-auto">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-blue-500/30 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-700" />
            <form 
              onSubmit={handleSubmit} 
              className="relative flex items-end gap-4 p-3 bg-neutral-950/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl ring-1 ring-white/5 transition-all duration-300 focus-within:bg-neutral-950/80 focus-within:border-blue-500/30 focus-within:ring-blue-500/20"
            >
              <Textarea
                ref={textareaRef}
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-neutral-400/70 min-h-[56px] max-h-[200px] resize-none py-4 px-6 text-lg leading-relaxed"
                value={input}
                placeholder="মুরাদিয়ানকে মেসেজ করুন... (Message Muradian...)"
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
                className="bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white h-12 w-12 rounded-2xl transition-all shadow-lg shadow-blue-900/30 mb-1 mr-1 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
          <p className="text-center text-[11px] text-neutral-500/60 mt-4 font-medium tracking-[0.2em] uppercase">
            মুরাদিয়ান এআই • উন্নত মডেল দ্বারা চালিত (Powered by Advanced Models)
          </p>
        </div>
      </div>
    </div>
  );
}
