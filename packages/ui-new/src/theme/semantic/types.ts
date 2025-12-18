export type Shade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

export type ModeRef = {
  base: string;
  _dark: string;
};

export type SemanticToken = {
  value: ModeRef;
};

export type PaletteSemantics = {
  solid: SemanticToken;
  emphasized: SemanticToken;
  hover: SemanticToken;
  active: SemanticToken;
  subtle: SemanticToken;
  muted: SemanticToken;
  fg: SemanticToken;
  contrast: SemanticToken;
  border: SemanticToken;
  focusRing: SemanticToken;
  DEFAULT?: SemanticToken;
};
