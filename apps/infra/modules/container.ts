import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import {
  ApplicationConfig,
  CommonConfig,
  DatabaseOutputs,
  LoadBalancerOutputs,
  NetworkOutputs,
} from '../types';

// Function to create container resources for a single application
export function createApplicationContainer(
  config: CommonConfig,
  app: ApplicationConfig,
  network: NetworkOutputs,
  database: DatabaseOutputs,
  sharedResources: {
    cluster: aws.ecs.Cluster;
    taskExecutionRole: aws.iam.Role;
    taskRole: aws.iam.Role;
  },
  loadBalancer?: LoadBalancerOutputs,
  appSecrets?: Record<string, { arn: pulumi.Output<string>; name: pulumi.Output<string> }>,
) {
  const { commonTags } = config;
  const appName = `${config.projectName}-${app.name}`;

  // App-specific ECR Repository
  const repository = new aws.ecr.Repository(`${appName}-repository`, {
    name: appName.toLowerCase(), // ECR names must be lowercase
    imageTagMutability: 'MUTABLE',
    forceDelete: true, // Allow deletion even when images exist
    encryptionConfigurations: [
      {
        encryptionType: 'AES256',
      },
    ],
    imageScanningConfiguration: {
      scanOnPush: true,
    },
    tags: {
      ...commonTags,
      Name: `${appName}-repository`,
      Type: 'ecr-repository',
      App: app.name,
    },
  });

  // ECR Lifecycle Policy to manage image retention
  const lifecyclePolicy = new aws.ecr.LifecyclePolicy(`${appName}-lifecycle-policy`, {
    repository: repository.name,
    policy: JSON.stringify({
      rules: [
        {
          rulePriority: 1,
          description: 'Keep last 10 images',
          selection: {
            tagStatus: 'any',
            countType: 'imageCountMoreThan',
            countNumber: 10,
          },
          action: {
            type: 'expire',
          },
        },
      ],
    }),
  });

  // App-specific CloudWatch Log Group
  const logGroup = new aws.cloudwatch.LogGroup(`${appName}-logs`, {
    name: `/ecs/${appName}`,
    retentionInDays: 30,
    tags: {
      ...commonTags,
      Name: `${appName}-logs`,
      Type: 'cloudwatch-logs',
      App: app.name,
    },
  });

  // App-specific Target Group (if routing is configured)
  let targetGroup: aws.lb.TargetGroup | undefined;
  if (app.routing && loadBalancer) {
    targetGroup = new aws.lb.TargetGroup(`${appName}-tg`, {
      name: `${appName}-tg`.substring(0, 32), // AWS limit
      port: app.containerPort,
      protocol: 'HTTP',
      targetType: 'ip',
      vpcId: network.vpcId,
      healthCheck: {
        enabled: true,
        path: app.healthCheck?.path || '/health',
        interval: app.healthCheck?.interval || 60,
        timeout: app.healthCheck?.timeout || 30,
        healthyThreshold: app.healthCheck?.healthyThreshold || 2,
        unhealthyThreshold: app.healthCheck?.unhealthyThreshold || 3,
        matcher: '200',
      },
      tags: {
        ...commonTags,
        Name: `${appName}-tg`,
        Type: 'target-group',
        App: app.name,
      },
    });
  }

  // App-specific Task Definition
  const taskDefinition = new aws.ecs.TaskDefinition(`${appName}-task`, {
    family: appName,
    networkMode: 'awsvpc',
    requiresCompatibilities: ['FARGATE'],
    cpu: (app.cpu || 256).toString(),
    memory: (app.memory || 512).toString(),
    executionRoleArn: sharedResources.taskExecutionRole.arn,
    taskRoleArn: sharedResources.taskRole.arn,
    containerDefinitions: pulumi
      .all([
        repository.repositoryUrl,
        logGroup.name,
        database.secretArn,
        // Resolve all secret ARNs
        ...(appSecrets && app.requiredSecrets
          ? app.requiredSecrets
              .filter((secretName) => appSecrets[secretName])
              .map((secretName) => appSecrets[secretName].arn)
          : []),
      ])
      .apply((values) => {
        const [repoUrl, logGroupName, dbSecretArn, ...appSecretArns] = values;
        const secrets = [];

        // Add database secret if needed
        if (app.includeDatabaseUrl) {
          secrets.push({
            name: 'DATABASE_URL',
            valueFrom: `${dbSecretArn}:connectionString::`,
          });
        }

        // Add app-specific secrets if provided
        if (appSecrets && app.requiredSecrets) {
          let secretIndex = 0;
          app.requiredSecrets.forEach((secretName) => {
            if (appSecrets[secretName]) {
              secrets.push({
                name: secretName,
                valueFrom: appSecretArns[secretIndex],
              });
              secretIndex++;
            }
          });
        }

        return JSON.stringify([
          {
            name: `${app.name}-container`,
            image: `${repoUrl}:latest`,
            essential: true,
            portMappings: [
              {
                containerPort: app.containerPort,
                protocol: 'tcp',
              },
            ],
            environment: Object.entries(app.environmentVariables || {}).map(([key, value]) => ({
              name: key,
              value: value,
            })),
            secrets,
            logConfiguration: {
              logDriver: 'awslogs',
              options: {
                'awslogs-group': logGroupName,
                'awslogs-region': config.awsRegion,
                'awslogs-stream-prefix': 'ecs',
              },
            },
          },
        ]);
      }),
    tags: {
      ...commonTags,
      Name: `${appName}-task`,
      Type: 'ecs-task-definition',
      App: app.name,
    },
  });

  // App-specific ECS Service
  const service = new aws.ecs.Service(`${appName}-service`, {
    name: appName,
    cluster: sharedResources.cluster.id,
    taskDefinition: taskDefinition.arn,
    desiredCount: app.desiredCount || app.minCount || 1,
    launchType: 'FARGATE',
    platformVersion: 'LATEST',
    networkConfiguration: {
      subnets: network.privateSubnetIds,
      securityGroups: [network.securityGroups.ecs],
      assignPublicIp: false,
    },
    enableExecuteCommand: true,
    loadBalancers: targetGroup
      ? [
          {
            targetGroupArn: targetGroup.arn,
            containerName: `${app.name}-container`,
            containerPort: app.containerPort,
          },
        ]
      : undefined,
    tags: {
      ...commonTags,
      Name: `${appName}-service`,
      Type: 'ecs-service',
      App: app.name,
    },
  });

  return {
    serviceName: service.name,
    serviceArn: service.id,
    service: service, // Return the actual service resource for dependencies
    repositoryUrl: repository.repositoryUrl,
    repositoryArn: repository.arn,
    taskDefinitionArn: taskDefinition.arn,
    logGroupName: logGroup.name,
    logGroupArn: logGroup.arn,
    targetGroupArn: targetGroup?.arn,
  };
}

