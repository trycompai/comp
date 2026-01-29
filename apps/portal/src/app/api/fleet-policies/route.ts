import { auth } from "@/app/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@db";
import { validateMemberAndOrg } from "../download-agent/utils";
import { getFleetInstance } from "@/utils/fleet";
import { FleetPolicy, Host } from "@/app/(app)/(home)/[orgId]/types";
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from "@/utils/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MDM_POLICY_ID = -9999;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = req.nextUrl.searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const member = await validateMemberAndOrg(session.user.id, organizationId);
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deviceLabelId = member.fleetDmLabelId;

    if (!deviceLabelId) {
      return NextResponse.json({ fleetPolicies: [], device: null });
    }

    const fleet = await getFleetInstance();

    const deviceResponse = await fleet.get(`/labels/${deviceLabelId}/hosts`);
    const device: Host | undefined = deviceResponse.data.hosts[0]; // There should only be one device per label.

    if (!device) {
      return NextResponse.json({ fleetPolicies: [], device: null });
    }

    // should call refetch endpoint.
    await fleet.post(`/hosts/${device.id}/refetch`);

    const platform = device.platform?.toLowerCase();
    const osVersion = device.os_version?.toLowerCase();
    const isMacOS =
      platform === 'darwin' ||
      platform === 'macos' ||
      platform === 'osx' ||
      osVersion?.includes('mac');
    const mdmEnabledStatus = {
      id: MDM_POLICY_ID,
      response: device.mdm.connected_to_fleet ? 'pass' : 'fail',
      name: 'MDM Enabled',
    };
    const deviceWithPolicies = await fleet.get(`/hosts/${device.id}`);
    const fleetPolicies: FleetPolicy[] = [
      ...(deviceWithPolicies.data.host.policies || []),
      ...(isMacOS ? [mdmEnabledStatus] : []),
    ];

    // Get Policy Results from the database.
    const results = await db.fleetPolicyResult.findMany({
      where: { organizationId, userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    const fleetPolicyResults = await Promise.all(
      results.map(async (result) => {
        const signedAttachments = await Promise.all(
          result.attachments.map(async (key) => {
            if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
              return key;
            }
            try {
              const command = new GetObjectCommand({
                Bucket: APP_AWS_ORG_ASSETS_BUCKET,
                Key: key,
              });
              return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            } catch {
              return key;
            }
          }),
        );
  
        return {
          ...result,
          attachments: signedAttachments,
        };
      }),
    );
    
    return NextResponse.json({
      device,
      fleetPolicies: fleetPolicies.map((policy) => {
        const policyResult = fleetPolicyResults.find((result) => result.fleetPolicyId === policy.id);
        return {
          ...policy,
          response: policy.response === 'pass' || policyResult?.fleetPolicyResponse === 'pass' ? 'pass' : 'fail',
          attachments: policyResult?.attachments || [],
        }
      }),
    });
  } catch (error) {
    console.error('Error fetching fleet policies:', error);
    return NextResponse.json({ error: 'Failed to fetch fleet policies' }, { status: 500 });
  }
}