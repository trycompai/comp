'use client';

import { useLayoutEffect } from 'react';

interface Props {
  children: React.ReactNode;
}

export function AutomationLayoutWrapper({ children }: Props) {
  useLayoutEffect(() => {
    // Find the DynamicMinHeight wrapper and header
    const dynamicMinHeight = document.querySelector('[style*="min-height"]') as HTMLElement;
    const header = document.querySelector('header.sticky') as HTMLElement;
    const parentContainer = dynamicMinHeight?.parentElement;

    if (dynamicMinHeight && header && parentContainer) {
      // Store original styles
      const originalStyles = {
        dynamicMinHeight: {
          minHeight: dynamicMinHeight.style.minHeight,
          className: dynamicMinHeight.className,
        },
        parentContainer: {
          display: parentContainer.style.display,
          flexDirection: parentContainer.style.flexDirection,
          height: parentContainer.style.height,
        },
      };

      // Apply automation-specific styles
      dynamicMinHeight.style.minHeight = '0';
      dynamicMinHeight.className = dynamicMinHeight.className
        .replace(/mx-auto|px-4|py-4/g, '')
        .trim();

      // Make parent container flex column full height
      parentContainer.style.display = 'flex';
      parentContainer.style.flexDirection = 'column';
      parentContainer.style.height = '100vh';

      // Make the dynamic min height container flex-1
      dynamicMinHeight.style.flex = '1';
      dynamicMinHeight.style.minHeight = '0';
      dynamicMinHeight.style.display = 'flex';
      dynamicMinHeight.style.flexDirection = 'column';

      // Cleanup function to restore original styles
      return () => {
        dynamicMinHeight.style.minHeight = originalStyles.dynamicMinHeight.minHeight;
        dynamicMinHeight.className = originalStyles.dynamicMinHeight.className;
        dynamicMinHeight.style.flex = '';
        dynamicMinHeight.style.display = '';
        dynamicMinHeight.style.flexDirection = '';

        parentContainer.style.display = originalStyles.parentContainer.display;
        parentContainer.style.flexDirection = originalStyles.parentContainer.flexDirection;
        parentContainer.style.height = originalStyles.parentContainer.height;
      };
    }
  }, []);

  return <div className="flex flex-col h-full">{children}</div>;
}
