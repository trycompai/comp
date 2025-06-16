import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
export const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

if (
  !AWS_ACCESS_KEY_ID ||
  !AWS_SECRET_ACCESS_KEY ||
  !BUCKET_NAME ||
  !AWS_REGION
) {
  // Log the error in production environments
  if (process.env.NODE_ENV === "production") {
    console.error(
      "AWS S3 credentials or configuration missing in environment variables.",
    );
  } else {
    // Throw in development for immediate feedback
    throw new Error(
      "AWS S3 credentials or configuration missing. Check environment variables.",
    );
  }
  // Optionally, you could export a dummy/error client or null here
  // depending on how you want consuming code to handle the missing config.
}

// Create a single S3 client instance
// Add null checks or assertions if the checks above don't guarantee non-null values
export const s3Client = new S3Client({
  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  region: AWS_REGION!,
  credentials: {
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    accessKeyId: AWS_ACCESS_KEY_ID!,
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    secretAccessKey: AWS_SECRET_ACCESS_KEY!,
  },
});

// Ensure BUCKET_NAME is exported and non-null checked if needed elsewhere explicitly
if (!BUCKET_NAME && process.env.NODE_ENV === "production") {
  console.error("AWS_BUCKET_NAME is not defined.");
}

export function extractS3KeyFromUrl(url: string): string {
  const fullUrlMatch = url.match(/amazonaws\.com\/(.+)$/);
  if (fullUrlMatch?.[1]) {
    return decodeURIComponent(fullUrlMatch[1]);
  }
  if (!url.includes("amazonaws.com") && url.split("/").length > 1) {
    return url;
  }
  console.error("Invalid S3 URL format for deletion:", url);
  throw new Error("Invalid S3 URL format");
}

export async function getFleetAgent({
  os,
}: {
  os: "macos" | "windows" | "linux";
}) {
  const fleetBucketName = process.env.FLEET_AGENT_BUCKET_NAME;

  if (!fleetBucketName) {
    throw new Error("FLEET_AGENT_BUCKET_NAME is not defined.");
  }

  console.log("Getting fleet agent for os: ", {
    Bucket: fleetBucketName,
    Key: `/${os}/fleet-osquery.pkg`,
  });

  const getFleetAgentCommand = new GetObjectCommand({
    Bucket: fleetBucketName,
    Key: `${os}/fleet-osquery.pkg`,
  });

  const response = await s3Client.send(getFleetAgentCommand);

  console.log("Fleet agent downloaded for os: ", os);
  return response.Body;
}
