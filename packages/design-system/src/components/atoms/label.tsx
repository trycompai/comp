'use client';

import * as React from 'react';

function Label({ ...props }: Omit<React.ComponentProps<'label'>, 'className'>) {
  return (
    <label
      data-slot="label"
      className="gap-2 text-sm leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed"
      {...props}
    />
  );
}

export { Label };
