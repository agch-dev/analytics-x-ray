import packageJson from '../../package.json';

/**
 * Get the formatted version string with 'v' prefix
 * @returns The formatted version string (e.g., "v1.4.0")
 */
export function getFormattedVersion(): string {
  return `v${packageJson.version}`;
}
