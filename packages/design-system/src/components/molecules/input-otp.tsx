import { OTPInput, OTPInputContext } from 'input-otp';
import * as React from 'react';

import { MinusIcon } from 'lucide-react';

function InputOTP({
  className: _className,
  ...props
}: React.ComponentProps<typeof OTPInput>) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName="cn-input-otp flex items-center has-disabled:opacity-50"
      spellCheck={false}
      className="disabled:cursor-not-allowed"
      {...props}
    />
  );
}

function InputOTPGroup({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="input-otp-group"
      className="has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-destructive rounded-md has-aria-invalid:ring-[3px] flex items-center"
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  ...props
}: Omit<React.ComponentProps<'div'>, 'className'> & {
  index: number;
}) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className="dark:bg-input/30 border-input data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive size-9 border-y border-r text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:ring-[3px] relative flex items-center justify-center data-[active=true]:z-10"
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000 bg-foreground h-4 w-px" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="input-otp-separator"
      className="[&_svg:not([class*='size-'])]:size-4 flex items-center"
      role="separator"
      {...props}
    >
      <MinusIcon />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
