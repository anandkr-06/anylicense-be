export function ensureEnvProperty(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function ensureEnvPropertyNumeric(key: string): number {
  const value = ensureEnvProperty(key);
  const numberValue = Number(value);
  if (isNaN(numberValue)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return numberValue;
}

export function ensureEnvironment(): string {
  return process.env['NODE_ENV'] || 'development';
}
