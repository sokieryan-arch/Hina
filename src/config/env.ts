/**
 * Environment variable validation and configuration
 */

interface EnvironmentConfig {
  geminiApiKey: string;
  nodeEnv: 'development' | 'production';
  port: number;
}

/**
 * Validates that all required environment variables are set
 * @throws Error if any required environment variable is missing
 * @returns The validated environment configuration
 */
export function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = [];

  // Check GEMINI_API_KEY
  if (!process.env.GEMINI_API_KEY) {
    errors.push('GEMINI_API_KEY environment variable is required');
  }

  if (errors.length > 0) {
    const errorMessage = errors.join('\n  - ');
    throw new Error(
      `Missing or invalid environment variables:\n  - ${errorMessage}\n\nPlease check your .env.local file or environment setup.`
    );
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  if (isNaN(port)) {
    throw new Error('PORT must be a valid number');
  }

  return {
    geminiApiKey: process.env.GEMINI_API_KEY,
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production') || 'development',
    port,
  };
}

/**
 * Logs environment configuration information (without exposing secrets)
 */
export function logEnvironmentInfo(config: EnvironmentConfig): void {
  console.log('📋 Environment Configuration:');
  console.log(`  - Environment: ${config.nodeEnv}`);
  console.log(`  - Port: ${config.port}`);
  console.log(`  - API Key: ${'*'.repeat(8)}...${process.env.GEMINI_API_KEY?.slice(-4)}`);
}
