import * as aws from '@pulumi/aws';
import { CommonConfig } from '../types';

export function createGithubOidc(config: CommonConfig) {
  const { commonTags } = config;

  // GitHub OIDC Provider for GitHub Actions
  const githubOidcProvider = new aws.iam.OpenIdConnectProvider(
    `${config.projectName}-github-oidc-provider`,
    {
      url: 'https://token.actions.githubusercontent.com',
      clientIdLists: ['sts.amazonaws.com'],
      thumbprintLists: [
        '6938fd4d98bab03faadb97b34396831e3780aea1', // GitHub Actions OIDC thumbprint
        '1c58a3a8518e8759bf075b76b750d4f2df264fcd', // Backup thumbprint
      ],
      tags: {
        ...commonTags,
        Name: 'github-oidc-provider',
        Type: 'oidc-provider',
      },
    },
  );

  // Deployment Role for GitHub Actions (read-write access)
  const deploymentRole = new aws.iam.Role('github-deployment-role', {
    name: `${config.projectName}-github-deployment-role`,
    assumeRolePolicy: githubOidcProvider.arn.apply((providerArn) =>
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Federated: providerArn,
            },
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
              },
              StringLike: {
                'token.actions.githubusercontent.com:sub': `repo:${config.githubOrg}/${config.githubRepo}:*`,
              },
            },
          },
        ],
      }),
    ),
    tags: {
      ...commonTags,
      Name: 'github-deployment-role',
      Type: 'iam-role',
      Purpose: 'github-deployment',
    },
  });

  // Build Role for GitHub Actions (CodeBuild access)
  const buildRole = new aws.iam.Role('github-build-role', {
    name: `${config.projectName}-github-build-role`,
    assumeRolePolicy: githubOidcProvider.arn.apply((providerArn) =>
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Federated: providerArn,
            },
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
              },
              StringLike: {
                'token.actions.githubusercontent.com:sub': `repo:${config.githubOrg}/${config.githubRepo}:*`,
              },
            },
          },
        ],
      }),
    ),
    tags: {
      ...commonTags,
      Name: 'github-build-role',
      Type: 'iam-role',
      Purpose: 'github-build',
    },
  });

  // Read-only Role for GitHub Actions (status checks, etc.)
  const readOnlyRole = new aws.iam.Role('github-readonly-role', {
    name: `${config.projectName}-github-readonly-role`,
    assumeRolePolicy: githubOidcProvider.arn.apply((providerArn) =>
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Federated: providerArn,
            },
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
              },
              StringLike: {
                'token.actions.githubusercontent.com:sub': `repo:${config.githubOrg}/${config.githubRepo}:*`,
              },
            },
          },
        ],
      }),
    ),
    tags: {
      ...commonTags,
      Name: 'github-readonly-role',
      Type: 'iam-role',
      Purpose: 'github-readonly',
    },
  });

  // Deployment Role Policies
  const deploymentRolePolicy = new aws.iam.RolePolicy('github-deployment-policy', {
    role: deploymentRole.id,
    policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'ecs:UpdateService',
            'ecs:DescribeServices',
            'ecs:DescribeTasks',
            'ecs:DescribeTaskDefinition',
            'ecs:RegisterTaskDefinition',
          ],
          Resource: '*',
        },
        {
          Effect: 'Allow',
          Action: [
            'ecr:GetAuthorizationToken',
            'ecr:BatchCheckLayerAvailability',
            'ecr:GetDownloadUrlForLayer',
            'ecr:BatchGetImage',
            'ecr:PutImage',
            'ecr:InitiateLayerUpload',
            'ecr:UploadLayerPart',
            'ecr:CompleteLayerUpload',
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
  });

  // Build Role Policies
  const buildRolePolicy = new aws.iam.RolePolicy('github-build-policy', {
    role: buildRole.id,
    policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'codebuild:StartBuild',
            'codebuild:BatchGetBuilds',
            'codebuild:BatchGetProjects',
          ],
          Resource: '*',
        },
        {
          Effect: 'Allow',
          Action: ['logs:GetLogEvents', 'logs:DescribeLogGroups', 'logs:DescribeLogStreams'],
          Resource: '*',
        },
      ],
    }),
  });

  // Read-only Role Policies
  const readOnlyRolePolicy = new aws.iam.RolePolicy('github-readonly-policy', {
    role: readOnlyRole.id,
    policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'ecs:DescribeServices',
            'ecs:DescribeTasks',
            'ecs:DescribeTaskDefinition',
            'ecs:ListTasks',
            'ecs:ListServices',
          ],
          Resource: '*',
        },
        {
          Effect: 'Allow',
          Action: [
            'cloudwatch:GetMetricStatistics',
            'cloudwatch:DescribeAlarms',
            'cloudwatch:GetDashboard',
          ],
          Resource: '*',
        },
        {
          Effect: 'Allow',
          Action: ['logs:DescribeLogGroups', 'logs:DescribeLogStreams', 'logs:GetLogEvents'],
          Resource: '*',
        },
      ],
    }),
  });

  return {
    providerArn: githubOidcProvider.arn,
    providerUrl: githubOidcProvider.url,
    deploymentRoleArn: deploymentRole.arn,
    buildRoleArn: buildRole.arn,
    readOnlyRoleArn: readOnlyRole.arn,
  };
}
