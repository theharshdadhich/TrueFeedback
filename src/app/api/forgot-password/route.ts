import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import { sendForgotPasswordEmail } from '@/helpers/sendForgotPasswordEmail';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required.' },
        { status: 400 }
      );
    }

    const user = await UserModel.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json(
        { success: true, message: 'If an account with that email exists, a reset link has been sent.' },
        { status: 200 }
      );
    }

    if (!user.isVerified) {
      return NextResponse.json(
        { success: false, message: 'Account is not verified. Please verify your account first.' },
        { status: 400 }
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.forgotPasswordToken = token;
    user.forgotPasswordTokenExpiry = expiry;
    await user.save();

    // Get the correct domain from request headers (handles deployed apps)
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`;
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    const emailResult = await sendForgotPasswordEmail(email, user.username, resetLink);

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, message: 'Failed to send reset email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'If an account with that email exists, a reset link has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