// Main container function that creates shared resources and calls createApplicationContainer for each app
export function createContainer(
  config: CommonConfig,
  applications: ApplicationConfig[],
  network: NetworkOutputs,
  database: DatabaseOutputs,
  loadBalancer?: LoadBalancerOutputs,
  appSecrets?: Record<
    string,
    Record<string, { arn: pulumi.Output<string>; name: pulumi.Output<string> }>
  >,
) {
  const { commonTags } = config;

  // Create shared ECS Cluster
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

  // Create shared IAM roles that all apps can use
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

  // Collect all secret ARNs from all applications
  const allAppSecretArns = appSecrets
    ? Object.values(appSecrets).flatMap((appSecretMap) =>
        Object.values(appSecretMap).map((secret) => secret.arn),
      )
    : [];

  // Add policy for Secrets Manager access to task execution role
  const taskExecutionSecretsPolicy = new aws.iam.RolePolicy(
    `${config.projectName}-task-execution-secrets-policy`,
    {
      role: taskExecutionRole.id,
      policy: pulumi
        .all([database.secretArn, ...allAppSecretArns])
        .apply(([dbSecretArn, ...secretArns]) =>
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
                Resource: [dbSecretArn, ...secretArns],
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
    policy: JSON.stringify({
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
          Resource: '*',
        },
      ],
    }),
  });

  // Create application-specific resources
  const appContainers = applications.map((app) =>
    createApplicationContainer(
      config,
      app,
      network,
      database,
      { cluster, taskExecutionRole, taskRole },
      loadBalancer,
      appSecrets?.[app.name],
    ),
  );

  // Return shared resources and app-specific resources
  return {
    clusterName: cluster.name,
    clusterArn: cluster.arn,
    taskExecutionRoleArn: taskExecutionRole.arn,
    taskRoleArn: taskRole.arn,
    applications: appContainers,
  };
}
