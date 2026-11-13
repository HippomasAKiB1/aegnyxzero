/**
 * Application runtime configuration.
 * Resolves API base URL from Vite environment with local development fallback.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

