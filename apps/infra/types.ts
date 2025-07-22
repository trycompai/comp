import * as pulumi from '@pulumi/pulumi';

// ==========================================
// COMMON CONFIGURATION TYPES
// ==========================================

export interface ResourceTags {
  [key: string]: string | undefined;
}

export interface CommonConfig {
  projectName: string;
  enableRDSReadReplicas: boolean;
  region: string;
  awsRegion: string;
  nodeEnv: string;
  enableDebugEndpoints: boolean;
  githubOrg: string;
  githubRepo: string;
  githubBranch: string;
  commonTags: ResourceTags;
  networkConfig: NetworkConfig;
  securityConfig: SecurityConfig;
  dbInstanceClass: string;
  dbAllocatedStorage: number;
  dbMaxAllocatedStorage: number;
  dbBackupRetentionPeriod: number;
  dbDeletionProtection: boolean;
  dbName: string;
  dbUsername: string;
  logRetentionDays: number;
  // Optional feature configurations
  tailscale?: {
    apiKey: pulumi.Output<string>;
    tailnet: string;
    authKey: pulumi.Output<string>;
  };
  betterStack?: {
    entrypoint: pulumi.Output<string>;
    sourceToken: pulumi.Output<string>;
  };
}

export interface FeatureFlags {
  enableCodeBuild: boolean;
  enableTailscale: boolean;
  enableBetterStack: boolean;
  enableDetailedMonitoring: boolean;
  enableAutoScaling: boolean;
  enableBackups: boolean;
  enableSSL: boolean;
}

export interface EnvironmentConfig {
  dbInstanceClass: string;
  dbAllocatedStorage: number;
  dbMaxAllocatedStorage: number;
  dbBackupRetentionPeriod: number;
  dbDeletionProtection: boolean;
  ecsCpu: number;
  ecsMemory: number;
  ecsDesiredCount: number;
  ecsMinCapacity: number;
  ecsMaxCapacity: number;
  logRetentionDays: number;
  codeBuildInstanceType: string;
  codeBuildTimeout: number;
}

export interface NetworkConfig {
  vpcCidr: string;
  subnets: {
    public: Array<{ cidr: string; az: number }>;
    private: Array<{ cidr: string; az: number }>;
  };
}

export interface SecurityConfig {
  allowedCidrBlocks: string[];
  sslCertificateArn?: string;
  enableWaf: boolean;
}

// ==========================================
// INFRASTRUCTURE OUTPUT TYPES
// ==========================================

export interface NetworkOutputs {
  vpcId: pulumi.Output<string>;
  vpcCidr: pulumi.Output<string>;
  internetGatewayId: pulumi.Output<string>;
  natGatewayId: pulumi.Output<string>;
  publicSubnetIds: pulumi.Output<string>[];
  privateSubnetIds: pulumi.Output<string>[];
  availabilityZones: pulumi.Output<string[]>;
  securityGroups: {
    alb: pulumi.Output<string>;
    ecs: pulumi.Output<string>;
    database: pulumi.Output<string>;
    codeBuild: pulumi.Output<string>;
    tailscale: pulumi.Output<string>;
  };
  routeTableIds: {
    public: pulumi.Output<string>;
    private: pulumi.Output<string>;
  };
  vpcEndpoints: {
    s3: pulumi.Output<string>;
    ecrApi: pulumi.Output<string>;
    ecrDkr: pulumi.Output<string>;
    codebuild: pulumi.Output<string>;
    logs: pulumi.Output<string>;
  };
}

export interface DatabaseOutputs {
  instanceId: pulumi.Output<string>;
  endpoint: pulumi.Output<string>;
  port: pulumi.Output<number>;
  dbName: pulumi.Output<string>;
  username: pulumi.Output<string>;
  password: pulumi.Output<string>;
  secretArn: pulumi.Output<string>;
  secretId: pulumi.Output<string>;
  connectionString: pulumi.Output<string>;
  readReplicaEndpoint?: pulumi.Output<string>;
}

export interface ContainerOutputs {
  clusterName: pulumi.Output<string>;
  clusterArn: pulumi.Output<string>;
  serviceName: pulumi.Output<string>;
  repositoryUrl: pulumi.Output<string>;
  repositoryArn: pulumi.Output<string>;
  taskDefinitionArn: pulumi.Output<string>;
  logGroupName: pulumi.Output<string>;
  logGroupArn: pulumi.Output<string>;
  taskExecutionRoleArn: pulumi.Output<string>;
  taskRoleArn: pulumi.Output<string>;
}

export interface LoadBalancerOutputs {
  albArn: pulumi.Output<string>;
  albDnsName: pulumi.Output<string>;
  albZoneId: pulumi.Output<string>;
  targetGroupArn: pulumi.Output<string>;
  applicationUrl: pulumi.Output<string>;
  healthCheckUrl: pulumi.Output<string>;
  certificateArn?: string;
}

export interface GithubOidcOutputs {
  providerArn: pulumi.Output<string>;
  providerUrl: pulumi.Output<string>;
  deploymentRoleArn: pulumi.Output<string>;
  buildRoleArn: pulumi.Output<string>;
  readOnlyRoleArn: pulumi.Output<string>;
}

