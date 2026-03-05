import { SetMetadata } from '@nestjs/common';

export const SKIP_ORG_CHECK_KEY = 'skipOrgCheck';
export const SkipOrgCheck = () => SetMetadata(SKIP_ORG_CHECK_KEY, true);
