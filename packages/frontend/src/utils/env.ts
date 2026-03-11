/**
 * Runtime environment config that supports Docker env variable overrides.
 *
 * At build time, Next.js inlines NEXT_PUBLIC_* values. At runtime in Docker,
 * entrypoint.sh generates __env.js which sets window.__RUNTIME_ENV__, and
 * these values take precedence over the build-time defaults.
 *
 * These are getter functions (not constants) so they read the runtime value
 * after the __env.js script has executed, not at module load time.
 */

declare global {
  interface Window {
    __RUNTIME_ENV__?: {
      NEXT_PUBLIC_API_URL?: string;
      NEXT_PUBLIC_API_BASE_URL?: string;
    };
  }
}

/** Returns the API URL (e.g. http://host:2568/api/v1). */
export function getApiUrl(): string | undefined {
  return (
    window.__RUNTIME_ENV__?.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_URL
  );
}

/** Returns the API base URL (e.g. http://host:2568). */
export function getApiBaseUrl(): string | undefined {
  return (
    window.__RUNTIME_ENV__?.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL
  );
}
