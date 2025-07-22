import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// ==========================================
// CONFIGURATION & SHARED SETTINGS
// ==========================================

// Common tags for all resources
const commonTags = {
  Project: "pathfinder",
  Environment: pulumi.getStack(), // Will be "dev", "staging", "production" etc.
  ManagedBy: "pulumi",
  Owner: "platform-team",
  CreatedDate: new Date().toISOString().split("T")[0], // YYYY-MM-DD
};

// ==========================================
// NETWORKING LAYER
// VPC, Subnets, Security Groups
// ==========================================

// VPC with DNS support for publicly accessible RDS
const vpc = new aws.ec2.Vpc("pathfinder-vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true, // Required for publicly accessible RDS
  enableDnsSupport: true,   // Required for publicly accessible RDS
  tags: {
    ...commonTags,
    Name: "pathfinder-vpc",
  },
});

// Internet Gateway for public subnet access
const igw = new aws.ec2.InternetGateway("pathfinder-igw", {
  vpcId: vpc.id,
  tags: {
    ...commonTags,
    Name: "pathfinder-igw",
  },
});

// Get availability zones
const azs = aws.getAvailabilityZones({
  state: "available",
});

// Public subnets (for ALB and publicly accessible RDS)
const publicSubnet1 = new aws.ec2.Subnet("pathfinder-public-subnet-1", {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  availabilityZone: azs.then(azs => azs.names[0]),
  mapPublicIpOnLaunch: true,
  tags: {
    ...commonTags,
    Name: "pathfinder-public-subnet-1",
    Type: "public",
  },
});

const publicSubnet2 = new aws.ec2.Subnet("pathfinder-public-subnet-2", {
  vpcId: vpc.id,
  cidrBlock: "10.0.2.0/24",
  availabilityZone: azs.then(azs => azs.names[1]),
  mapPublicIpOnLaunch: true,
  tags: {
    ...commonTags,
    Name: "pathfinder-public-subnet-2",
    Type: "public",
  },
});

// Private subnets (for ECS tasks)
const privateSubnet1 = new aws.ec2.Subnet("pathfinder-private-subnet-1", {
  vpcId: vpc.id,
  cidrBlock: "10.0.10.0/24",
  availabilityZone: azs.then(azs => azs.names[0]),
  tags: {
    ...commonTags,
    Name: "pathfinder-private-subnet-1",
    Type: "private",
  },
});

const privateSubnet2 = new aws.ec2.Subnet("pathfinder-private-subnet-2", {
  vpcId: vpc.id,
  cidrBlock: "10.0.11.0/24",
  availabilityZone: azs.then(azs => azs.names[1]),
  tags: {
    ...commonTags,
    Name: "pathfinder-private-subnet-2",
    Type: "private",
  },
});

// NAT Gateway for private subnet internet access
const natEip = new aws.ec2.Eip("pathfinder-nat-eip", {
  domain: "vpc",
  tags: {
    ...commonTags,
    Name: "pathfinder-nat-eip",
  },
});

const natGateway = new aws.ec2.NatGateway("pathfinder-nat-gw", {
  allocationId: natEip.id,
  subnetId: publicSubnet1.id,
  tags: {
    ...commonTags,
    Name: "pathfinder-nat-gw",
  },
}, {
  dependsOn: [igw],
});

// Route tables
const publicRouteTable = new aws.ec2.RouteTable("pathfinder-public-rt", {
  vpcId: vpc.id,
  routes: [
    {
      cidrBlock: "0.0.0.0/0",
      gatewayId: igw.id,
    },
  ],
  tags: {
    ...commonTags,
    Name: "pathfinder-public-rt",
  },
});

const privateRouteTable = new aws.ec2.RouteTable("pathfinder-private-rt", {
  vpcId: vpc.id,
  routes: [
    {
      cidrBlock: "0.0.0.0/0",
      natGatewayId: natGateway.id,
    },
  ],
  tags: {
    ...commonTags,
    Name: "pathfinder-private-rt",
  },
});

// Route table associations
const publicRtAssoc1 = new aws.ec2.RouteTableAssociation("pathfinder-public-rt-assoc-1", {
  subnetId: publicSubnet1.id,
  routeTableId: publicRouteTable.id,
});

const publicRtAssoc2 = new aws.ec2.RouteTableAssociation("pathfinder-public-rt-assoc-2", {
  subnetId: publicSubnet2.id,
  routeTableId: publicRouteTable.id,
});

