'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
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
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Bot className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">MChat</h1>
            <p className="text-xs text-neutral-400">Powered by qwen2.5-coder:3b</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea ref={scrollAreaRef} className="h-full w-full px-4 md:px-0">
          <div className="max-w-3xl mx-auto py-8 space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 opacity-50">
                <Bot className="w-16 h-16 text-neutral-600" />
                <p className="text-neutral-400 text-lg">Start a conversation with your AI assistant.</p>
              </div>
            )}
            
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-4 ${
                  m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <Avatar className={`w-8 h-8 ${m.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                  <AvatarFallback>
                    {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                
                <Card className={`p-4 max-w-[80%] shadow-md border-0 ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-neutral-900 text-neutral-200'
                }`}>
                  <div className="prose prose-invert prose-sm max-w-none break-words">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </Card>
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
               <div className="flex gap-4">
                 <Avatar className="w-8 h-8 bg-emerald-600">
                   <AvatarFallback><Bot className="w-4 h-4" /></AvatarFallback>
                 </Avatar>
                 <div className="flex items-center gap-2 text-neutral-500 text-sm p-2">
                   <Loader2 className="w-4 h-4 animate-spin" />
                   Thinking...
                 </div>
               </div>
            )}
            <div className="h-4" /> {/* Spacer */}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-neutral-900 border-t border-neutral-800">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
            <Textarea
              className="flex-1 bg-neutral-950 border-neutral-800 focus-visible:ring-blue-600 text-neutral-100 placeholder:text-neutral-500 min-h-[60px] resize-none"
              value={input}
              placeholder="Type your message... (Shift+Enter for new line)"
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // Trigger form submission
                  handleSubmit();
                }
              }}
              autoFocus
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white h-10 w-10 rounded-md transition-all mb-1"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-center text-xs text-neutral-600 mt-2">
            AI can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}
