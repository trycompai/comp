'use client';

import { authClient } from '@/utils/auth-client';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { Form, FormControl, FormField, FormItem } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
  email: z.string().email(),
});

type Props = {
  className?: string;
  inviteCode?: string;
  searchParams?: URLSearchParams;
  onMagicLinkSubmit?: (email: string) => void;
};

export function MagicLinkSignIn({ className, inviteCode, searchParams, onMagicLinkSubmit }: Props) {
  const [isLoading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit({ email }: z.infer<typeof formSchema>) {
    setLoading(true);

    // Build the callback URL with search params
    const baseURL = window.location.origin;
    const path = inviteCode ? `/invite/${inviteCode}` : '/';
    const callbackURL = new URL(path, baseURL);

    // Append all search params if they exist
    if (searchParams) {
      searchParams.forEach((value, key) => {
        callbackURL.searchParams.append(key, value);
      });
    }

    const { data, error } = await authClient.signIn.magicLink({
      email: email,
      callbackURL: callbackURL.toString(),
    });

    if (error) {
      toast.error('Error sending email - try again?');
      setLoading(false);
    } else {
      // Call the callback if provided
      if (onMagicLinkSubmit) {
        onMagicLinkSubmit(email);
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className={cn('flex flex-col space-y-3', className)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="name@example.com"
                    {...field}
                    autoFocus
                    className="h-11"
                    autoCapitalize="false"
                    autoCorrect="false"
                    spellCheck="false"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full h-11 font-medium"
            variant="default"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Continue with email
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
