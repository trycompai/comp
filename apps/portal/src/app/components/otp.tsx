"use client";

import { useI18n } from "@/app/locales/client";
import { Button } from "@bubba/ui/button";
import { cn } from "@bubba/ui/cn";
import { Form, FormControl, FormField, FormItem } from "@bubba/ui/form";
import { Input } from "@bubba/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "../lib/auth-client";
import { OtpForm } from "./otp-form";

const formSchema = z.object({
  email: z.string().email(),
});

type Props = {
  className?: string;
};

export function OtpSignIn({ className }: Props) {
  const t = useI18n();
  const [isLoading, setLoading] = useState(false);
  const [isSent, setSent] = useState(false);
  const [_email, setEmail] = useState<string>();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit({ email }: z.infer<typeof formSchema>) {
    setLoading(true);
    setEmail(email);

    const { data, error } = await authClient.emailOtp.sendVerificationOtp({
      email: email,
      type: "sign-in",
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
    }

    setSent(true);
    setLoading(false);
  }

  if (isSent) {
    return (
      <div className={cn("flex flex-col space-y-4", className)}>
        <OtpForm email={_email ?? ""} />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className={cn("flex flex-col space-y-4", className)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder={t("auth.email.placeholder")}
                    {...field}
                    autoFocus
                    className="h-[40px]"
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
            className="flex h-[40px] w-full space-x-2 px-6 py-4 font-medium active:scale-[0.98]"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>{t("auth.email.button")}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
