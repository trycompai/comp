import * as aws from '@pulumi/aws';
import { CommonConfig } from '../types';

export function createNetworking(config: CommonConfig) {
  const { commonTags, networkConfig, securityConfig } = config;

  // ==========================================
  // VPC AND CORE NETWORKING
  // ==========================================

  // VPC with DNS support for RDS and enhanced networking
  const vpc = new aws.ec2.Vpc(`${config.projectName}-vpc`, {
    cidrBlock: networkConfig.vpcCidr,
    enableDnsHostnames: true, // Required for RDS and ALB
    enableDnsSupport: true, // Required for RDS and ALB
    tags: {
      ...commonTags,
      Name: `${config.projectName}-vpc`,
      Type: 'vpc',
    },
  });

  // Internet Gateway for public subnet access
  const internetGateway = new aws.ec2.InternetGateway(`${config.projectName}-igw`, {
    vpcId: vpc.id,
    tags: {
      ...commonTags,
      Name: `${config.projectName}-igw`,
      Type: 'internet-gateway',
    },
  });

  // Get availability zones dynamically
  const availabilityZones = aws.getAvailabilityZonesOutput({
    state: 'available',
  });

  // ==========================================
  // SUBNETS
  // ==========================================

  // Public subnets (for ALB, NAT Gateway, and Tailscale)
  const publicSubnets = networkConfig.subnets.public.map(
    (subnet, index) =>
      new aws.ec2.Subnet(`${config.projectName}-public-subnet-${index + 1}`, {
        vpcId: vpc.id,
        cidrBlock: subnet.cidr,
        availabilityZone: availabilityZones.apply((azs) => azs.names[subnet.az]),
        mapPublicIpOnLaunch: true,
        tags: {
          ...commonTags,
          Name: `${config.projectName}-public-subnet-${index + 1}`,
          Type: 'public',
          Tier: 'public',
        },
      }),
  );

  // Private subnets (for RDS, ECS, and internal services)
  const privateSubnets = networkConfig.subnets.private.map(
    (subnet, index) =>
      new aws.ec2.Subnet(`${config.projectName}-private-subnet-${index + 1}`, {
        vpcId: vpc.id,
        cidrBlock: subnet.cidr,
        availabilityZone: availabilityZones.apply((azs) => azs.names[subnet.az]),
        mapPublicIpOnLaunch: false, // Private subnets don't auto-assign public IPs
        tags: {
          ...commonTags,
          Name: `${config.projectName}-private-subnet-${index + 1}`,
          Type: 'private',
          Tier: 'private',
        },
      }),
  );

  // Extract subnet IDs for use in other resources
  const publicSubnetIds = publicSubnets.map((subnet) => subnet.id);
  const privateSubnetIds = privateSubnets.map((subnet) => subnet.id);

  // ==========================================
  // NAT GATEWAY FOR PRIVATE SUBNET INTERNET ACCESS
  // ==========================================

  // Elastic IP for NAT Gateway
  const natEip = new aws.ec2.Eip(`${config.projectName}-nat-eip`, {
    domain: 'vpc',
    tags: {
      ...commonTags,
      Name: `${config.projectName}-nat-eip`,
    },
  });

  // NAT Gateway in first public subnet
  const natGateway = new aws.ec2.NatGateway(`${config.projectName}-nat-gateway`, {
    allocationId: natEip.id,
    subnetId: publicSubnets[0].id,
    tags: {
      ...commonTags,
      Name: `${config.projectName}-nat-gateway`,
    },
  });

  // ==========================================
  // ROUTE TABLES
  // ==========================================

  // Public route table
  const publicRouteTable = new aws.ec2.RouteTable(`${config.projectName}-public-rt`, {
    vpcId: vpc.id,
    tags: {
      ...commonTags,
      Name: `${config.projectName}-public-rt`,
      Type: 'route-table',
      Tier: 'public',
    },
  });

  // Route for public internet access via Internet Gateway
  const publicRoute = new aws.ec2.Route(`${config.projectName}-public-route`, {
    routeTableId: publicRouteTable.id,
    destinationCidrBlock: '0.0.0.0/0',
    gatewayId: internetGateway.id,
  });

  // Associate public subnets with public route table
  publicSubnets.map(
    (subnet, index) =>
      new aws.ec2.RouteTableAssociation(`${config.projectName}-public-rta-${index + 1}`, {
        subnetId: subnet.id,
        routeTableId: publicRouteTable.id,
      }),
  );

  // Private route table
  const privateRouteTable = new aws.ec2.RouteTable(`${config.projectName}-private-rt`, {
    vpcId: vpc.id,
    tags: {
      ...commonTags,
      Name: `${config.projectName}-private-rt`,
      Type: 'route-table',
      Tier: 'private',
    },
  });

  // Route for private internet access via NAT Gateway
  const privateRoute = new aws.ec2.Route(`${config.projectName}-private-route`, {
    routeTableId: privateRouteTable.id,
    destinationCidrBlock: '0.0.0.0/0',
    natGatewayId: natGateway.id,
  });

  // Associate private subnets with private route table
  privateSubnets.map(
    (subnet, index) =>
      new aws.ec2.RouteTableAssociation(`${config.projectName}-private-rta-${index + 1}`, {
        subnetId: subnet.id,
        routeTableId: privateRouteTable.id,
      }),
  );

  // ==========================================
  // SECURITY GROUPS
  // ==========================================

  // ALB Security Group
  const albSecurityGroup = new aws.ec2.SecurityGroup(`${config.projectName}-alb-sg`, {
    vpcId: vpc.id,
    description: 'Security group for Application Load Balancer',
    ingress: [
      {
        protocol: 'tcp',
        fromPort: 80,
        toPort: 80,
        cidrBlocks: ['0.0.0.0/0'],
        description: 'HTTP access from internet',
      },
      {
        protocol: 'tcp',
        fromPort: 443,
        toPort: 443,
        cidrBlocks: ['0.0.0.0/0'],
        description: 'HTTPS access from internet',
      },
    ],
    egress: [
      {
        protocol: '-1',
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ['0.0.0.0/0'],
        description: 'All outbound traffic',
      },
    ],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-alb-sg`,
      Type: 'security-group',
      Tier: 'public',
    },
  });

  // ECS Security Group
  const ecsSecurityGroup = new aws.ec2.SecurityGroup(`${config.projectName}-ecs-sg`, {
    vpcId: vpc.id,
    description: 'Security group for ECS services',
    ingress: [
      {
        protocol: 'tcp',
        fromPort: 3000,
        toPort: 3000,
        securityGroups: [albSecurityGroup.id],
        description: 'HTTP access from ALB only',
      },
    ],
    egress: [
      {
        protocol: '-1',
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ['0.0.0.0/0'],
        description: 'All outbound traffic',
      },
    ],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-ecs-sg`,
      Type: 'security-group',
      Tier: 'private',
    },
  });

  // Database Security Group
  const databaseSecurityGroup = new aws.ec2.SecurityGroup(`${config.projectName}-db-sg`, {
    vpcId: vpc.id,
    description: 'Security group for RDS database',
    ingress: [
      {
        protocol: 'tcp',
        fromPort: 5432,
        toPort: 5432,
        securityGroups: [ecsSecurityGroup.id],
        description: 'PostgreSQL access from ECS only',
      },
    ],
    egress: [
      {
        protocol: '-1',
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ['0.0.0.0/0'],
        description: 'Outbound traffic for updates and maintenance',
      },
    ],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-db-sg`,
      Type: 'security-group',
      Tier: 'private',
    },
  });

  // CodeBuild Security Group
  const codeBuildSecurityGroup = new aws.ec2.SecurityGroup(`${config.projectName}-codebuild-sg`, {
    vpcId: vpc.id,
    description: 'Security group for CodeBuild projects',
    egress: [
      {
        protocol: '-1',
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ['0.0.0.0/0'],
        description: 'Full outbound access for builds',
      },
    ],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-codebuild-sg`,
      Type: 'security-group',
      Tier: 'private',
    },
  });

  // Allow CodeBuild to access database
  const buildDatabaseAccess = new aws.ec2.SecurityGroupRule(
    `${config.projectName}-build-database-access`,
    {
      type: 'ingress',
      fromPort: 5432,
      toPort: 5432,
      protocol: 'tcp',
      sourceSecurityGroupId: codeBuildSecurityGroup.id,
      securityGroupId: databaseSecurityGroup.id,
      description: 'Allow CodeBuild to access database for builds',
    },
  );

  // Tailscale Security Group
  const tailscaleSecurityGroup = new aws.ec2.SecurityGroup(`${config.projectName}-tailscale-sg`, {
    vpcId: vpc.id,
    description: 'Security group for Tailscale subnet router',
    ingress: [
      {
        protocol: 'tcp',
        fromPort: 22,
        toPort: 22,
        cidrBlocks: securityConfig.allowedCidrBlocks,
        description: 'SSH access from allowed IPs',
      },
      {
        protocol: 'udp',
        fromPort: 41641,
        toPort: 41641,
        cidrBlocks: ['0.0.0.0/0'],
        description: 'Tailscale UDP traffic',
      },
    ],
    egress: [
      {
        protocol: '-1',
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ['0.0.0.0/0'],
        description: 'All outbound traffic',
      },
    ],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-tailscale-sg`,
      Type: 'security-group',
      Tier: 'public',
    },
  });

  // Allow Tailscale to access database
  const tailscaleDatabaseAccess = new aws.ec2.SecurityGroupRule(
    `${config.projectName}-tailscale-database-access`,
    {
      type: 'ingress',
      fromPort: 5432,
      toPort: 5432,
      protocol: 'tcp',
      sourceSecurityGroupId: tailscaleSecurityGroup.id,
      securityGroupId: databaseSecurityGroup.id,
      description: 'Allow Tailscale router to access database for development',
    },
  );

  // ==========================================
  // VPC ENDPOINTS
  // ==========================================

  // S3 VPC Endpoint
  const s3VpcEndpoint = new aws.ec2.VpcEndpoint(`${config.projectName}-s3-endpoint`, {
    vpcId: vpc.id,
    serviceName: `com.amazonaws.${config.awsRegion}.s3`,
    vpcEndpointType: 'Gateway',
    routeTableIds: [privateRouteTable.id],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-s3-endpoint`,
      Type: 'vpc-endpoint',
    },
  });

  // Shared security group for VPC endpoints (allows both ECS and CodeBuild access)
  const vpcEndpointSecurityGroup = new aws.ec2.SecurityGroup(
    `${config.projectName}-vpc-endpoint-sg`,
    {
      vpcId: vpc.id,
      description: 'Security group for VPC endpoints (ECR, CodeBuild, CloudWatch)',
      ingress: [
        {
          protocol: 'tcp',
          fromPort: 443,
          toPort: 443,
          securityGroups: [ecsSecurityGroup.id, codeBuildSecurityGroup.id],
          description: 'HTTPS access from ECS and CodeBuild',
        },
      ],
      egress: [
        {
          protocol: '-1',
          fromPort: 0,
          toPort: 0,
          cidrBlocks: ['0.0.0.0/0'],
          description: 'All outbound traffic',
        },
      ],
      tags: {
        ...commonTags,
        Name: `${config.projectName}-vpc-endpoint-sg`,
        Type: 'security-group',
      },
    },
  );

  // ECR API VPC Endpoint (for ECS in private subnets)
  const ecrApiVpcEndpoint = new aws.ec2.VpcEndpoint(`${config.projectName}-ecr-api-endpoint`, {
    vpcId: vpc.id,
    serviceName: `com.amazonaws.${config.awsRegion}.ecr.api`,
    vpcEndpointType: 'Interface',
    subnetIds: privateSubnetIds,
    securityGroupIds: [vpcEndpointSecurityGroup.id],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-ecr-api-endpoint`,
      Type: 'vpc-endpoint',
    },
  });

  // ECR DKR VPC Endpoint (for ECS in private subnets)
  const ecrDkrVpcEndpoint = new aws.ec2.VpcEndpoint(`${config.projectName}-ecr-dkr-endpoint`, {
    vpcId: vpc.id,
    serviceName: `com.amazonaws.${config.awsRegion}.ecr.dkr`,
    vpcEndpointType: 'Interface',
    subnetIds: privateSubnetIds,
    securityGroupIds: [vpcEndpointSecurityGroup.id],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-ecr-dkr-endpoint`,
      Type: 'vpc-endpoint',
    },
  });

  // CodeBuild VPC Endpoint (essential for CodeBuild to work in VPC)
  const codebuildVpcEndpoint = new aws.ec2.VpcEndpoint(`${config.projectName}-codebuild-endpoint`, {
    vpcId: vpc.id,
    serviceName: `com.amazonaws.${config.awsRegion}.codebuild`,
    vpcEndpointType: 'Interface',
    subnetIds: publicSubnetIds,
    securityGroupIds: [vpcEndpointSecurityGroup.id],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-codebuild-endpoint`,
      Type: 'vpc-endpoint',
    },
  });

  // CloudWatch Logs VPC Endpoint (for CodeBuild logging)
  const logsVpcEndpoint = new aws.ec2.VpcEndpoint(`${config.projectName}-logs-endpoint`, {
    vpcId: vpc.id,
    serviceName: `com.amazonaws.${config.awsRegion}.logs`,
    vpcEndpointType: 'Interface',
    subnetIds: publicSubnetIds,
    securityGroupIds: [vpcEndpointSecurityGroup.id],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-logs-endpoint`,
      Type: 'vpc-endpoint',
    },
  });

  return {
    vpcId: vpc.id,
    vpcCidr: vpc.cidrBlock,
    internetGatewayId: internetGateway.id,
    natGatewayId: natGateway.id,
    publicSubnetIds,
    privateSubnetIds,
    availabilityZones: availabilityZones.apply((azs) => azs.names),
    securityGroups: {
      alb: albSecurityGroup.id,
      ecs: ecsSecurityGroup.id,
      database: databaseSecurityGroup.id,
      codeBuild: codeBuildSecurityGroup.id,
      tailscale: tailscaleSecurityGroup.id,
    },
    routeTableIds: {
      public: publicRouteTable.id,
      private: privateRouteTable.id,
    },
    vpcEndpoints: {
      s3: s3VpcEndpoint.id,
      ecrApi: ecrApiVpcEndpoint.id,
      ecrDkr: ecrDkrVpcEndpoint.id,
      codebuild: codebuildVpcEndpoint.id,
      logs: logsVpcEndpoint.id,
    },
  };
}
