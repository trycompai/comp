export const ALERT_BASE = {
  root: {
    width: 'full',
    display: 'flex',
    alignItems: 'flex-start',
    position: 'relative',
    borderRadius: 'card',
  },
  title: {
    fontWeight: 'medium',
  },
  description: {
    display: 'inline',
    color: 'fg.muted',
  },
  indicator: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
    width: '1em',
    height: '1em',
    _icon: { boxSize: 'full' },
  },
  content: {
    display: 'flex',
    flex: '1',
    gap: '1',
  },
} as const;
