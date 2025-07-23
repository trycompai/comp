import { ApplicationConfig } from '../types';

export function validateApplicationConfigs(applications: ApplicationConfig[]): void {
  // Check for duplicate app names
  const appNames = applications.map((app) => app.name);
  const uniqueNames = new Set(appNames);
  if (appNames.length !== uniqueNames.size) {
    const duplicates = appNames.filter((name, index) => appNames.indexOf(name) !== index);
    throw new Error(`Duplicate application names found: ${duplicates.join(', ')}`);
  }

  // Check for port conflicts when using host-based routing on same domain
  const hostRoutingApps = applications.filter((app) => app.routing?.hostnames);
  const portsByHost = new Map<string, Set<number>>();

  hostRoutingApps.forEach((app) => {
    app.routing?.hostnames?.forEach((hostname) => {
      if (!portsByHost.has(hostname)) {
        portsByHost.set(hostname, new Set());
      }
      portsByHost.get(hostname)!.add(app.containerPort);
    });
  });

  // Check each app's configuration
  applications.forEach((app) => {
    // Validate app name (AWS resource naming constraints)
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(app.name)) {
      throw new Error(
        `Invalid app name '${app.name}': must start with letter and contain only letters, numbers, and hyphens`,
      );
    }

    if (app.name.length > 32) {
      throw new Error(`App name '${app.name}' is too long: max 32 characters`);
    }

    // Validate port
    if (app.containerPort < 1 || app.containerPort > 65535) {
      throw new Error(
        `Invalid container port ${app.containerPort} for app '${app.name}': must be between 1-65535`,
      );
    }

    // Validate routing - must have either path or hostname, not both
    if (app.routing) {
      if (app.routing.pathPattern && app.routing.hostnames) {
        throw new Error(`App '${app.name}' cannot have both path-based and host-based routing`);
      }
      if (!app.routing.pathPattern && !app.routing.hostnames) {
        throw new Error(`App '${app.name}' must have either pathPattern or hostnames for routing`);
      }
    }

    // Validate scaling configuration
    if (app.minCount !== undefined && app.maxCount !== undefined) {
      if (app.minCount > app.maxCount) {
        throw new Error(
          `App '${app.name}': minCount (${app.minCount}) cannot be greater than maxCount (${app.maxCount})`,
        );
      }
      if (app.minCount < 0) {
        throw new Error(`App '${app.name}': minCount cannot be negative`);
      }
    }

    if (app.desiredCount !== undefined) {
      if (app.desiredCount < 0) {
        throw new Error(`App '${app.name}': desiredCount cannot be negative`);
      }
      if (app.minCount !== undefined && app.desiredCount < app.minCount) {
        throw new Error(
          `App '${app.name}': desiredCount (${app.desiredCount}) cannot be less than minCount (${app.minCount})`,
        );
      }
      if (app.maxCount !== undefined && app.desiredCount > app.maxCount) {
        throw new Error(
          `App '${app.name}': desiredCount (${app.desiredCount}) cannot be greater than maxCount (${app.maxCount})`,
        );
      }
    }

    // Validate CPU/memory
    if (app.cpu !== undefined && app.cpu <= 0) {
      throw new Error(`App '${app.name}': CPU must be positive`);
    }
    if (app.memory !== undefined && app.memory <= 0) {
      throw new Error(`App '${app.name}': memory must be positive`);
    }

    // Validate target CPU percent for scaling
    if (app.targetCPUPercent !== undefined) {
      if (app.targetCPUPercent <= 0 || app.targetCPUPercent > 100) {
        throw new Error(`App '${app.name}': targetCPUPercent must be between 1-100`);
      }
    }

    // Validate environment variables don't contain sensitive data
    if (app.environmentVariables) {
      const sensitivePatterns = ['password', 'secret', 'key', 'token', 'credential'];
      Object.keys(app.environmentVariables).forEach((key) => {
        const lowerKey = key.toLowerCase();
        if (sensitivePatterns.some((pattern) => lowerKey.includes(pattern))) {
          throw new Error(
            `App '${app.name}': environment variable '${key}' appears to be sensitive. ` +
              `Use requiredSecrets array for sensitive values.`,
          );
        }
      });
    }
  });

  // Ensure at least one app is configured
  if (applications.length === 0) {
    throw new Error('At least one application must be configured');
  }
}
