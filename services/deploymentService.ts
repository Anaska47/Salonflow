
export interface DeploymentStatus {
  version: string;
  env: 'production' | 'staging' | 'development';
  lastDeploy: string;
  status: 'healthy' | 'degraded' | 'maintenance';
}

export const DEPLOYMENT_CONFIG: DeploymentStatus = {
  version: "1.2.4-stable",
  env: "production",
  lastDeploy: new Date().toISOString(),
  status: "healthy"
};

export const FEATURE_FLAGS = {
  enableAiAnalytics: true,
  enableAdvancedSecurity: true,
  enableBetaBooking: false,
  maintenanceMode: false
};
