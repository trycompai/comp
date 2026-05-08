#!/bin/bash
# Provision an S3 bucket + scoped IAM user for Comp AI file uploads
# (evidence vault, policy attachments, knowledge base, questionnaires).
#
# Usage:
#   AWS_PROFILE=crypto AWS_REGION=ap-south-1 \
#   APP_ORIGINS=http://13.204.44.227:3000,http://13.204.44.227:3002 \
#   ./selfhost/provision-s3.sh
#
# Outputs to stdout + writes the IAM access key + secret to ./selfhost/.s3-out
# (mode 600). Drop those values into apps/{app,portal,api}/.env as APP_AWS_*.

set -euo pipefail

PROFILE="${AWS_PROFILE:-crypto}"
REGION="${AWS_REGION:-ap-south-1}"
ORIGINS_CSV="${APP_ORIGINS:-http://localhost:3000,http://localhost:3002}"
PROJECT_TAG="${PROJECT_TAG:-compliance}"

BUCKET="${BUCKET_NAME:-compliance-app-$(openssl rand -hex 4)}"
USER_NAME="${IAM_USER:-compliance-app-s3}"
POLICY_NAME="compliance-app-s3-policy"

echo "==> bucket: $BUCKET  region: $REGION  user: $USER_NAME"

# Build CORS rules JSON from comma-separated origins
ORIGINS_JSON=$(echo "$ORIGINS_CSV" | jq -Rc 'split(",")')

aws s3api create-bucket --profile "$PROFILE" --region "$REGION" \
  --bucket "$BUCKET" \
  --create-bucket-configuration LocationConstraint="$REGION" >/dev/null

aws s3api put-bucket-tagging --profile "$PROFILE" --bucket "$BUCKET" \
  --tagging "TagSet=[{Key=Project,Value=$PROJECT_TAG}]"

aws s3api put-public-access-block --profile "$PROFILE" --bucket "$BUCKET" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-encryption --profile "$PROFILE" --bucket "$BUCKET" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-bucket-cors --profile "$PROFILE" --bucket "$BUCKET" \
  --cors-configuration "$(cat <<JSON
{"CORSRules":[{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST","DELETE","HEAD"],"AllowedOrigins":${ORIGINS_JSON},"MaxAgeSeconds":3000}]}
JSON
)"

echo "==> creating IAM user $USER_NAME (will fail safe if already exists)"
aws iam create-user --profile "$PROFILE" --user-name "$USER_NAME" \
  --tags "Key=Project,Value=$PROJECT_TAG" 2>/dev/null || \
  echo "    (user already exists, continuing)"

echo "==> putting bucket-only inline policy"
POLICY_DOC=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {"Effect": "Allow", "Action": ["s3:ListBucket","s3:GetBucketLocation","s3:GetBucketCors"], "Resource": "arn:aws:s3:::${BUCKET}"},
    {"Effect": "Allow", "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:GetObjectAttributes"], "Resource": "arn:aws:s3:::${BUCKET}/*"}
  ]
}
JSON
)
aws iam put-user-policy --profile "$PROFILE" --user-name "$USER_NAME" \
  --policy-name "$POLICY_NAME" --policy-document "$POLICY_DOC"

echo "==> creating access key (NOTE: secret is shown only once)"
KEY_JSON=$(aws iam create-access-key --profile "$PROFILE" --user-name "$USER_NAME" --output json)
AK=$(echo "$KEY_JSON" | jq -r '.AccessKey.AccessKeyId')
SK=$(echo "$KEY_JSON" | jq -r '.AccessKey.SecretAccessKey')

OUT="$(dirname "$0")/.s3-out"
{
  echo "BUCKET=$BUCKET"
  echo "REGION=$REGION"
  echo "ACCESS_KEY_ID=$AK"
  echo "SECRET_ACCESS_KEY=$SK"
} > "$OUT"
chmod 600 "$OUT"

echo
echo "===================="
echo "BUCKET=$BUCKET"
echo "REGION=$REGION"
echo "ACCESS_KEY_ID=$AK"
echo "SECRET_ACCESS_KEY=$SK"
echo "===================="
echo "(also written to $OUT, mode 600)"
echo
echo "Drop these into apps/{app,portal,api}/.env:"
echo "  APP_AWS_REGION=$REGION"
echo "  APP_AWS_BUCKET_NAME=$BUCKET"
echo "  APP_AWS_ORG_ASSETS_BUCKET=$BUCKET"
echo "  APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET=$BUCKET"
echo "  APP_AWS_KNOWLEDGE_BASE_BUCKET=$BUCKET"
echo "  APP_AWS_ACCESS_KEY_ID=$AK"
echo "  APP_AWS_SECRET_ACCESS_KEY=$SK"

echo "==> smoke test (waits for IAM key propagation)"
sleep 12
echo "test-from-comp-self-host" > /tmp/.comp-s3-smoke
AWS_ACCESS_KEY_ID=$AK AWS_SECRET_ACCESS_KEY=$SK \
  aws s3 cp /tmp/.comp-s3-smoke "s3://$BUCKET/test/smoke.txt" --region "$REGION"
AWS_ACCESS_KEY_ID=$AK AWS_SECRET_ACCESS_KEY=$SK \
  aws s3 ls "s3://$BUCKET/test/" --region "$REGION"
rm -f /tmp/.comp-s3-smoke
echo "==> S3 ready"
