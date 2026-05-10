'use client'

import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { Globe, X } from 'lucide-react';
import { Message } from '@/model/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from './ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ApiResponse } from '@/types/ApiResponse';

type MessageCardProps = {
  message: Message;
  onMessageDelete: (messageId: string) => void;
};

export function MessageCard({ message, onMessageDelete }: MessageCardProps) {
  const { toast } = useToast();
  const [showTranslation, setShowTranslation] = useState(false);

  const hasTranslation = Boolean(message.contentTranslated);
  const displayContent = showTranslation && hasTranslation
    ? message.contentTranslated!
    : message.content;

  const handleDeleteConfirm = async () => {
    try {
      const response = await axios.delete<ApiResponse>(
        `/api/delete-message/${message._id}`
      );
      toast({ title: response.data.message });
      onMessageDelete(message._id as string);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: 'Error',
        description: axiosError.response?.data.message ?? 'Failed to delete message',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="card-bordered">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-base leading-snug flex-1">{displayContent}</CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {hasTranslation && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={showTranslation ? `Show original (${message.detectedLanguage})` : 'Show English translation'}
                onClick={() => setShowTranslation(v => !v)}
              >
                <Globe className={`w-4 h-4 ${showTranslation ? 'text-blue-500' : 'text-gray-400'}`} />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this message.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConfirm}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{dayjs(message.createdAt).format('MMM D, YYYY h:mm A')}</span>
          {message.detectedLanguage && message.detectedLanguage !== 'English' && (
            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
              {message.detectedLanguage}
            </span>
          )}
          {message.tone && (
            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded capitalize">
              {message.tone}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasTranslation && showTranslation && (
          <p className="text-xs text-gray-400 mt-1">Translated from {message.detectedLanguage}</p>
        )}
      </CardContent>
    </Card>
  );
}