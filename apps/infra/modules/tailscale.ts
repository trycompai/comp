import * as aws from '@pulumi/aws';
import { CommonConfig, DatabaseOutputs, NetworkOutputs } from '../types';

export function createTailscale(
  config: CommonConfig,
  network: NetworkOutputs,
  database: DatabaseOutputs,
) {
  const { commonTags } = config;

  // Tailscale Auth Key Secret
  const tailscaleAuthSecret = new aws.secretsmanager.Secret(
    `${config.projectName}-tailscale-auth-secret`,
    {
      name: `${config.projectName}/tailscale/auth-key`,
      description: 'Tailscale auth key for subnet router',
      tags: {
        ...commonTags,
        Name: `${config.projectName}-tailscale-auth-secret`,
        Type: 'secret',
      },
    },
  );

  // Store the auth key version from configuration
  const tailscaleAuthSecretVersion = new aws.secretsmanager.SecretVersion(
    `${config.projectName}-tailscale-auth-secret-version`,
    {
      secretId: tailscaleAuthSecret.id,
      secretString:
        config.tailscale?.authKey.apply((key) =>
          JSON.stringify({
            authKey: key || 'tskey-auth-xxxxxx-REPLACE_WITH_REAL_KEY',
            instructions:
              key === 'NOT_SET'
                ? 'Replace with real Tailscale auth key from https://login.tailscale.com/admin/settings/keys'
                : 'Configured via Pulumi config',
          }),
        ) ||
        JSON.stringify({
          authKey: 'tskey-auth-xxxxxx-REPLACE_WITH_REAL_KEY',
          instructions:
            'Replace with real Tailscale auth key from https://login.tailscale.com/admin/settings/keys',
        }),
    },
  );

  // IAM Role for Tailscale EC2 instance
  const tailscaleRole = new aws.iam.Role(`${config.projectName}-tailscale-instance-role`, {
    name: `${config.projectName}-tailscale-instance-role`,
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'ec2.amazonaws.com',
          },
        },
      ],
    }),
    tags: {
      ...commonTags,
      Name: 'tailscale-instance-role',
      Type: 'iam-role',
    },
  });

  // IAM Policy for Tailscale instance
  const tailscalePolicy = new aws.iam.RolePolicy(
    `${config.projectName}-tailscale-instance-policy`,
    {
      role: tailscaleRole.id,
      policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
            Resource: tailscaleAuthSecret.arn,
          },
          {
            Effect: 'Allow',
            Action: [
              'ec2:DescribeRouteTables',
              'ec2:CreateRoute',
              'ec2:DeleteRoute',
              'ec2:ReplaceRoute',
            ],
            Resource: '*',
          },
          {
            Effect: 'Allow',
            Action: [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:PutLogEvents',
              'logs:DescribeLogGroups',
              'logs:DescribeLogStreams',
            ],
            Resource: '*',
          },
        ],
      }),
    },
  );

  // Instance Profile for Tailscale EC2 instance
  const tailscaleInstanceProfile = new aws.iam.InstanceProfile(
    `${config.projectName}-tailscale-instance-profile`,
    {
      name: `${config.projectName}-tailscale-instance-profile`,
      role: tailscaleRole.name,
      tags: {
        ...commonTags,
        Name: `${config.projectName}-tailscale-instance-profile`,
        Type: 'instance-profile',
      },
    },
  );

  // User data script for Tailscale setup
  const userData = `#!/bin/bash
set -e

# Update system
yum update -y

# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Install AWS CLI and jq
yum install -y aws-cli jq

# Create tailscale service log group
aws logs create-log-group --log-group-name /tailscale/${config.projectName} --region ${config.awsRegion} || true

# Get Tailscale auth key from Secrets Manager
AUTH_KEY=$(aws secretsmanager get-secret-value --secret-id ${tailscaleAuthSecret.arn} --region ${config.awsRegion} --query SecretString --output text | jq -r .authKey)

# Start Tailscale as subnet router
tailscale up --authkey=$AUTH_KEY --advertise-routes=${network.vpcCidr} --accept-routes --snat-subnet-routes=false

# Enable IP forwarding
echo 'net.ipv4.ip_forward = 1' | tee -a /etc/sysctl.conf
echo 'net.ipv6.conf.all.forwarding = 1' | tee -a /etc/sysctl.conf
sysctl -p

# Install CloudWatch agent for monitoring
yum install -y amazon-cloudwatch-agent

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/tailscaled.log",
            "log_group_name": "/tailscale/${config.projectName}",
            "log_stream_name": "tailscaled"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "Tailscale/${config.projectName}",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_iowait"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["used_percent"],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "net": {
        "measurement": ["bytes_sent", "bytes_recv"],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s

# Create health check script
cat > /usr/local/bin/tailscale-health.sh << 'EOF'
#!/bin/bash
# Health check for Tailscale subnet router
tailscale status --json | jq -e '.BackendState == "Running"' > /dev/null
EOF

chmod +x /usr/local/bin/tailscale-health.sh

# Setup cron for periodic health checks
echo "*/5 * * * * /usr/local/bin/tailscale-health.sh || systemctl restart tailscaled" | crontab -

echo "Tailscale subnet router setup completed"
`;

  // Tailscale EC2 instance
  const tailscaleInstance = new aws.ec2.Instance(`${config.projectName}-tailscale-subnet-router`, {
    instanceType: 't3.nano', // Small instance for routing
    ami: aws.ec2
      .getAmi({
        mostRecent: true,
        owners: ['amazon'],
        filters: [
          {
            name: 'name',
            values: ['amzn2-ami-hvm-*-x86_64-gp2'],
          },
        ],
      })
      .then((ami) => ami.id),
    // keyName: `${config.projectName}-key`, // Uncomment and set if key pair exists
    vpcSecurityGroupIds: [network.securityGroups.tailscale],
    subnetId: network.privateSubnetIds[0], // Deploy in private subnet
    iamInstanceProfile: tailscaleInstanceProfile.name,
    sourceDestCheck: false, // Required for routing
    userData: Buffer.from(userData).toString('base64'),
    tags: {
      ...commonTags,
      Name: `${config.projectName}-tailscale-subnet-router`,
      Type: 'ec2-instance',
      Purpose: 'tailscale-router',
    },
  });

  // CloudWatch Log Group for Tailscale
  const tailscaleLogGroup = new aws.cloudwatch.LogGroup(`${config.projectName}-tailscale-logs`, {
    name: `/tailscale/${config.projectName}`,
    retentionInDays: config.logRetentionDays,
    tags: {
      ...commonTags,
      Name: `${config.projectName}-tailscale-logs`,
      Type: 'log-group',
    },
  });

  // CloudWatch Alarm for Tailscale health
  const tailscaleHealthAlarm = new aws.cloudwatch.MetricAlarm(
    `${config.projectName}-tailscale-health-alarm`,
    {
      name: `${config.projectName}-tailscale-health`,
      metricName: 'StatusCheckFailed',
      namespace: 'AWS/EC2',
      statistic: 'Maximum',
      period: 60,
      evaluationPeriods: 2,
      threshold: 1,
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      dimensions: {
        InstanceId: tailscaleInstance.id,
      },
      tags: {
        ...commonTags,
        Name: `${config.projectName}-tailscale-health-alarm`,
        Type: 'cloudwatch-alarm',
      },
    },
  );

  return {
    instanceId: tailscaleInstance.id,
    instancePrivateIp: tailscaleInstance.privateIp,
    subnetRoutes: [network.vpcCidr],
    vpcCidr: network.vpcCidr,
    authSecretArn: tailscaleAuthSecret.arn,
    healthAlarmArn: tailscaleHealthAlarm.arn,
    databaseConnectionInfo: {
      databaseHost: database.endpoint,
      databasePort: database.port,
      steps: [
        '1. Connect to Tailscale network',
        '2. Access database via Tailscale subnet router',
        `3. Connect to ${database.endpoint}:${database.port}`,
        '4. Use database credentials from Secrets Manager',
      ],
    },
  };
}
