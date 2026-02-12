import type { ApiBodyOptions } from '@nestjs/swagger';
import { CreatePolicyDto } from '../dto/create-policy.dto';
import { UpdatePolicyDto } from '../dto/update-policy.dto';
import { UploadPolicyPdfDto } from '../dto/upload-policy-pdf.dto';

export const POLICY_BODIES: Record<string, ApiBodyOptions> = {
  createPolicy: {
    description: 'Policy creation data',
    type: CreatePolicyDto,
  },
  updatePolicy: {
    description: 'Policy update data',
    type: UpdatePolicyDto,
  },
  uploadPolicyPdf: {
    description: 'Upload or replace policy PDF',
    type: UploadPolicyPdfDto,
  },
  uploadPolicyVersionPdf: {
    description: 'Upload or replace policy version PDF',
    type: UploadPolicyPdfDto,
  },
};
