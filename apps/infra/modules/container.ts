import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { CommonConfig, DatabaseOutputs, LoadBalancerOutputs, NetworkOutputs } from '../types';

export function createContainer(
  config: CommonConfig,
  network: NetworkOutputs,
  database: DatabaseOutputs,
  loadBalancer?: LoadBalancerOutputs,
  appSecrets?: { secretArn: pulumi.Output<string>; secretId: pulumi.Output<string> },
) {
  const { commonTags } = config;

  // ECR Repository for container images
  const repository = new aws.ecr.Repository(`${config.projectName}-repository`, {
    name: config.projectName,
    imageTagMutability: 'MUTABLE',
    imageScanningConfiguration: {
      scanOnPush: true,
    },
    encryptionConfigurations: [
      {
        encryptionType: 'AES256',
      },
    ],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-repository`,
      Type: 'ecr-repository',
    },
  });

  // ECR Lifecycle Policy
  const lifecyclePolicy = new aws.ecr.LifecyclePolicy(`${config.projectName}-lifecycle-policy`, {
    repository: repository.name,
    policy: JSON.stringify({
      rules: [
        {
          rulePriority: 1,
          description: 'Keep last 10 production images',
          selection: {
            tagStatus: 'tagged',
            tagPrefixList: ['prod'],
            countType: 'imageCountMoreThan',
            countNumber: 10,
          },
          action: {
            type: 'expire',
          },
        },
        {
          rulePriority: 2,
          description: 'Keep last 5 development images',
          selection: {
            tagStatus: 'tagged',
            tagPrefixList: ['dev'],
            countType: 'imageCountMoreThan',
            countNumber: 5,
          },
          action: {
            type: 'expire',
          },
        },
        {
          rulePriority: 3,
          description: 'Delete untagged images older than 1 day',
          selection: {
            tagStatus: 'untagged',
            countType: 'sinceImagePushed',
            countUnit: 'days',
            countNumber: 1,
          },
          action: {
            type: 'expire',
          },
        },
      ],
    }),
  });

  // ECS Cluster
  const cluster = new aws.ecs.Cluster(`${config.projectName}-cluster`, {
    name: config.projectName,
    settings: [
      {
        name: 'containerInsights',
        value: 'enabled',
      },
    ],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-cluster`,
      Type: 'ecs-cluster',
    },
  });

  // CloudWatch Log Group for application logs
  const logGroup = new aws.cloudwatch.LogGroup(`${config.projectName}-app-logs`, {
    name: `/aws/ecs/${config.projectName}`,
    retentionInDays: config.logRetentionDays,
    tags: {
      ...commonTags,
      Name: `${config.projectName}-app-logs`,
      Type: 'log-group',
    },
  });

  // ECS Task Execution Role
  const taskExecutionRole = new aws.iam.Role(`${config.projectName}-task-execution-role`, {
    name: `${config.projectName}-ecs-task-execution-role`,
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'ecs-tasks.amazonaws.com',
          },
        },
      ],
    }),
    tags: {
      ...commonTags,
      Name: `${config.projectName}-task-execution-role`,
      Type: 'iam-role',
    },
  });

  // Attach the ECS task execution role policy
  const taskExecutionRolePolicyAttachment = new aws.iam.RolePolicyAttachment(
    `${config.projectName}-task-execution-role-policy`,
    {
      role: taskExecutionRole.name,
      policyArn: 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
    },
  );

  // Add policy for Secrets Manager access to task execution role
  const taskExecutionSecretsPolicy = new aws.iam.RolePolicy(
    `${config.projectName}-task-execution-secrets-policy`,
    {
      role: taskExecutionRole.id,
      policy: pulumi
        .all([database.secretArn, appSecrets?.secretArn])
        .apply(([dbSecretArn, appSecretArn]) =>
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
                Resource: [dbSecretArn, ...(appSecretArn ? [appSecretArn] : [])],
              },
            ],
          }),
        ),
    },
  );

  // ECS Task Role for application permissions
  const taskRole = new aws.iam.Role(`${config.projectName}-task-role`, {
    name: `${config.projectName}-ecs-task-role`,
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'ecs-tasks.amazonaws.com',
          },
        },
      ],
    }),
    tags: {
      ...commonTags,
      Name: `${config.projectName}-task-role`,
      Type: 'iam-role',
    },
  });

  // Task Role Policy for application access
  const taskRolePolicy = new aws.iam.RolePolicy(`${config.projectName}-task-role-policy`, {
    role: taskRole.id,
    policy: logGroup.arn.apply((logGroupArn) =>
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
            Resource: '*',
          },
          {
            Effect: 'Allow',
            Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
            Resource: logGroupArn,
          },
        ],
      }),
    ),
  });

  // ECS Task Definition
  const taskDefinition = new aws.ecs.TaskDefinition(`${config.projectName}-task`, {
    family: config.projectName,
    networkMode: 'awsvpc',
    requiresCompatibilities: ['FARGATE'],
    cpu: '1024',
    memory: '2048',
    executionRoleArn: taskExecutionRole.arn,
    taskRoleArn: taskRole.arn,
    containerDefinitions: pulumi
      .all([
        repository.repositoryUrl,
        logGroup.name,
        database.secretArn,
        appSecrets?.secretArn || pulumi.output(''),
      ])
      .apply(
        ([repoUrl, logGroupName, dbSecretArn, appSecretArn]: [string, string, string, string]) => {
          const secrets = [
            {
              name: 'DATABASE_URL',
              valueFrom: `${dbSecretArn}:connectionString::`,
            },
          ];

          if (appSecrets && appSecretArn) {
            secrets.push(
              {
                name: 'AUTH_SECRET',
                valueFrom: `${appSecretArn}:AUTH_SECRET::`,
              },
              {
                name: 'RESEND_API_KEY',
                valueFrom: `${appSecretArn}:RESEND_API_KEY::`,
              },
              {
                name: 'REVALIDATION_SECRET',
                valueFrom: `${appSecretArn}:REVALIDATION_SECRET::`,
              },
            );
          }

          return JSON.stringify([
            {
              name: `${config.projectName}-app`,
              image: `${repoUrl}:latest`,
              essential: true,
              portMappings: [
                {
                  containerPort: 3000,
                  protocol: 'tcp',
                },
              ],
              environment: [
                {
                  name: 'NODE_ENV',
                  value: 'production',
                },
                {
                  name: 'PORT',
                  value: '3000',
                },
              ],
              secrets,
              logConfiguration: {
                logDriver: 'awslogs',
                options: {
                  'awslogs-group': logGroupName,
                  'awslogs-region': config.awsRegion,
                  'awslogs-stream-prefix': 'ecs',
                },
              },
              healthCheck: {
                command: ['CMD-SHELL', 'curl -f http://localhost:3000/api/health || exit 1'],
                interval: 30,
                timeout: 10,
                retries: 5,
                startPeriod: 120,
              },
            },
          ]);
        },
      ),
    tags: {
      ...commonTags,
      Name: `${config.projectName}-task`,
      Type: 'ecs-task-definition',
    },
  });

  // ECS Service
  const service = new aws.ecs.Service(`${config.projectName}-service`, {
    name: config.projectName,
    cluster: cluster.id,
    taskDefinition: taskDefinition.arn,
    desiredCount: 2,
    launchType: 'FARGATE',
    platformVersion: 'LATEST',
    networkConfiguration: {
      subnets: network.privateSubnetIds,
      securityGroups: [network.securityGroups.ecs],
      assignPublicIp: false,
    },
    enableExecuteCommand: true,
    // Attach to load balancer if provided
    loadBalancers: loadBalancer
      ? [
          {
            targetGroupArn: loadBalancer.targetGroupArn,
            containerName: `${config.projectName}-app`,
            containerPort: 3000,
          },
        ]
      : undefined,
    tags: {
      ...commonTags,
      Name: `${config.projectName}-service`,
      Type: 'ecs-service',
    },
  });

  return {
    clusterName: cluster.name,
    clusterArn: cluster.arn,
    serviceName: service.name,
    repositoryUrl: repository.repositoryUrl,
    repositoryArn: repository.arn,
    taskDefinitionArn: taskDefinition.arn,
    logGroupName: logGroup.name,
    logGroupArn: logGroup.arn,
    taskExecutionRoleArn: taskExecutionRole.arn,
    taskRoleArn: taskRole.arn,
  };
}
