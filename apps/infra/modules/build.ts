import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import {
  ApplicationConfig,
  CommonConfig,
  ContainerOutputs,
  DatabaseOutputs,
  NetworkOutputs,
} from '../types';

export function createBuildSystem(
  config: CommonConfig,
  network: NetworkOutputs,
  database: DatabaseOutputs,
  container: ContainerOutputs,
  appSecrets?: Record<
    string,
    { secretArn: pulumi.Output<string>; secretId: pulumi.Output<string> }
  >,
) {
  const { commonTags } = config;

  // IAM Service Role for CodeBuild
  const codebuildRole = new aws.iam.Role(`${config.projectName}-codebuild-role`, {
    name: `${config.projectName}-codebuild-role`,
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'codebuild.amazonaws.com',
          },
        },
      ],
    }),
    tags: {
      ...commonTags,
      Name: `${config.projectName}-codebuild-role`,
      Type: 'iam-role',
    },
  });

  // CodeBuild policy for basic operations
  const codebuildPolicy = new aws.iam.RolePolicy(`${config.projectName}-codebuild-policy`, {
    role: codebuildRole.id,
    policy: pulumi
      .all([database.secretArn, appSecrets?.secretArn])
      .apply(([dbSecretArn, appSecretArn]) =>
        JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              Resource: 'arn:aws:logs:*:*:*',
            },
            {
              Effect: 'Allow',
              Action: [
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
                'ecr:GetAuthorizationToken',
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
                'ec2:CreateNetworkInterface',
                'ec2:DescribeDhcpOptions',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
                'ec2:DescribeSubnets',
                'ec2:DescribeSecurityGroups',
                'ec2:DescribeVpcs',
              ],
              Resource: '*',
            },
            {
              Effect: 'Allow',
              Action: ['ec2:CreateNetworkInterfacePermission'],
              Resource: '*',
            },
            {
              Effect: 'Allow',
              Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
              Resource: [dbSecretArn, ...(appSecretArn ? [appSecretArn] : [])],
            },
          ],
        }),
      ),
  });

  // Additional IAM permissions for ECS deployment
  const ecsDeployPolicy = new aws.iam.RolePolicy(`${config.projectName}-ecs-deploy-policy`, {
    role: codebuildRole.id,
    policy: pulumi
      .all([container.taskExecutionRoleArn, container.taskRoleArn])
      .apply(([taskExecRoleArn, taskRoleArn]: [string, string]) =>
        JSON.stringify({
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
              Action: ['iam:PassRole'],
              Resource: [taskExecRoleArn, taskRoleArn],
            },
          ],
        }),
      ),
  });

  // Application deployment function
  function createApplicationDeployment(
    app: {
      name: string;
      contextPath: string;
      requiresDatabaseAccess: boolean;
      dependsOnMigrations: boolean;
      buildCommand: string;
      healthCheckPath: string;
      environmentVariables: Record<string, string>;
      resourceRequirements: { cpu: number; memory: number };
      scaling: {
        minInstances: number;
        maxInstances: number;
        targetCpuPercent: number;
      };
    },
    database: DatabaseOutputs,
    container: ContainerOutputs,
    appContainer: {
      serviceName: pulumi.Output<string>;
      repositoryUrl: pulumi.Output<string>;
      repositoryArn: pulumi.Output<string>;
      taskDefinitionArn: pulumi.Output<string>;
      logGroupName: pulumi.Output<string>;
      logGroupArn: pulumi.Output<string>;
      targetGroupArn?: pulumi.Output<string>;
    },
  ) {
    // Return deployment configuration for the application
    return {
      appName: app.name,
      contextPath: app.contextPath,
      // Single build command that does everything (migrations + app)
      buildCommands: {
        // Single step: Run the complete build (migrations + app + deploy)
        deployWithMigrations: `aws codebuild start-build --project-name ${config.projectName}-${app.name}-build`,
      },
      // Docker image reference
      containerImage: pulumi.interpolate`${appContainer.repositoryUrl}:${app.name}-latest`,
      healthCheckPath: app.healthCheckPath,
      resourceRequirements: app.resourceRequirements,
      scaling: app.scaling,
      // Build project reference
      buildProject: `${config.projectName}-${app.name}-build`,
    };
  }

  // Create per-app build project function
  function createApplicationBuildProject(
    app: ApplicationConfig,
    appContainer: {
      repositoryUrl: pulumi.Output<string>;
      serviceName: pulumi.Output<string>;
      targetGroupArn?: pulumi.Output<string>;
    },
  ) {
    // Default buildspec path is at the app's root directory
    const buildspecPath = `apps/${app.name}/buildspec.yml`;

    return new aws.codebuild.Project(`${config.projectName}-${app.name}-build`, {
      name: `${config.projectName}-${app.name}-build`,
      description: `Build ${app.name} Docker image`,
      serviceRole: codebuildRole.arn,
      artifacts: {
        type: 'NO_ARTIFACTS',
      },
      environment: {
        computeType: 'BUILD_GENERAL1_LARGE',
        image: 'aws/codebuild/standard:7.0',
        type: 'LINUX_CONTAINER',
        privilegedMode: true,
        environmentVariables: [
          {
            name: 'AWS_ACCOUNT_ID',
            value: aws.getCallerIdentityOutput().accountId,
            type: 'PLAINTEXT',
          },
          {
            name: 'APP_NAME',
            value: app.name,
            type: 'PLAINTEXT',
          },
          {
            name: 'DOCKERFILE_PATH',
            value: './Dockerfile',
            type: 'PLAINTEXT',
          },
          {
            name: 'ECR_REPOSITORY_URI',
            value: appContainer.repositoryUrl,
            type: 'PLAINTEXT',
          },
          {
            name: 'ECS_CLUSTER_NAME',
            value: container.clusterName,
            type: 'PLAINTEXT',
          },
          {
            name: 'ECS_SERVICE_NAME',
            value: appContainer.serviceName,
            type: 'PLAINTEXT',
          },
          {
            name: 'AWS_DEFAULT_REGION',
            value: config.awsRegion,
            type: 'PLAINTEXT',
          },
          // Only add DATABASE_URL if app needs it
          ...(app.includeDatabaseUrl
            ? [
                {
                  name: 'DATABASE_URL',
                  value: pulumi.interpolate`${database.secretArn}:connectionString`,
                  type: 'SECRETS_MANAGER' as const,
                },
              ]
            : []),
          // Add custom environment variables from app config
          ...Object.entries(app.environmentVariables || {}).map(([key, value]) => ({
            name: key,
            value,
            type: 'PLAINTEXT' as const,
          })),
        ],
      },
      vpcConfig: app.includeDatabaseUrl
        ? {
            vpcId: network.vpcId,
            subnets: network.privateSubnetIds,
            securityGroupIds: [network.securityGroups.codeBuild],
          }
        : undefined,
      source: {
        type: 'GITHUB',
        location: `https://github.com/${config.githubOrg}/${config.githubRepo}.git`,
        buildspec: buildspecPath,
        gitCloneDepth: 1,
      },
      sourceVersion: config.githubBranch,
      tags: {
        ...commonTags,
        Name: `${config.projectName}-${app.name}-build`,
        Type: 'codebuild-project',
        App: app.name,
      },
    });
  }

  // Create Database Migration Project
  function createMigrationProject() {
    const migrationProject = new aws.codebuild.Project(`${config.projectName}-migrations`, {
      name: `${config.projectName}-migrations`,
      description: 'Run database migrations before application deployments',
      serviceRole: codebuildRole.arn,
      artifacts: {
        type: 'NO_ARTIFACTS',
      },
      source: {
        type: 'GITHUB',
        location: `https://github.com/${config.githubOrg}/${config.githubRepo}.git`,
        buildspec: 'apps/infra/buildspec-migrations.yml',
        gitCloneDepth: 1,
        gitSubmodulesConfig: {
          fetchSubmodules: false,
        },
      },
      cache: {
        type: 'LOCAL',
        modes: ['LOCAL_DOCKER_LAYER_CACHE', 'LOCAL_SOURCE_CACHE'],
      },
      environment: {
        type: 'LINUX_CONTAINER',
        image: 'aws/codebuild/standard:7.0',
        computeType: 'BUILD_GENERAL1_MEDIUM',
        privilegedMode: true,
        environmentVariables: [
          {
            name: 'PROJECT_NAME',
            value: config.projectName,
            type: 'PLAINTEXT',
          },
          {
            name: 'DATABASE_URL',
            value: pulumi.interpolate`${database.secretArn}:connectionString`,
            type: 'SECRETS_MANAGER' as const,
          },
        ],
      },
      vpcConfig: {
        vpcId: network.vpcId,
        subnets: [network.privateSubnetIds[0], network.privateSubnetIds[1]],
        securityGroupIds: [network.securityGroups.codeBuild],
      },
      logsConfig: {
        cloudwatchLogs: {
          status: 'ENABLED',
          groupName: `/aws/codebuild/${config.projectName}-migrations`,
        },
      },
      buildBatchConfig: {
        serviceRole: codebuildRole.arn,
        timeoutInMins: 10,
      },
      tags: {
        ...commonTags,
        Name: `${config.projectName}-migrations`,
        Type: 'codebuild-project',
        Purpose: 'database-migrations',
      },
    });

    return migrationProject;
  }

  const migrationProject = createMigrationProject();

  return {
    codebuildRole,
    codebuildRoleArn: codebuildRole.arn,
    buildInstanceType: 'BUILD_GENERAL1_2XLARGE',
    buildTimeout: 20,
    createApplicationDeployment,
    createApplicationBuildProject,
    migrationProject,
  };
}
