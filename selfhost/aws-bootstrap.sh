#!/bin/bash
# Provision the AWS resources for a fresh self-host: key pair, security group,
# EC2 instance (t4g.large), Elastic IP, and tag everything Project=compliance.
#
# Usage:
#   ./selfhost/aws-bootstrap.sh
#
# Reads (override via env):
#   AWS_PROFILE   — default: crypto
#   AWS_REGION    — default: ap-south-1
#   PROJECT_TAG   — default: compliance
set -euo pipefail

PROFILE="${AWS_PROFILE:-crypto}"
REGION="${AWS_REGION:-ap-south-1}"
PROJECT="${PROJECT_TAG:-compliance}"

echo "==> Using profile=$PROFILE region=$REGION tag=Project=$PROJECT"

OPERATOR_IP=$(curl -s4 ifconfig.me)
echo "==> Operator IP: $OPERATOR_IP"

AMI=$(aws ec2 describe-images --profile "$PROFILE" --region "$REGION" \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023.*-arm64" "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' --output text)
echo "==> AMI: $AMI (latest AL2023 ARM64)"

VPC=$(aws ec2 describe-vpcs --profile "$PROFILE" --region "$REGION" \
  --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)
SUBNET=$(aws ec2 describe-subnets --profile "$PROFILE" --region "$REGION" \
  --filters "Name=default-for-az,Values=true" --query 'Subnets[0].SubnetId' --output text)
echo "==> VPC: $VPC  Subnet: $SUBNET"

# Key pair
KEY=~/.ssh/${PROJECT}-key.pem
if [ ! -f "$KEY" ]; then
  aws ec2 create-key-pair --profile "$PROFILE" --region "$REGION" \
    --key-name "${PROJECT}-key" --key-type ed25519 --key-format pem \
    --tag-specifications "ResourceType=key-pair,Tags=[{Key=Project,Value=$PROJECT}]" \
    --query 'KeyMaterial' --output text > "$KEY"
  chmod 600 "$KEY"
  echo "==> Key pair created at $KEY"
else
  echo "==> Key pair already exists at $KEY"
fi

# Security group
SG=$(aws ec2 describe-security-groups --profile "$PROFILE" --region "$REGION" \
  --filters "Name=group-name,Values=${PROJECT}-sg" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)
if [ -z "$SG" ] || [ "$SG" = "None" ]; then
  SG=$(aws ec2 create-security-group --profile "$PROFILE" --region "$REGION" \
    --group-name "${PROJECT}-sg" --description "Comp AI self-host" --vpc-id "$VPC" \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Project,Value=$PROJECT}]" \
    --query 'GroupId' --output text)
  aws ec2 authorize-security-group-ingress --profile "$PROFILE" --region "$REGION" --group-id "$SG" \
    --ip-permissions \
      "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=${OPERATOR_IP}/32,Description=operator}]" \
      "IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0,Description=http}]" \
      "IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0,Description=https}]" \
      "IpProtocol=tcp,FromPort=3000,ToPort=3000,IpRanges=[{CidrIp=0.0.0.0/0,Description=app}]" \
      "IpProtocol=tcp,FromPort=3002,ToPort=3002,IpRanges=[{CidrIp=0.0.0.0/0,Description=portal}]" \
      "IpProtocol=tcp,FromPort=3333,ToPort=3333,IpRanges=[{CidrIp=0.0.0.0/0,Description=api}]"
  echo "==> SG created: $SG"
else
  echo "==> SG exists: $SG"
fi

# Instance
INSTANCE=$(aws ec2 run-instances --profile "$PROFILE" --region "$REGION" \
  --image-id "$AMI" --instance-type t4g.large --key-name "${PROJECT}-key" \
  --security-group-ids "$SG" --subnet-id "$SUBNET" --associate-public-ip-address \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":20,"VolumeType":"gp3","DeleteOnTermination":true,"Encrypted":true}}]' \
  --user-data "file://$(dirname "$0")/userdata.sh" \
  --metadata-options 'HttpTokens=required,HttpEndpoint=enabled' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${PROJECT}-app},{Key=Project,Value=$PROJECT}]" \
  --query 'Instances[0].InstanceId' --output text)
echo "==> Instance: $INSTANCE (waiting for running…)"
aws ec2 wait instance-running --profile "$PROFILE" --region "$REGION" --instance-ids "$INSTANCE"

# Elastic IP
EIP_LINE=$(aws ec2 allocate-address --profile "$PROFILE" --region "$REGION" --domain vpc \
  --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Project,Value=$PROJECT}]" \
  --query '[AllocationId,PublicIp]' --output text)
ALLOC_ID=$(echo "$EIP_LINE" | awk '{print $1}')
PUBLIC_IP=$(echo "$EIP_LINE" | awk '{print $2}')
aws ec2 associate-address --profile "$PROFILE" --region "$REGION" \
  --allocation-id "$ALLOC_ID" --instance-id "$INSTANCE" >/dev/null

echo
echo "===================="
echo "INSTANCE_ID=$INSTANCE"
echo "PUBLIC_IP=$PUBLIC_IP"
echo "ALLOC_ID=$ALLOC_ID"
echo "SG_ID=$SG"
echo "SSH: ssh -i $KEY ec2-user@$PUBLIC_IP"
echo "===================="
