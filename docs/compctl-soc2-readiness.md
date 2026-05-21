# compctl SOC 2 readiness runbook

This runbook proves SOC 2 Type 1 readiness in a deployed Comp AI instance using only `compctl`, direct AWS CLI, and read-only customer repository inspection.

Guardrails:

- Do not edit customer repositories such as Helvetia.
- Do not run GitHub merge commands.
- Do not push to `dev` or `prod` branches.
- Keep API keys, bootstrap tokens, magic links, and AWS secrets in environment variables or `/tmp` files. Do not paste them into logs or tickets.

## Prerequisites

- AWS CLI is authenticated to the target AWS account.
- `compctl` is built:

```sh
bun run --filter @trycompai/compctl build
```

- The deployed API has:
  - `COMPCTL_BOOTSTRAP_TOKEN`
  - `SECURITY_HUB_ROLE_ASSUMER_ARN`
  - AWS credentials capable of assuming the role assumer role
  - `ENCRYPTION_KEY`

## Register organization

```sh
BOOTSTRAP="$(cat /tmp/compctl-bootstrap-token)"

node packages/compctl/dist/index.js --api-url http://13.204.44.227:3333 register \
  --company-name "Helvetia SOC 2 Readiness" \
  --owner-email "compctl-helvetia@example.com" \
  --website "https://hfss.ch" \
  --bootstrap-token "$BOOTSTRAP" \
  > /tmp/compctl-register.json

ORG_ID="$(jq -r '.data.organizationId' /tmp/compctl-register.json)"
COMP_API_KEY="$(jq -r '.data.apiKey' /tmp/compctl-register.json)"
ROLE_ASSUMER_ARN="$(jq -r '.data.aws.roleAssumerArn' /tmp/compctl-register.json)"
export COMP_API_KEY
```

## Set up AWS role with direct AWS CLI

```sh
node packages/compctl/dist/index.js --api-url http://13.204.44.227:3333 aws setup-role \
  --profile crypto \
  --region eu-central-1 \
  --external-id "$ORG_ID" \
  --principal-arn "$ROLE_ASSUMER_ARN" \
  > /tmp/compctl-setup-role.json

ROLE_ARN="$(jq -r '.data.roleArn' /tmp/compctl-setup-role.json)"
```

## Connect and scan AWS

```sh
node packages/compctl/dist/index.js --api-url http://13.204.44.227:3333 aws connect \
  --role-arn "$ROLE_ARN" \
  --external-id "$ORG_ID" \
  --regions eu-central-1,ap-south-1 \
  > /tmp/compctl-aws-connect.json

node packages/compctl/dist/index.js --api-url http://13.204.44.227:3333 aws scan \
  > /tmp/compctl-aws-scan.json
```

## Apply readiness from a read-only repo

```sh
node packages/compctl/dist/index.js --api-url http://13.204.44.227:3333 readiness apply \
  --repo /Users/mehul/Desktop/projects/helvetia \
  --target-completion 0.9 \
  > /tmp/compctl-readiness-apply.json

node packages/compctl/dist/index.js --api-url http://13.204.44.227:3333 readiness status \
  > /tmp/compctl-readiness-status.json
```

Expected proof points:

- `readinessScore` is populated.
- Tasks, policies, evidence, vendors, risks, and AWS integration counts are non-zero.
- `cloud.status` is `success`.
- `cloud.totalChecked`, `cloud.passedCount`, and `cloud.failedCount` are populated.
- `appUrls` contains the overview, frameworks, tasks, cloud tests, vendors, and risks URLs.

