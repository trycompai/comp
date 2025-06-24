import * as React from 'react';
const SVGComponent = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    className="h-10 w-30 grayscale opacity-70 text-muted-foreground dark:text-white"
    xmlns="http://www.w3.org/2000/svg"
    width={120}
    height={40}
    viewBox="0 0 93 40"
    {...props}
  >
    <path
      d="M10.8 30.3c-6 0-9.42-3.18-9.42-8.64V9.9h3.21v11.55c0 4.05 1.8 5.73 6.21 5.73s6.21-1.68 6.21-5.73V9.9h3.24v11.76c0 5.46-3.42 8.64-9.45 8.64m15.561-.3h-3.24V15.09h2.97v4.62h.21c.45-2.52 2.43-4.92 6.21-4.92 4.14 0 6.18 2.79 6.18 6.24V30h-3.24v-8.1c0-2.79-1.26-4.2-4.35-4.2-3.27 0-4.74 1.68-4.74 4.92zm18.457 0h-3.24V9.9h3.24V21h4.26l4.47-5.91h3.78l-5.61 7.17 5.58 7.74h-3.81l-4.41-6.09h-4.26zm21.604.3c-4.89 0-8.1-2.76-8.1-7.74 0-4.65 3.18-7.77 8.04-7.77 4.62 0 7.77 2.55 7.77 7.08 0 .54-.03.96-.12 1.41h-12.66c.12 2.88 1.53 4.41 4.98 4.41 3.12 0 4.41-1.02 4.41-2.79v-.24h3.24v.27c0 3.18-3.12 5.37-7.56 5.37m-.12-12.96c-3.3 0-4.74 1.47-4.92 4.14h9.69v-.06c0-2.76-1.59-4.08-4.77-4.08M78.959 35.1h-2.13v-2.94h2.91c1.32 0 1.86-.36 2.31-1.38l.36-.78-7.35-14.91h3.63l3.81 7.92 1.47 3.57h.24l1.41-3.6 3.51-7.89h3.57l-7.77 16.53c-1.23 2.67-2.91 3.48-5.97 3.48"
      fill="currentColor"
    />
    <defs>
      <radialGradient
        id="a"
        cx={0}
        cy={0}
        r={1}
        gradientUnits="userSpaceOnUse"
        gradientTransform="matrix(92.99962 40.00002 -39.94115 92.86274 0 0)"
      >
        <stop offset={0.269} stopColor="currentColor" />
        <stop offset={0.904} stopColor="currentColor" stopOpacity={0.5} />
      </radialGradient>
    </defs>
  </svg>
);
export default SVGComponent;
