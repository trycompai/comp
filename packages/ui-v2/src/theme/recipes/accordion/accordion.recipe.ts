import { defineSlotRecipe } from '@chakra-ui/react';
import { accordionAnatomy } from '@chakra-ui/react/anatomy';

// NOTE: This is based on Chakra's default accordion slot recipe, with one key change:
// - `itemTrigger.cursor = 'pointer'` so accordions feel clickable everywhere by default.
export const accordionSlotRecipe = defineSlotRecipe({
  className: 'chakra-accordion',
  slots: accordionAnatomy.keys(),
  base: {
    root: {
      width: 'full',
      '--accordion-radius': 'radii.l2',
    },
    item: {
      overflowAnchor: 'none',
    },
    itemTrigger: {
      display: 'flex',
      alignItems: 'center',
      textAlign: 'start',
      width: 'full',
      outline: '0',
      gap: '3',
      fontWeight: 'medium',
      borderRadius: 'var(--accordion-radius)',
      cursor: 'pointer',
      _focusVisible: {
        outline: '2px solid',
        outlineColor: 'colorPalette.focusRing',
      },
      _disabled: {
        layerStyle: 'disabled',
        cursor: 'not-allowed',
      },
    },
    itemBody: {
      pt: 'var(--accordion-padding-y)',
      pb: 'calc(var(--accordion-padding-y) * 2)',
    },
    itemContent: {
      overflow: 'hidden',
      borderRadius: 'var(--accordion-radius)',
      _open: {
        animationName: 'expand-height, fade-in',
        animationDuration: 'moderate',
      },
      _closed: {
        animationName: 'collapse-height, fade-out',
        animationDuration: 'moderate',
      },
    },
    itemIndicator: {
      transition: 'rotate 0.2s',
      transformOrigin: 'center',
      color: 'fg.subtle',
      _open: {
        rotate: '180deg',
      },
      _icon: {
        width: '1.2em',
        height: '1.2em',
      },
    },
  },
  variants: {
    variant: {
      outline: {
        item: {
          borderBottomWidth: '1px',
        },
      },
      subtle: {
        itemTrigger: {
          px: 'var(--accordion-padding-x)',
        },
        itemContent: {
          px: 'var(--accordion-padding-x)',
        },
        item: {
          borderRadius: 'var(--accordion-radius)',
          _open: {
            bg: 'colorPalette.subtle',
          },
        },
      },
      enclosed: {
        root: {
          borderWidth: '1px',
          borderRadius: 'var(--accordion-radius)',
          divideY: '1px',
          overflow: 'hidden',
        },
        itemTrigger: {
          px: 'var(--accordion-padding-x)',
        },
        itemContent: {
          px: 'var(--accordion-padding-x)',
        },
        item: {
          _open: {
            bg: 'bg.subtle',
          },
        },
      },
      plain: {},
    },
    size: {
      sm: {
        root: {
          '--accordion-padding-x': 'spacing.3',
          '--accordion-padding-y': 'spacing.2',
        },
        itemTrigger: {
          textStyle: 'sm',
          py: 'var(--accordion-padding-y)',
        },
      },
      md: {
        root: {
          '--accordion-padding-x': 'spacing.4',
          '--accordion-padding-y': 'spacing.2',
        },
        itemTrigger: {
          textStyle: 'md',
          py: 'var(--accordion-padding-y)',
        },
      },
      lg: {
        root: {
          '--accordion-padding-x': 'spacing.4.5',
          '--accordion-padding-y': 'spacing.2.5',
        },
        itemTrigger: {
          textStyle: 'lg',
          py: 'var(--accordion-padding-y)',
        },
      },
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'outline',
  },
});