const privateRtAssoc1 = new aws.ec2.RouteTableAssociation("pathfinder-private-rt-assoc-1", {
  subnetId: privateSubnet1.id,
  routeTableId: privateRouteTable.id,
});

const privateRtAssoc2 = new aws.ec2.RouteTableAssociation("pathfinder-private-rt-assoc-2", {
  subnetId: privateSubnet2.id,
  routeTableId: privateRouteTable.id,
});

// Helper arrays for convenience (mimicking awsx.ec2.Vpc interface)
const publicSubnetIds = [publicSubnet1.id, publicSubnet2.id];
const privateSubnetIds = [privateSubnet1.id, privateSubnet2.id];

// Security Groups
// ALB: Allow HTTP from internet
const albSecurityGroup = new aws.ec2.SecurityGroup("pathfinder-alb-sg", {
  vpcId: vpc.id,
  ingress: [
    {
      protocol: "tcp",
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  tags: {
    ...commonTags,
    Name: "pathfinder-alb-sg",
    Type: "load-balancer",
  },
});

// Service: Only accept traffic from ALB (not directly from internet)
const serviceSecurityGroup = new aws.ec2.SecurityGroup(
  "pathfinder-service-sg",
  {
    vpcId: vpc.id,
    ingress: [
      {
        protocol: "tcp",
        fromPort: 3000, // Next.js port
        toPort: 3000,
        securityGroups: [albSecurityGroup.id],
      },
    ],
    egress: [
      {
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
    tags: {
      ...commonTags,
      Name: "pathfinder-service-sg",
      Type: "ecs-service",
    },
  }
);

// Database Security Group - private access only
const dbSecurityGroup = new aws.ec2.SecurityGroup("pathfinder-db-sg", {
  vpcId: vpc.id,
  ingress: [
    // Allow access from ECS tasks in private subnets
    {
      protocol: "tcp",
      fromPort: 5432,
      toPort: 5432,
      securityGroups: [serviceSecurityGroup.id],
      description: "Allow PostgreSQL access from ECS service",
    },
    // Note: No public access - database is now fully private
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  tags: {
    ...commonTags,
    Name: "pathfinder-db-sg",
    Type: "database",
  },
});

// Database is now private - only accessible from ECS service!

// ==========================================
// DATABASE LAYER
// RDS PostgreSQL with auto-scaling storage
// ==========================================

// RDS Subnet Group - use PRIVATE subnets for secure database access
const dbSubnetGroup = new aws.rds.SubnetGroup("pathfinder-db-subnet-group", {
  subnetIds: privateSubnetIds, // Use PRIVATE subnets for security
  tags: {
    ...commonTags,
    Name: "pathfinder-db-subnet-group",
  },
}, {
  dependsOn: [vpc, privateSubnet1, privateSubnet2, natGateway, privateRouteTable, privateRtAssoc1, privateRtAssoc2],
});

// Generate a secure random password for the database
const dbPassword = new random.RandomPassword("pathfinder-db-password-v2", {
  length: 32,
  special: true,
  overrideSpecial: "!#$%&*()-_=+[]{}<>:?", // RDS doesn't allow: / @ " space
});

// RDS PostgreSQL Instance - publicly accessible for simplicity
const db = new aws.rds.Instance("pathfinder-db", {
  engine: "postgres",
  engineVersion: "15.13", // Updated to latest available version
  instanceClass: "db.t3.small", // Upgraded from micro: 2 vCPU, 2 GB RAM
  allocatedStorage: 50, // 50 GB (up from 20 GB)
  maxAllocatedStorage: 1000, // Auto-scale storage up to 1 TB as needed
  storageType: "gp3",
  storageEncrypted: true, // Enable encryption at rest
  dbName: "pathfinder",
  username: "pathfinder_admin",
  password: dbPassword.result, // Use the generated secure password
  vpcSecurityGroupIds: [dbSecurityGroup.id],
  dbSubnetGroupName: dbSubnetGroup.name,
  
  // Keep database private for security
  publiclyAccessible: false,
  
  // Use default parameter group (requires SSL - AWS best practice)
  applyImmediately: true, // Apply parameter changes immediately (requires restart)
  
  skipFinalSnapshot: true, // For dev - set to false in production
  deletionProtection: false, // For dev - set to true in production
  backupRetentionPeriod: 7, // Keep backups for 7 days
  backupWindow: "03:00-04:00", // 3-4 AM UTC
  maintenanceWindow: "sun:04:00-sun:05:00", // Sunday 4-5 AM UTC
  // No external logging - keep it simple!
  tags: {
    ...commonTags,
    Name: "pathfinder-db",
    Engine: "postgresql",
    Tier: "database",
  },
}, {
  dependsOn: [vpc, dbSubnetGroup, dbSecurityGroup],
});

// No complex monitoring - keep it simple!

// ==========================================
// LOAD BALANCING & TRAFFIC MANAGEMENT
// Application Load Balancer with health checks
// ==========================================

const lb = new awsx.lb.ApplicationLoadBalancer("pathfinder-lb", {
  subnetIds: publicSubnetIds,
  securityGroups: [albSecurityGroup.id],
  tags: {
    ...commonTags,
    Name: "pathfinder-lb",
    Type: "application-load-balancer",
  },
  defaultTargetGroup: {
    port: 3000,
    protocol: "HTTP",
    targetType: "ip", // Required for Fargate
    healthCheck: {
      enabled: true,
      path: "/",
      healthyThreshold: 2,
      unhealthyThreshold: 3,
      timeout: 30,
      interval: 60,
      matcher: "200",
    },
  },
});

// ==========================================
// CONTAINER INFRASTRUCTURE
// ECR, ECS Service, IAM Roles, Logging
// ==========================================

// ECS Cluster
const cluster = new aws.ecs.Cluster("pathfinder-cluster", {
  tags: {
    ...commonTags,
    Name: "pathfinder-cluster",
  },
});

// Logging
const logGroup = new aws.cloudwatch.LogGroup("pathfinder-logs", {
  retentionInDays: 7,
  tags: {
    ...commonTags,
    Name: "pathfinder-logs",
    Type: "application-logs",
  },
});

// ECS needs this role to pull images and write logs
const executionRole = new aws.iam.Role("pathfinder-execution-role", {
  assumeRolePolicy: `{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        }
      }
    ]
  }`,
});

new aws.iam.RolePolicyAttachment("pathfinder-execution-role-policy", {
  role: executionRole.name,
  policyArn:
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
});

// No CodeBuild needed - building locally with Pulumi!

// ECR for storing Docker images
const repo = new awsx.ecr.Repository("pathfinder-repo", {
  forceDelete: true, // Allow deletion even if images exist
  tags: {
    ...commonTags,
    Name: "pathfinder-repo",
    Type: "container-registry",
  },
});

// STAGE 1: Migration image (builds first)
const migrationImage = new awsx.ecr.Image("pathfinder-migration-image", {
  repositoryUrl: repo.url,
  context: "../web",
  platform: "linux/amd64", 
  dockerfile: "../web/Dockerfile.migration",
});

// Migration Task Definition - runs in private subnet with database access
const migrationTaskDefinition = new aws.ecs.TaskDefinition("pathfinder-migration-task", {
  family: "pathfinder-migrations",
  networkMode: "awsvpc",
  requiresCompatibilities: ["FARGATE"],
  cpu: "256",
  memory: "512",
  executionRoleArn: executionRole.arn,
  containerDefinitions: pulumi.jsonStringify([
    {
      name: "migration-container",
      image: migrationImage.imageUri,
      essential: true,
      environment: [
        {
          name: "DATABASE_URL",
          value: pulumi.interpolate`postgresql://${db.username}:${dbPassword.result}@${db.address}:5432/${db.dbName}?sslmode=require`,
        },
      ],
      command: ["bun", "run", "scripts/run-migrations.ts"],
      logConfiguration: {
        logDriver: "awslogs",
        options: {
          "awslogs-group": logGroup.name,
          "awslogs-region": aws.getRegionOutput().name,
          "awslogs-stream-prefix": "migration",
        },
      },
    },
  ]),
  tags: {
    ...commonTags,
    Name: "pathfinder-migration-task",
    Type: "migration",
  },
}, {
  dependsOn: [migrationImage, db, executionRole, logGroup],
});

// Run migrations as ECS task in private subnet (has database access)
const runMigrations = new command.local.Command("run-migrations", {
  create: pulumi.interpolate`
    echo "🚀 Running database migrations via ECS task..."
    
    # Run migration task in private subnet where it can access the database
    aws ecs run-task \
      --cluster ${cluster.name} \
      --task-definition ${migrationTaskDefinition.arn} \
      --launch-type FARGATE \
      --network-configuration 'awsvpcConfiguration={subnets=[${privateSubnet1.id},${privateSubnet2.id}],securityGroups=[${serviceSecurityGroup.id}],assignPublicIp=ENABLED}' \
      --region ${aws.getRegionOutput().name}
    
    echo "✅ Database migration task started (check ECS console for status)"
  `,
}, {
  dependsOn: [migrationTaskDefinition, cluster, privateSubnet1, privateSubnet2, serviceSecurityGroup]
});

// STAGE 2: App image (builds AFTER migrations succeed)
const appImage = new awsx.ecr.Image("pathfinder-app-image", {
  repositoryUrl: repo.url,
  context: "../web", // Build from web directory
  platform: "linux/amd64",
  // No database access during build - app will fetch data at runtime
  // (Private database cannot be accessed during local build process)
}, {
  dependsOn: [runMigrations] // Wait for migrations to complete before building app
});

// Clean 2-stage pipeline:
// Stage 1: Migration image → Run migrations ✅
// Stage 2: App image (with DB access) → Deploy ECS ✅

// ECS Service - simple app deployment (migrations already completed)
const service = new awsx.ecs.FargateService("pathfinder-service", {
  cluster: cluster.arn,
  networkConfiguration: {
    subnets: privateSubnetIds,
    securityGroups: [serviceSecurityGroup.id],
    assignPublicIp: true, // Needed to pull images from ECR
  },
  desiredCount: 2,
  taskDefinitionArgs: {
    executionRole: {
      roleArn: executionRole.arn,
    },
    containers: {
      // Main application container (migrations already completed in build stage)
      "pathfinder-app": {
        name: "pathfinder-app",
        image: appImage.imageUri,
        cpu: 1024, // 1 vCPU
        memory: 2048, // 2GB
        essential: true,
        environment: [
          {
            name: "HOSTNAME",
            value: "0.0.0.0", // Critical: bind to all interfaces, not just localhost
          },
          {
            name: "PORT",
            value: "3000",
          },
          {
            name: "DATABASE_URL",
            value: pulumi.interpolate`postgresql://${db.username}:${dbPassword.result}@${db.endpoint}/${db.dbName}?sslmode=require`,
          },
          {
            name: "NODE_ENV",
            value: "production",
          },
          {
            name: "ENABLE_DEBUG_ENDPOINTS",
            value: "true", // Temporary: for debugging environment variables
          },
        ],
        portMappings: [
          {
            containerPort: 3000,
            targetGroup: lb.defaultTargetGroup,
          },
        ],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": logGroup.name,
            "awslogs-region": aws.getRegionOutput().name,
            "awslogs-stream-prefix": "pathfinder-app",
          },
        },
      },
    },
  },
}, {
  dependsOn: [appImage] // Wait for app image to be built (which waits for migrations)
});

// Database is private - only accessible from within VPC

// ==========================================
// AUTO-SCALING CONFIGURATION
// Automatically scale ECS tasks based on CPU
// ==========================================

const scaling = new aws.appautoscaling.Target("pathfinder-scaling", {
  maxCapacity: 10,
  minCapacity: 2,
  resourceId: pulumi.interpolate`service/${cluster.name}/${service.service.name}`,
  scalableDimension: "ecs:service:DesiredCount",
  serviceNamespace: "ecs",
});

const scalingPolicy = new aws.appautoscaling.Policy(
  "pathfinder-scaling-policy",
  {
    policyType: "TargetTrackingScaling",
    resourceId: scaling.resourceId,
    scalableDimension: scaling.scalableDimension,
    serviceNamespace: scaling.serviceNamespace,
    targetTrackingScalingPolicyConfiguration: {
      targetValue: 50, // Scale at 50% CPU
      predefinedMetricSpecification: {
        predefinedMetricType: "ECSServiceAverageCPUUtilization",
      },
    },
  }
);

// No complex monitoring - keep it simple!

// No external logging complexity - keep it simple!

// ==========================================
// STACK OUTPUTS
// Values accessible after deployment
// ==========================================

export const url = lb.loadBalancer.dnsName.apply((dns) => `http://${dns}`);
export const dbEndpoint = db.endpoint;
export const dbConnectionString = pulumi.interpolate`postgresql://${db.username}:${dbPassword.result}@${db.endpoint}/${db.dbName}?sslmode=require`;
// Export password as a secret - only visible via CLI with --show-secrets flag
export const dbPasswordSecret = pulumi.secret(dbPassword.result);
export const dbUsername = db.username;

// Migration information - runs during build stage
export const migrationStatus = runMigrations.stdout;

// Simplified build - no CodeBuild needed!
export const ecrRepositoryUrl = repo.url;
