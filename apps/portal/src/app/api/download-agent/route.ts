import { auth } from "@/app/lib/auth";
import { fleet } from "@/utils/fleet";
import { logger } from "@/utils/logger";
import { getFleetAgent } from "@/utils/s3";
import { db } from "@comp/db";
import archiver from "archiver";
import { AxiosError } from "axios";
import { type NextRequest, NextResponse } from "next/server";
import type { Readable } from "node:stream";
import { PassThrough } from "node:stream";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { orgId, employeeId } = await req.json();

  if (!orgId || !employeeId) {
    return new NextResponse("Missing orgId or employeeId", { status: 400 });
  }

  const user = session.user;
  const fleetDevicePathMac = process.env.FLEET_DEVICE_PATH_MAC;

  if (!fleetDevicePathMac) {
    logger("FLEET_DEVICE_PATH_MAC not configured in environment variables");
    return new NextResponse(
      "Server configuration error: FLEET_DEVICE_PATH_MAC is missing.",
      { status: 500 },
    );
  }

  const member = await db.member.findFirst({
    where: {
      userId: user.id,
      organizationId: orgId,
    },
  });

  if (!member) {
    logger("Member not found", { userId: user.id, orgId });
    return new NextResponse("Member not found", { status: 404 });
  }

  const org = await db.organization.findUnique({
    where: {
      id: orgId,
    },
  });

  if (!org) {
    logger("Organization not found", { orgId });
    return new NextResponse("Organization not found", { status: 404 });
  }

  const script = `#!/bin/bash
# Create org marker for Fleet policies/labels
set -euo pipefail
ORG_ID="${orgId}"
EMPLOYEE_ID="${employeeId}"
FLEET_DIR="${fleetDevicePathMac}"
mkdir -p "$FLEET_DIR"
echo "$ORG_ID" > "$FLEET_DIR/${orgId}"
echo "$EMPLOYEE_ID" > "$FLEET_DIR/${employeeId}"
chmod 755 "$FLEET_DIR"
chmod 644 "$FLEET_DIR/${orgId}"
chmod 644 "$FLEET_DIR/${employeeId}"
exit 0`;

  const stream = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(stream);

  archive.append(script, { name: "run_me_first.command", mode: 0o755 });

  const pkg = await getFleetAgent({ os: "macos" });

  archive.append(pkg as Readable, {
    name: "compai-device-agent.pkg",
    store: true,
  });

  archive.finalize().catch((err) => {
    logger("Error finalizing archive", { error: err });
    stream.destroy();
  });

  const filename = "compai-device-agent.zip";

  try {
    const response = await fleet.post("/labels", {
      name: employeeId,
      query: `SELECT 1 FROM file WHERE path = '${fleetDevicePathMac}/${employeeId}' LIMIT 1;`,
    });

    const labelId = response.data.label.id;

    await db.member.update({
      where: {
        id: member.id,
      },
      data: {
        fleetDmLabelId: labelId,
      },
    });
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 409) {
      // Label already exists, which is fine.
      logger("Fleet label already exists, skipping creation.", { employeeId });
    } else {
      // Re-throw other errors
      throw error;
    }
  }

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
