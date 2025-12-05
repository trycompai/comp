'use server';

import { auth } from '@/app/lib/auth';
import { createSafeActionClient } from 'next-safe-action';
import { headers } from 'next/headers';
import { z } from 'zod';

const handleServerError = (e: Error) => {
  if (e instanceof Error) {
    // Check for common OTP-related error messages
    const errorMessage = e.message.toLowerCase();
    console.error('Error message (lowercase):', errorMessage);

    if (errorMessage.includes('invalid') && errorMessage.includes('otp')) {
      return 'Invalid OTP code. Please check your code and try again.';
    }

    if (errorMessage.includes('expired') && errorMessage.includes('otp')) {
      return 'OTP code has expired. Please request a new code.';
    }
    
    if (errorMessage.includes('not found') || errorMessage.includes('user not found')) {
      return 'No account found with this email address.';
    }
    
    // For other authentication errors, provide a more specific message
    if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
      return 'Authentication failed. Please try again.';
    }

    if (errorMessage.includes('too many attempts')) {
      return 'Too many requests. Please try again later.';
    }

    // If we can't match a specific error, throw a generic but helpful message
    return 'Login failed. Please check your OTP code and try again.';
  }

  return 'Something went wrong while executing the operation';
};

export const login = createSafeActionClient({ handleServerError })
  .inputSchema(
    z.object({
      otp: z.string(),
      email: z.string().email(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const headersList = await headers();
    
    await auth.api.signInEmailOTP({
      headers: headersList,
      body: {
        email: parsedInput.email,
        otp: parsedInput.otp,
      },
      asResponse: true,
    });

    return {
      success: true,
    };
  });
