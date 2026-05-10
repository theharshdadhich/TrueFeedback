'use client';

import React, { useRef, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CardHeader, CardContent, Card } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import * as z from 'zod';
import { ApiResponse } from '@/types/ApiResponse';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { messageSchema } from '@/schemas/messageSchema';

const specialChar = '||';

const parseStringMessages = (messageString: string): string[] => {
  return messageString.split(specialChar);
};

const TONE_LABELS: Record<string, string> = {
  hesitant: '🤔 Hesitant',
  confident: '💪 Confident',
  appreciative: '🙏 Appreciative',
  frustrated: '😤 Frustrated',
  neutral: '😐 Neutral',
};

export default function SendMessage() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const [suggestedMessages, setSuggestedMessages] = useState<string[]>([
    "What's a hobby you've recently started?",
    "If you could have dinner with any historical figure, who would it be?",
    "What's a simple thing that makes you happy?",
  ]);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [detectedTone, setDetectedTone] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
  });

  const messageContent = form.watch('content');

  const handleMessageClick = (message: string) => {
    form.setValue('content', message);
  };

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: z.infer<typeof messageSchema>) => {
    setIsLoading(true);
    try {
      const response = await axios.post<ApiResponse>('/api/send-message', {
        ...data,
        username,
      });
      toast({ title: response.data.message, variant: 'default' });
      form.reset({ ...form.getValues(), content: '' });
      setDetectedTone(null);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: 'Error',
        description: axiosError.response?.data.message ?? 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestedMessages = async () => {
    setIsSuggestLoading(true);
    try {
      const response = await axios.post<{ questions: string[] }>('/api/suggest-messages', { username });
      if (response.data.questions && response.data.questions.length > 0) {
        setSuggestedMessages(response.data.questions);
      }
    } catch (error) {
      console.error('Error fetching suggestions', error);
      toast({ title: 'Error', description: 'Failed to fetch message suggestions', variant: 'destructive' });
    } finally {
      setIsSuggestLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudio(blob, mimeType);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast({ title: 'Microphone access denied', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setIsTranscribing(true);
  };

  const transcribeAudio = async (blob: Blob, mimeType: string) => {
    try {
      const ext = mimeType.includes('webm') ? 'webm' : 'ogg';
      const formData = new FormData();
      formData.append('audio', blob, `recording.${ext}`);

      const res = await axios.post<{ success: boolean; transcript: string; tone: string }>(
        '/api/transcribe',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (res.data.success && res.data.transcript) {
        form.setValue('content', res.data.transcript);
        setDetectedTone(res.data.tone);
      } else {
        toast({ title: 'Could not transcribe audio', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Transcription failed', variant: 'destructive' });
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="container mx-auto my-8 p-6 bg-white rounded max-w-4xl">
      <h1 className="text-4xl font-bold mb-6 text-center">Public Profile Link</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Send Anonymous Message to @{username}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Write your anonymous message here"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tone badge shown after voice transcription */}
          {detectedTone && (
            <p className="text-sm text-gray-500">
              Detected tone:{' '}
              <span className="font-medium">{TONE_LABELS[detectedTone] ?? detectedTone}</span>
            </p>
          )}

          <div className="flex items-center gap-3 justify-center">
            {/* Voice record button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isTranscribing}
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? 'Stop recording' : 'Record voice message'}
            >
              {isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-4 w-4 text-red-500" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            {isLoading ? (
              <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading || !messageContent}>
                Send It
              </Button>
            )}
          </div>

          {isRecording && (
            <p className="text-center text-sm text-red-500 animate-pulse">
              Recording... tap the mic again to stop.
            </p>
          )}
        </form>
      </Form>

      <div className="space-y-4 my-8">
        <div className="space-y-2">
          <p>Click on any message below to select it.</p>
          <Button onClick={fetchSuggestedMessages} disabled={isSuggestLoading} className="mb-4">
            {isSuggestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Suggest New Messages'}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Messages</h3>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4">
            {suggestedMessages.map((message, index) => (
              <Button
                key={index}
                variant="outline"
                className="mb-2 whitespace-normal h-auto text-left justify-start"
                onClick={() => handleMessageClick(message)}
              >
                {message}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
      <Separator className="my-6" />
      <div className="text-center">
        <div className="mb-4">Get Your Message Board</div>
        <Link href={'/sign-up'}>
          <Button>Create Your Account</Button>
        </Link>
      </div>
    </div>
  );
}