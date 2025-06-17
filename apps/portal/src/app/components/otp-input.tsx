import { cn } from '@comp/ui/cn';
import { Input } from '@comp/ui/input';
import OtpInput, { type OTPInputProps } from 'react-otp-input';

type OtpOptions = Omit<OTPInputProps, 'renderInput'>;

type OtpStyledInputProps = {
  className?: string;
} & OtpOptions;

/**
 * Otp input Docs: {@link: https://shadcn-extension.vercel.app/docs/otp-input}
 */

export const OtpStyledInput = ({ className, ...props }: OtpStyledInputProps) => {
  return (
    <OtpInput
      {...props}
      numInputs={6}
      renderInput={(inputProps) => (
        <Input
          {...inputProps}
          className={cn('selection:bg-none', className)}
          style={{
            caretColor: 'blue',
            textAlign: 'center',
            appearance: 'none',
          }}
        />
      )}
      containerStyle={`flex justify-center items-center text-2xl font-bold ${
        props.renderSeparator ? 'gap-1' : 'gap-x-3 gap-y-2'
      }`}
    />
  );
};
