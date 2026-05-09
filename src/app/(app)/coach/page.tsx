'use client';

import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Loader2, Send, User, Bot } from 'lucide-react';

export default function CoachPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/coach',
  });

  return (
    <div className="container mx-auto my-8 p-4 md:p-6 max-w-4xl h-[calc(100vh-8rem)]">
      <Card className="flex flex-col h-full bg-white shadow-lg">
        <CardHeader className="border-b">
          <h1 className="text-3xl font-bold text-center">Your AI Feedback Coach</h1>
          <p className="text-center text-gray-500 text-sm mt-2">
            Ask questions about the feedback you&apos;ve received. The AI will analyze your messages and help you grow.
          </p>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 py-20">
                <Bot className="w-16 h-16" />
                <p>No messages yet. Say hello to your coach!</p>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`flex space-x-2 max-w-[80%] ${
                        m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {m.role === 'user' ? (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-green-600" />
                          </div>
                        )}
                      </div>
                      <div
                        className={`rounded-lg p-3 ${
                          m.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex space-x-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="rounded-lg p-3 bg-gray-100 flex items-center space-x-2">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
        </CardContent>

        <CardFooter className="border-t p-4">
          <form
            onSubmit={handleSubmit}
            className="flex w-full space-x-2 items-end"
          >
            <Textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about your feedback..."
              className="resize-none flex-1 min-h-[60px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // @ts-ignore
                  handleSubmit(e);
                }
              }}
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="h-[60px] w-[60px]"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