export interface BuildSystemOutputs {
  appProjectName: pulumi.Output<string>;
  appProjectArn: pulumi.Output<string>;
  codebuildRoleArn: pulumi.Output<string>;
  buildInstanceType: string;
  buildTimeout: number;
  createApplicationDeployment: (
    app: ApplicationConfig,
    database: DatabaseOutputs,
    container: ContainerOutputs,
  ) => ApplicationDeployment;
}

export interface ApplicationDeployment {
  appName: string;
  contextPath: string;
  buildCommands: {
    deployWithMigrations: string;
  };
  containerImage: pulumi.Output<string>;
  healthCheckPath: string;
  resourceRequirements: { cpu: number; memory: number };
  scaling: {
    minInstances: number;
    maxInstances: number;
    targetCpuPercent: number;
  };
  buildProject: pulumi.Output<string>;
}

export interface TailscaleOutputs {
  instanceId: pulumi.Output<string>;
  instancePrivateIp: pulumi.Output<string>;
  subnetRoutes: pulumi.Output<string[]>;
  vpcCidr: pulumi.Output<string>;
  authSecretArn: pulumi.Output<string>;
  healthAlarmArn: pulumi.Output<string>;
  databaseConnectionInfo: {
    databaseHost: pulumi.Output<string>;
    databasePort: pulumi.Output<number>;
    steps: string[];
  };
}

export interface MonitoringOutputs {
  applicationDashboardUrl: pulumi.Output<string>;
  infrastructureDashboardUrl: pulumi.Output<string>;
  applicationLogGroup: pulumi.Output<string>;
  logsUrl: pulumi.Output<string>;
  metricsNamespace: string;
  customMetricsFunctionArn: pulumi.Output<string>;
  metricsUrl: pulumi.Output<string>;
  highErrorRateAlarmArn: pulumi.Output<string>;
  databaseConnectionAlarmArn: pulumi.Output<string>;
  alarmsUrl: pulumi.Output<string>;
  logForwarderFunctionArn?: pulumi.Output<string>;
  betterStackSecretArn?: pulumi.Output<string>;
}

export interface ScalingOutputs {
  minCapacity: pulumi.Output<number>;
  maxCapacity: pulumi.Output<number>;
  cpuScaleUpThreshold: number;
  cpuScaleDownThreshold: number;
  memoryScaleUpThreshold: number;
}

// ==========================================
// APPLICATION CONFIGURATION TYPES
// ==========================================

export interface ApplicationConfig {
  name: string;
  contextPath: string;
  requiresDatabaseAccess: boolean;
  dependsOnMigrations: boolean;
  buildCommand?: string;
  healthCheckPath: string;
  environmentVariables: Record<string, string>;
  resourceRequirements: {
    cpu: number;
    memory: number;
  };
  scaling: {
    minInstances: number;
    maxInstances: number;
    targetCpuPercent: number;
  };
}

// Duplicate ResourceTags interface removed - using the one at the top of the file

// ==========================================
// BUILD SYSTEM TYPES
// ==========================================

export interface BuildSpecConfig {
  version: string;
  env: {
    variables: Record<string, string>;
    'parameter-store'?: Record<string, string>;
    'secrets-manager'?: Record<string, string>;
  };
  phases: {
    pre_build?: {
      commands: string[];
    };
    build: {
      commands: string[];
    };
    post_build?: {
      commands: string[];
    };
  };
  cache?: {
    paths: string[];
  };
  artifacts?: {
    files: string[];
    name?: string;
  };
}

// ==========================================
// MONITORING AND ALERTING TYPES
// ==========================================

export interface MetricConfig {
  name: string;
  namespace: string;
  dimensions: Record<string, string>;
  statistic: 'Average' | 'Sum' | 'Maximum' | 'Minimum';
  period: number;
  evaluationPeriods: number;
  threshold: number;
  comparisonOperator:
    | 'GreaterThanThreshold'
    | 'LessThanThreshold'
    | 'GreaterThanOrEqualToThreshold'
    | 'LessThanOrEqualToThreshold';
}

export interface AlarmConfig extends MetricConfig {
  alarmDescription: string;
  treatMissingData: 'breaching' | 'notBreaching' | 'ignore' | 'missing';
  actions?: pulumi.Output<string>[];
}

// ==========================================
// SECURITY AND ACCESS TYPES
// ==========================================

export interface SecurityGroupRule {
  type: 'ingress' | 'egress';
  fromPort: number;
  toPort: number;
  protocol: string;
  cidrBlocks?: string[];
  securityGroups?: pulumi.Output<string>[];
  description: string;
}

export interface IAMPolicyDocument {
  Version: string;
  Statement: IAMPolicyStatement[];
}

export interface IAMPolicyStatement {
  Effect: 'Allow' | 'Deny';
  Action: string | string[];
  Resource?: string | string[];
  Principal?: {
    Service?: string | string[];
    AWS?: string | string[];
    Federated?: string | string[];
  };
  Condition?: Record<string, Record<string, string | string[]>>;
}
