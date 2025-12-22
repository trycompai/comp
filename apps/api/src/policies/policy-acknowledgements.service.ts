import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@trycompai/db';
import { BUCKET_NAME, s3Client } from '../app/s3';

interface AcknowledgePolicyParams {
  organizationId: string;
  userId: string;
  policyId: string;
}

interface AcknowledgePoliciesParams {
  organizationId: string;
  userId: string;
  policyIds: string[];
}

interface GetPolicyPdfUrlParams {
  organizationId: string;
  userId: string;
  policyId: string;
}

@Injectable()
export class PolicyAcknowledgementsService {
  async acknowledgePolicy({
    organizationId,
    userId,
    policyId,
  }: AcknowledgePolicyParams) {
    const member = await db.member.findFirst({
      where: { userId, organizationId, deactivated: false },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    const policy = await db.policy.findFirst({
      where: { id: policyId, organizationId, status: 'published' },
      select: { id: true, signedBy: true },
    });

    if (!policy) {
      throw new NotFoundException('Policy not found');
    }

    if (policy.signedBy.includes(member.id)) {
      return { success: true };
    }

    await db.policy.update({
      where: { id: policyId },
      data: { signedBy: { push: member.id } },
    });

    return { success: true };
  }

  async acknowledgePolicies({
    organizationId,
    userId,
    policyIds,
  }: AcknowledgePoliciesParams) {
    if (!Array.isArray(policyIds) || policyIds.length === 0) {
      throw new BadRequestException('policyIds must be a non-empty array');
    }

    const member = await db.member.findFirst({
      where: { userId, organizationId, deactivated: false },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    const policies = await db.policy.findMany({
      where: { id: { in: policyIds }, organizationId, status: 'published' },
      select: { id: true, signedBy: true },
    });

    const updates = policies
      .filter((p) => !p.signedBy.includes(member.id))
      .map((p) =>
        db.policy.update({
          where: { id: p.id },
          data: { signedBy: { push: member.id } },
        }),
      );

    await Promise.all(updates);

    return { success: true };
  }

  async getPolicyPdfUrl({
    organizationId,
    userId,
    policyId,
  }: GetPolicyPdfUrlParams) {
    const policy = await db.policy.findFirst({
      where: { id: policyId, organizationId, status: 'published' },
      select: { pdfUrl: true },
    });

    if (!policy?.pdfUrl) {
      return { success: false, error: 'No PDF found for this policy.' };
    }

    const member = await db.member.findFirst({
      where: { userId, organizationId, deactivated: false },
      select: { id: true },
    });

    if (!member) {
      return { success: false, error: 'Access denied.' };
    }

    if (!s3Client || !BUCKET_NAME) {
      return { success: false, error: 'File service not configured.' };
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: policy.pdfUrl,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    return { success: true, data: signedUrl };
  }
}
