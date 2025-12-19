import type { ModeRef, SemanticToken, Shade } from './types';

export const ref = ({ palette, shade }: { palette: string; shade: Shade }): string => {
  return `{colors.${palette}.${shade}}`;
};

export const mode = ({ base, dark }: { base: string; dark: string }): ModeRef => {
  return { base, _dark: dark };
};

export const token = ({ base, dark }: { base: string; dark: string }): SemanticToken => {
  return { value: mode({ base, dark }) };
};
