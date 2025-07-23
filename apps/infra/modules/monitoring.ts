import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { ApplicationConfig, CommonConfig, DatabaseOutputs, LoadBalancerOutputs } from '../types';

interface MonitoringOptions {
  enableBetterStack?: boolean;
  enableDetailedMonitoring?: boolean;
}

interface ApplicationContainerOutputs {
  serviceName: pulumi.Output<string>;
  repositoryUrl: pulumi.Output<string>;
  logGroupName: pulumi.Output<string>;
  targetGroupArn?: pulumi.Output<string>;
}

export function createMonitoring(
  config: CommonConfig,
  applications: ApplicationConfig[],
  database: DatabaseOutputs,
  appContainers: Record<string, ApplicationContainerOutputs>,
  loadBalancer: LoadBalancerOutputs,
  options: MonitoringOptions = {},
) {
  const { commonTags } = config;
  const { enableBetterStack = false, enableDetailedMonitoring = true } = options;

  // Create dashboard widgets for each application
  const appWidgets = applications.flatMap((app, index) => {
    const container = appContainers[app.name];
    if (!container) return [];

    const yOffset = index * 12; // Stack app widgets vertically

    return [
      {
        type: 'metric',
        x: 0,
        y: yOffset,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            [
              'AWS/ECS',
              'CPUUtilization',
              'ServiceName',
              container.serviceName,
              'ClusterName',
              `${config.projectName}-cluster`,
            ],
            ['.', 'MemoryUtilization', '.', '.', '.', '.'],
          ],
          view: 'timeSeries',
          stacked: false,
          region: config.awsRegion,
          title: `${app.name} - ECS Service Metrics`,
          period: 300,
        },
      },
      {
        type: 'log',
        x: 12,
        y: yOffset,
        width: 12,
        height: 6,
        properties: {
          query: `SOURCE '${container.logGroupName}'
            | fields @timestamp, @message
            | sort @timestamp desc
            | limit 100`,
          region: config.awsRegion,
          title: `${app.name} - Recent Logs`,
        },
      },
    ];
  });

  // CloudWatch Dashboard for Application Monitoring
  const applicationDashboard = new aws.cloudwatch.Dashboard(`${config.projectName}-app-dashboard`, {
    dashboardName: `${config.projectName}-application`,
    dashboardBody: pulumi
      .all([loadBalancer.albArn, ...Object.values(appContainers).map((c) => c.logGroupName)])
      .apply(([albArn]) =>
        JSON.stringify({
          widgets: [
            // ALB metrics at the top
            {
              type: 'metric',
              x: 0,
              y: 0,
              width: 24,
              height: 6,
              properties: {
                metrics: [
                  ['AWS/ApplicationELB', 'RequestCount', 'LoadBalancer', albArn],
                  ['.', 'TargetResponseTime', '.', '.'],
                  ['.', 'HTTPCode_Target_2XX_Count', '.', '.'],
                  ['.', 'HTTPCode_Target_4XX_Count', '.', '.'],
                  ['.', 'HTTPCode_Target_5XX_Count', '.', '.'],
                ],
                view: 'timeSeries',
                stacked: false,
                region: config.awsRegion,
                title: 'Application Load Balancer Metrics',
                period: 300,
              },
            },
            // Application-specific widgets
            ...appWidgets,
            // Database metrics at the bottom
            {
              type: 'metric',
              x: 0,
              y: applications.length * 12,
              width: 24,
              height: 6,
              properties: {
                metrics: [
                  ['AWS/RDS', 'CPUUtilization', 'DBInstanceIdentifier', database.instanceId],
                  ['.', 'DatabaseConnections', '.', '.'],
                  ['.', 'ReadLatency', '.', '.'],
                  ['.', 'WriteLatency', '.', '.'],
                ],
                view: 'timeSeries',
                stacked: false,
                region: config.awsRegion,
                title: 'Database Metrics',
                period: 300,
              },
            },
          ],
        }),
      ),
  });

  // Infrastructure Dashboard for Operations
  const infrastructureDashboard = new aws.cloudwatch.Dashboard(
    `${config.projectName}-infra-dashboard`,
    {
      dashboardName: `${config.projectName}-infrastructure`,
      dashboardBody: pulumi
        .all(Object.entries(appContainers).map(([appName, container]) => ({ appName, container })))
        .apply((apps) =>
          JSON.stringify({
            widgets: [
              // ECS Task counts for all apps
              ...apps.map((appData, index) => ({
                type: 'metric',
                x: (index % 2) * 12,
                y: Math.floor(index / 2) * 6,
                width: 12,
                height: 6,
                properties: {
                  metrics: [
                    [
                      'AWS/ECS',
                      'RunningTaskCount',
                      'ServiceName',
                      appData.container.serviceName,
                      'ClusterName',
                      `${config.projectName}-cluster`,
                    ],
                    ['.', 'DesiredCount', '.', '.', '.', '.'],
                  ],
                  view: 'timeSeries',
                  stacked: false,
                  region: config.awsRegion,
                  title: `${appData.appName} - ECS Task Counts`,
                  period: 300,
                },
              })),
              // ALB Target Health at the bottom
              {
                type: 'metric',
                x: 0,
                y: Math.ceil(apps.length / 2) * 6,
                width: 24,
                height: 6,
                properties: {
                  metrics: apps.flatMap((appData) =>
                    appData.container.targetGroupArn
                      ? [
                          [
                            'AWS/ApplicationELB',
                            'HealthyHostCount',
                            'TargetGroup',
                            appData.container.targetGroupArn,
                          ],
                          ['.', 'UnHealthyHostCount', '.', '.'],
                        ]
                      : [],
                  ),
                  view: 'timeSeries',
                  stacked: false,
                  region: config.awsRegion,
                  title: 'Target Group Health',
                  period: 300,
                },
              },
            ],
          }),
        ),
    },
  );

  // Create alarms for each application if detailed monitoring is enabled
  const appAlarms = enableDetailedMonitoring
    ? applications.flatMap((app) => {
        const container = appContainers[app.name];
        if (!container) return [];

        return [
          // High CPU utilization alarm
          new aws.cloudwatch.MetricAlarm(`${config.projectName}-${app.name}-cpu-alarm`, {
            name: `${config.projectName}-${app.name}-high-cpu`,
            alarmDescription: `High CPU utilization for ${app.name} ECS service`,
            metricName: 'CPUUtilization',
            namespace: 'AWS/ECS',
            statistic: 'Average',
            period: 300,
            evaluationPeriods: 2,
            threshold: 85,
            comparisonOperator: 'GreaterThanThreshold',
            dimensions: {
              ServiceName: container.serviceName,
              ClusterName: `${config.projectName}-cluster`,
            },
            treatMissingData: 'notBreaching',
            tags: {
              ...commonTags,
              Name: `${config.projectName}-${app.name}-cpu-alarm`,
              Type: 'cloudwatch-alarm',
              App: app.name,
            },
          }),

          // High memory utilization alarm
          new aws.cloudwatch.MetricAlarm(`${config.projectName}-${app.name}-memory-alarm`, {
            name: `${config.projectName}-${app.name}-high-memory`,
            alarmDescription: `High memory utilization for ${app.name} ECS service`,
            metricName: 'MemoryUtilization',
            namespace: 'AWS/ECS',
            statistic: 'Average',
            period: 300,
            evaluationPeriods: 2,
            threshold: 85,
            comparisonOperator: 'GreaterThanThreshold',
            dimensions: {
              ServiceName: container.serviceName,
              ClusterName: `${config.projectName}-cluster`,
            },
            treatMissingData: 'notBreaching',
            tags: {
              ...commonTags,
              Name: `${config.projectName}-${app.name}-memory-alarm`,
              Type: 'cloudwatch-alarm',
              App: app.name,
            },
          }),
        ];
      })
    : [];

  // Custom Metrics Lambda Function
  const customMetricsRole = new aws.iam.Role(`${config.projectName}-custom-metrics-role`, {
    name: `${config.projectName}-custom-metrics-role`,
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'lambda.amazonaws.com',
          },
        },
      ],
    }),
    tags: {
      ...commonTags,
      Name: 'custom-metrics-role',
      Type: 'iam-role',
    },
  });

  const customMetricsPolicy = new aws.iam.RolePolicy(
    `${config.projectName}-custom-metrics-policy`,
    {
      role: customMetricsRole.id,
      policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            Resource: 'arn:aws:logs:*:*:*',
          },
          {
            Effect: 'Allow',
            Action: ['cloudwatch:PutMetricData'],
            Resource: '*',
          },
          {
            Effect: 'Allow',
            Action: ['ecs:DescribeServices', 'ecs:DescribeTasks', 'ecs:ListTasks'],
            Resource: '*',
          },
          {
            Effect: 'Allow',
            Action: ['rds:DescribeDBInstances'],
            Resource: '*',
          },
        ],
      }),
    },
  );

  const customMetricsFunction = new aws.lambda.Function(
    `${config.projectName}-custom-metrics-function`,
    {
      name: `${config.projectName}-custom-metrics`,
      runtime: 'python3.9',
      handler: 'index.handler',
      role: customMetricsRole.arn,
      code: new pulumi.asset.AssetArchive({
        'index.py': new pulumi.asset.StringAsset(`
import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

cloudwatch = boto3.client('cloudwatch')
ecs = boto3.client('ecs')
rds = boto3.client('rds')

def handler(event, context):
    try:
        # Get ECS service metrics for all apps
        cluster_name = '${config.projectName}-cluster'
        service_names = ${JSON.stringify(Object.values(appContainers).map(() => ''))}
        
        # This would need to be populated with actual service names at runtime
        # For now, this is a placeholder for the Lambda function
            
            # Custom metric: Service health ratio
            health_ratio = running_count / desired_count if desired_count > 0 else 0
            
            cloudwatch.put_metric_data(
                Namespace='${config.projectName}/Application',
                MetricData=[
                    {
                        'MetricName': 'ServiceHealthRatio',
                        'Value': health_ratio,
                        'Unit': 'Percent',
                        'Dimensions': [
                            {
                                'Name': 'ProjectName',
                                'Value': '${config.projectName}'
                            },
                            {
                                'Name': 'AwsRegion',
                                'Value': '${config.awsRegion}'
                            }
                        ]
                    }
                ]
            )
        
        logger.info('Custom metrics published successfully')
        return {
            'statusCode': 200,
            'body': json.dumps('Metrics published successfully')
        }
        
    except Exception as e:
        logger.error(f'Error publishing metrics: {str(e)}')
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
`),
      }),
      timeout: 60,
      tags: {
        ...commonTags,
        Name: 'custom-metrics-function',
        Type: 'lambda-function',
      },
    },
  );

  // Schedule custom metrics function
  const customMetricsSchedule = new aws.cloudwatch.EventRule(
    `${config.projectName}-custom-metrics-schedule`,
    {
      scheduleExpression: 'rate(5 minutes)',
      tags: {
        ...commonTags,
        Name: 'custom-metrics-schedule',
        Type: 'event-rule',
      },
    },
  );

  const customMetricsTarget = new aws.cloudwatch.EventTarget(
    `${config.projectName}-custom-metrics-target`,
    {
      rule: customMetricsSchedule.name,
      arn: customMetricsFunction.arn,
    },
  );

  const customMetricsPermission = new aws.lambda.Permission(
    `${config.projectName}-custom-metrics-permission`,
    {
      action: 'lambda:InvokeFunction',
      function: customMetricsFunction.name,
      principal: 'events.amazonaws.com',
      sourceArn: customMetricsSchedule.arn,
    },
  );

  // High Error Rate Alarm
  const highErrorRateAlarm = new aws.cloudwatch.MetricAlarm(
    `${config.projectName}-high-error-rate-alarm`,
    {
      name: `${config.projectName}-high-error-rate`,
      metricName: 'HTTPCode_Target_5XX_Count',
      namespace: 'AWS/ApplicationELB',
      statistic: 'Sum',
      period: 300,
      evaluationPeriods: 2,
      threshold: 10,
      comparisonOperator: 'GreaterThanThreshold',
      dimensions: {
        LoadBalancer: loadBalancer.albArn,
      },
      tags: {
        ...commonTags,
        Name: 'high-error-rate-alarm',
        Type: 'cloudwatch-alarm',
      },
    },
  );

  // Database Connection Alarm
  const databaseConnectionAlarm = new aws.cloudwatch.MetricAlarm(
    `${config.projectName}-database-connection-alarm`,
    {
      name: `${config.projectName}-database-connections`,
      metricName: 'DatabaseConnections',
      namespace: 'AWS/RDS',
      statistic: 'Average',
      period: 300,
      evaluationPeriods: 2,
      threshold: 80,
      comparisonOperator: 'GreaterThanThreshold',
      dimensions: {
        DBInstanceIdentifier: database.instanceId,
      },
      tags: {
        ...commonTags,
        Name: `${config.projectName}-database-connection-alarm`,
        Type: 'cloudwatch-alarm',
      },
    },
  );

  // Better Stack Integration (optional)
  let betterStackSecret: aws.secretsmanager.Secret | undefined;
  let logForwarderFunction: aws.lambda.Function | undefined;

  if (enableBetterStack) {
    betterStackSecret = new aws.secretsmanager.Secret(`${config.projectName}-betterstack-secret`, {
      name: `${config.projectName}/betterstack/token`,
      tags: {
        ...commonTags,
        Name: `${config.projectName}-betterstack-secret`,
        Type: 'secret',
      },
    });

    // Better Stack log forwarder function would go here
    // Implementation depends on Better Stack's API
  }

  return {
    applicationDashboardUrl: applicationDashboard.dashboardName.apply(
      (name) =>
        `https://${config.awsRegion}.console.aws.amazon.com/cloudwatch/home?region=${config.awsRegion}#dashboards:name=${name}`,
    ),
    infrastructureDashboardUrl: infrastructureDashboard.dashboardName.apply(
      (name) =>
        `https://${config.awsRegion}.console.aws.amazon.com/cloudwatch/home?region=${config.awsRegion}#dashboards:name=${name}`,
    ),
    applicationLogGroups: Object.entries(appContainers).reduce(
      (acc, [appName, container]) => {
        acc[appName] = container.logGroupName;
        return acc;
      },
      {} as Record<string, pulumi.Output<string>>,
    ),
    logsUrls: Object.entries(appContainers).reduce(
      (acc, [appName, container]) => {
        acc[appName] = container.logGroupName.apply(
          (logGroupName) =>
            `https://${config.awsRegion}.console.aws.amazon.com/cloudwatch/home?region=${config.awsRegion}#logsV2:log-groups/log-group/${encodeURIComponent(logGroupName)}`,
        );
        return acc;
      },
      {} as Record<string, pulumi.Output<string>>,
    ),
    metricsNamespace: `${config.projectName}/Application`,
    customMetricsFunctionArn: customMetricsFunction.arn,
    metricsUrl: `https://${config.awsRegion}.console.aws.amazon.com/cloudwatch/home?region=${config.awsRegion}#metricsV2:graph=~();namespace=${config.projectName}/Application`,
    highErrorRateAlarmArn: highErrorRateAlarm.arn,
    databaseConnectionAlarmArn: databaseConnectionAlarm.arn,
    alarmsUrl: `https://${config.awsRegion}.console.aws.amazon.com/cloudwatch/home?region=${config.awsRegion}#alarmsV2:`,
    logForwarderFunctionArn: logForwarderFunction?.arn,
    betterStackSecretArn: betterStackSecret?.arn,
  };
}
