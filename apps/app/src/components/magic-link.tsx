'use client';

import { authClient } from '@/utils/auth-client';
import { buildAuthCallbackUrl } from '@/utils/auth-callback';
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

interface MagicLinkSignInProps {
  className?: string;
  inviteCode?: string;
  redirectTo?: string;
  onMagicLinkSubmit?: (email: string) => void;
}

export function MagicLinkSignIn({
  className,
  inviteCode,
  redirectTo,
  onMagicLinkSubmit,
}: MagicLinkSignInProps) {
  const [isLoading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit({ email }: z.infer<typeof formSchema>) {
    setLoading(true);

    const callbackURL = buildAuthCallbackUrl({ inviteCode, redirectTo });

    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL,
    });

    if (error) {
      toast.error('Error sending email - try again?');
      setLoading(false);
    } else if (onMagicLinkSubmit) {
      onMagicLinkSubmit(email);
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
