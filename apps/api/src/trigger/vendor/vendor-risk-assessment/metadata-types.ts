export type ResearchMessageType = 'searching' | 'found' | 'analyzing' | 'error';

export type ResearchMessage = {
  text: string;
  type: ResearchMessageType;
  timestamp: number;
  url?: string;
};

export type ResearchPhase =
  | 'starting'
  | 'researching'
  | 'core_complete'
  | 'complete'
  | 'failed';

export type ResearchMetadata = {
  phase: ResearchPhase;
  messages: ResearchMessage[];
  coreReady: boolean;
  newsReady: boolean;
};
