import { Section } from '@react-email/components';
import type React from 'react';

interface DualColumnProps {
  styles?: React.CSSProperties;
  pX?: number;
  pY?: number;
  columnOneContent: React.ReactNode;
  columnOneStyles?: React.CSSProperties;
  columnTwoContent: React.ReactNode;
  columnTwoStyles?: React.CSSProperties;
}

export const DualColumn: React.FC<DualColumnProps> = ({
  pX = 0,
  pY = 0,
  columnOneContent,
  columnTwoContent,
  columnOneStyles,
  columnTwoStyles,
  styles,
}) => {
  const colMaxWidth = pX ? (600 - 2 * pX) / 2 : 600 / 2;
  const baseColumnStyles = {
    display: 'inline-block',
    verticalAlign: 'top',
    boxSizing: 'border-box' as const,
  };

  return (
    <Section style={{ ...styles, padding: `${pY}px ${pX}px` }}>
      <Section
        style={{
          ...baseColumnStyles,
          ...columnOneStyles,
          maxWidth: colMaxWidth,
        }}
      >
        {columnOneContent}
      </Section>
      <Section
        style={{
          ...baseColumnStyles,
          ...columnTwoStyles,
          maxWidth: colMaxWidth,
        }}
      >
        {columnTwoContent}
      </Section>
    </Section>
  );
};
