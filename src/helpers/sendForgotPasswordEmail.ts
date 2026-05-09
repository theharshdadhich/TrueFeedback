import { resend } from "@/lib/resend";
import ForgotPasswordEmail from "../../emails/ForgotPasswordEmail";
import { ApiResponse } from '@/types/ApiResponse';

export async function sendForgotPasswordEmail(
  email: string,
  username: string,
  resetLink: string
): Promise<ApiResponse> {
  try {
    await resend.emails.send({
      from: 'support@truefeedback.in',
      to: email,
      subject: 'True Feedback - Reset Your Password',
      react: ForgotPasswordEmail({ username, resetLink }),
    });
    return { success: true, message: 'Password reset email sent successfully.' };
  } catch (emailError) {
    console.error('Error sending forgot password email:', emailError);
    return { success: false, message: 'Failed to send password reset email.' };
  }
}