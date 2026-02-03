import type { ApiBodyOptions } from '@nestjs/swagger';
import {
  CreateVersionDto,
  PublishVersionDto,
  SubmitForApprovalDto,
  UpdateVersionContentDto,
} from '../dto/version.dto';

export const VERSION_BODIES: Record<string, ApiBodyOptions> = {
  createVersion: {
    type: CreateVersionDto,
    description: 'Create a new policy version draft',
  },
  updateVersionContent: {
    type: UpdateVersionContentDto,
    description: 'Update content for a policy version',
  },
  publishVersion: {
    type: PublishVersionDto,
    description: 'Publish a new policy version',
  },
  submitForApproval: {
    type: SubmitForApprovalDto,
    description: 'Submit a policy version for approval',
  },
};
