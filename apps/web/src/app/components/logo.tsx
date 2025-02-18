"use client";

import type * as React from "react";

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={64}
    height={64}
    viewBox="0 0 64 64"
    fill="currentColor"
    role="img"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Comp AI Logo"
    {...props}
  >
    <path
      d="m46.857 15.238 -1.865 -1.341 -12.323 -8.847a1.143 1.143 0 0 0 -1.333 0L2.762 25.561a1.143 1.143 0 0 0 -0.477 0.928v11.018a1.143 1.143 0 0 0 0.477 0.929l28.574 20.514a1.143 1.143 0 0 0 1.333 0l28.569 -20.514a1.143 1.143 0 0 0 0.477 -0.929v-11.017a1.143 1.143 0 0 0 -0.477 -0.929zM31.336 10.421a1.143 1.143 0 0 1 1.333 0l7.29 5.233a1.143 1.143 0 0 1 0 1.857l-3.458 2.48a0.731 0.731 0 0 1 -0.849 -0.001l-2.983 -2.141a1.143 1.143 0 0 0 -1.333 0l-9.926 7.126a1.143 1.143 0 0 0 0 1.857l2.779 1.994 3.739 2.689 3.406 2.445a1.143 1.143 0 0 0 1.334 0l9.926 -7.131a1.143 1.143 0 0 0 0 -1.856l-2.352 -1.691a0.375 0.375 0 0 1 0 -0.608l4.086 -2.93a1.143 1.143 0 0 1 1.333 0l7.287 5.232a1.143 1.143 0 0 1 0 1.857l-3.459 2.483 -16.817 12.075a1.143 1.143 0 0 1 -1.333 0l-8.583 -6.162 -3.741 -2.682 -4.497 -3.229 -3.458 -2.483a1.143 1.143 0 0 1 0 -1.857z"
      fill="currentColor"
    />
  </svg>
);

export default Logo;
