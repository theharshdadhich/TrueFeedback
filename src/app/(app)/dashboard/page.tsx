'use client';

import { MessageCard } from '@/components/MessageCard';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Message } from '@/model/User';
import { ApiResponse } from '@/types/ApiResponse';
import { zodResolver } from '@hookform/resolvers/zod';
import axios, { AxiosError } from 'axios';
import { Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import { User } from 'next-auth';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AcceptMessageSchema } from '@/schemas/acceptMessageSchema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InsightCluster {
  name: string;
  summary: string;
  messageCount: number;
  representativeQuote: string;
}

interface InsightsData {
  clusters: InsightCluster[];
  totalMessages?: number;
  note?: string;
}

function InsightsWidget() {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get<InsightsData & { success: boolean }>('/api/insights');
      setInsights(res.data);
    } catch {
      toast({ title: 'Error', description: 'Failed to generate insights', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="my-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">AI Feedback Insights</h2>
        <Button onClick={fetchInsights} disabled={isLoading} variant="outline" size="sm">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {insights ? 'Refresh Insights' : 'Generate Insights'}
        </Button>
      </div>

      {insights?.note && (
        <p className="text-sm text-gray-500">{insights.note}</p>
      )}

      {insights && insights.clusters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.clusters.map((cluster, i) => (
            <Card key={i} className="border border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  {cluster.name}
                  <span className="ml-auto text-xs font-normal text-gray-500">
                    {cluster.messageCount} {cluster.messageCount === 1 ? 'message' : 'messages'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-gray-700">{cluster.summary}</p>
                {cluster.representativeQuote && (
                  <blockquote className="text-sm italic text-gray-500 border-l-2 border-gray-300 pl-3">
                    &ldquo;{cluster.representativeQuote}&rdquo;
                  </blockquote>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function UserDashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitchLoading, setIsSwitchLoading] = useState(false);
  const [profileContext, setProfileContext] = useState('');
  const [isContextLoading, setIsContextLoading] = useState(false);

  const { toast } = useToast();

  const handleDeleteMessage = (messageId: string) => {
    setMessages(messages.filter((message) => message._id !== messageId));
  };

  const { data: session } = useSession();

  const form = useForm({
    resolver: zodResolver(AcceptMessageSchema),
  });

  const { register, watch, setValue } = form;
  const acceptMessages = watch('acceptMessages');

  const fetchAcceptMessages = useCallback(async () => {
    setIsSwitchLoading(true);
    try {
      const response = await axios.get<ApiResponse>('/api/accept-messages');
      setValue('acceptMessages', response.data.isAcceptingMessages);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: 'Error',
        description: axiosError.response?.data.message ?? 'Failed to fetch message settings',
        variant: 'destructive',
      });
    } finally {
      setIsSwitchLoading(false);
    }
  }, [setValue, toast]);

  const fetchProfileContext = useCallback(async () => {
    try {
      const response = await axios.get<{ success: boolean; profileContext: string }>('/api/update-context');
      if (response.data.success) {
        setProfileContext(response.data.profileContext);
      }
    } catch (error) {
      console.error('Failed to fetch profile context', error);
    }
  }, []);

  const fetchMessages = useCallback(
    async (refresh: boolean = false) => {
      setIsLoading(true);
      setIsSwitchLoading(false);
      try {
        const response = await axios.get<ApiResponse>('/api/get-messages');
        setMessages(response.data.messages || []);
        if (refresh) {
          toast({ title: 'Refreshed Messages', description: 'Showing latest messages' });
        }
      } catch (error) {
        const axiosError = error as AxiosError<ApiResponse>;
        toast({
          title: 'Error',
          description: axiosError.response?.data.message ?? 'Failed to fetch messages',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        setIsSwitchLoading(false);
      }
    },
    [setIsLoading, setMessages, toast]
  );

  useEffect(() => {
    if (!session || !session.user) return;
    fetchMessages();
    fetchAcceptMessages();
    fetchProfileContext();
  }, [session, setValue, toast, fetchAcceptMessages, fetchMessages, fetchProfileContext]);

  const handleSwitchChange = async () => {
    try {
      const response = await axios.post<ApiResponse>('/api/accept-messages', {
        acceptMessages: !acceptMessages,
      });
      setValue('acceptMessages', !acceptMessages);
      toast({ title: response.data.message, variant: 'default' });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: 'Error',
        description: axiosError.response?.data.message ?? 'Failed to update message settings',
        variant: 'destructive',
      });
    }
  };

  const handleSaveContext = async () => {
    setIsContextLoading(true);
    try {
      const response = await axios.post<{ success: boolean; message: string }>('/api/update-context', {
        profileContext,
      });
      toast({ title: 'Success', description: response.data.message });
    } catch {
      toast({ title: 'Error', description: 'Failed to update profile context', variant: 'destructive' });
    } finally {
      setIsContextLoading(false);
    }
  };

  if (!session || !session.user) {
    return <div></div>;
  }

  const { username } = session.user as User;

  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  const profileUrl = `${baseUrl}/u/${username}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileUrl);
    toast({ title: 'URL Copied!', description: 'Profile URL has been copied to clipboard.' });
  };

  return (
    <div className="my-8 mx-4 md:mx-8 lg:mx-auto p-6 bg-white rounded w-full max-w-6xl">
      <h1 className="text-4xl font-bold mb-4">User Dashboard</h1>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Copy Your Unique Link</h2>
        <div className="flex items-center">
          <input
            type="text"
            value={profileUrl}
            disabled
            className="input input-bordered w-full p-2 mr-2"
          />
          <Button onClick={copyToClipboard}>Copy</Button>
        </div>
      </div>

      <div className="mb-4">
        <Switch
          {...register('acceptMessages')}
          checked={acceptMessages}
          onCheckedChange={handleSwitchChange}
          disabled={isSwitchLoading}
        />
        <span className="ml-2">Accept Messages: {acceptMessages ? 'On' : 'Off'}</span>
      </div>
      <Separator />

      <div className="my-6">
        <h2 className="text-lg font-semibold mb-2">AI Feedback Context</h2>
        <p className="text-sm text-gray-500 mb-4">
          Tell the AI what kind of feedback you are looking for.
        </p>
        <Textarea
          placeholder="e.g. I am a UI designer looking for feedback on my latest app design..."
          value={profileContext}
          onChange={(e) => setProfileContext(e.target.value)}
          className="mb-4 resize-none h-24"
        />
        <Button onClick={handleSaveContext} disabled={isContextLoading}>
          {isContextLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Context'}
        </Button>
      </div>
      <Separator />

      <InsightsWidget />
      <Separator />

      <Button
        className="mt-4"
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          fetchMessages(true);
        }}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCcw className="h-4 w-4" />
        )}
      </Button>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {messages.length > 0 ? (
          messages.map((message) => (
            <MessageCard
              key={message._id as string}
              message={message}
              onMessageDelete={handleDeleteMessage}
            />
          ))
        ) : (
          <p>No messages to display.</p>
        )}
      </div>
    </div>
  );
}

export default UserDashboard;