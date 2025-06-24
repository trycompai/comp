'use client';

import { Input } from '@comp/ui/input';
import { type InputHTMLAttributes, forwardRef, useCallback, useEffect, useState } from 'react';

interface WebsiteInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'prefix'> {
  onValueChange?: (value: string) => void;
}

export const WebsiteInput = forwardRef<HTMLInputElement, WebsiteInputProps>(
  ({ value: propValue, onChange, onValueChange, onBlur, ...props }, ref) => {
    // Use local state for the display value
    const [displayValue, setDisplayValue] = useState('');

    // Update display value when prop value changes
    useEffect(() => {
      if (typeof propValue === 'string') {
        setDisplayValue(propValue.replace(/^https?:\/\//, '').replace(/^www\./, ''));
      }
    }, [propValue]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        let inputValue = e.target.value;

        // Clean up the input
        inputValue = inputValue.trim();

        // Remove any protocol if pasted
        inputValue = inputValue.replace(/^https?:\/\//, '');
        inputValue = inputValue.replace(/^ftp:\/\//, '');
        inputValue = inputValue.replace(/^\/\//, '');

        // Clean up multiple slashes (except for the protocol)
        inputValue = inputValue.replace(/([^:]\/)\/+/g, '$1');

        // Update display value
        setDisplayValue(inputValue);

        // If empty, pass empty value
        if (!inputValue) {
          onChange?.({
            ...e,
            target: { ...e.target, value: '', name: e.target.name },
          } as React.ChangeEvent<HTMLInputElement>);
          onValueChange?.('');
          return;
        }

        // Format the value with https://
        const finalValue = `https://${inputValue}`;

        // Create a synthetic event with the formatted value
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: finalValue,
            name: e.target.name,
          },
        } as React.ChangeEvent<HTMLInputElement>;

        // Call the original onChange if provided
        onChange?.(syntheticEvent);

        // Also call onValueChange if provided
        onValueChange?.(finalValue);
      },
      [onChange, onValueChange],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        // On blur, ensure the value has a proper format
        if (displayValue && !displayValue.includes('.')) {
          // If there's no dot, add .com as a helpful default
          const finalValue = `https://${displayValue}.com`;
          const syntheticEvent = {
            ...e,
            target: {
              ...e.target,
              value: finalValue,
              name: e.target.name,
            },
          } as React.FocusEvent<HTMLInputElement>;

          setDisplayValue(`${displayValue}.com`);
          onChange?.({ ...syntheticEvent, type: 'change' } as React.ChangeEvent<HTMLInputElement>);
          onValueChange?.(finalValue);
        }

        // Call original onBlur
        onBlur?.(e);
      },
      [displayValue, onChange, onValueChange, onBlur],
    );

    return (
      <Input
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        prefix="https://"
        autoComplete="url"
        spellCheck={false}
        {...props}
      />
    );
  },
);

WebsiteInput.displayName = 'WebsiteInput';
