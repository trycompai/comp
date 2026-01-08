'use client';

import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import * as React from 'react';

function Slider({
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: Omit<SliderPrimitive.Root.Props, 'className'>) {
  const _values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  );

  return (
    <SliderPrimitive.Root
      className="data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full"
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="data-[orientation=vertical]:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="bg-border rounded-full h-1.5 w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5 relative overflow-hidden select-none"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none h-full data-[orientation=vertical]:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="border-primary ring-ring/50 size-4 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
