'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios, { AxiosError } from 'axios';
import Link from 'next/link';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { ApiResponse } from '@/types/ApiResponse';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      await axios.post<ApiResponse>('/api/forgot-password', { email: data.email });
      setIsSubmitted(true);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      const message = axiosError.response?.data.message ?? 'Something went wrong. Please try again.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-800">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl mb-2">
            Forgot Password
          </h1>
          <p className="text-gray-500 text-sm">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {isSubmitted ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-800 text-sm">
                If an account with that email exists, we&apos;ve sent a password reset
                link. Please check your inbox (and spam folder).
              </p>
            </div>
            <Link href="/sign-in" className="text-blue-600 hover:text-blue-800 text-sm">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <Input type="email" placeholder="you@example.com" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </Form>
            <div className="text-center mt-4">
              <Link href="/sign-in" className="text-blue-600 hover:text-blue-800 text-sm">
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
