import { defineSlotRecipe } from '@chakra-ui/react';
import { alertAnatomy } from '@chakra-ui/react/anatomy';

import { ALERT_BASE } from './base';
import { ALERT_DEFAULT_VARIANTS } from './defaults';
import { ALERT_VARIANTS } from './variants';

export const alertSlotRecipe = defineSlotRecipe({
  slots: alertAnatomy.keys(),
  className: 'chakra-alert',
  base: ALERT_BASE,
  variants: ALERT_VARIANTS,
  defaultVariants: ALERT_DEFAULT_VARIANTS,
});
