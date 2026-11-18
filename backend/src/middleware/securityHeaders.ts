import { createMiddleware } from 'hono/factory';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Security Headers Middleware
 * Implements CSP, HSTS, X-Frame-Options, and other security headers
 */
export function securityHeaders() {
  return createMiddleware(async (c, next) => {
    await next();

    // Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // React Native needs unsafe-eval for Hermes
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.entregafacil.app https://evolution.entregafacil.app wss://api.entregafacil.app",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];

    if (isProduction) {
      // Stricter CSP in production
      cspDirectives[1] = "script-src 'self'"; // Remove unsafe-inline/eval in production if possible
      cspDirectives[2] = "style-src 'self'";
    }

    c.header('Content-Security-Policy', cspDirectives.join('; '));

    // HTTP Strict Transport Security (HSTS)
    if (isProduction) {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // X-Frame-Options
    c.header('X-Frame-Options', 'DENY');

    // X-Content-Type-Options
    c.header('X-Content-Type-Options', 'nosniff');

    // Referrer-Policy
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions-Policy (Feature Policy)
    c.header('Permissions-Policy', [
      'accelerometer=()',
      'camera=(self)',
      'geolocation=(self)',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ].join(', '));

    // Cross-Origin-Embedder-Policy
    c.header('Cross-Origin-Embedder-Policy', 'require-corp');

    // Cross-Origin-Opener-Policy
    c.header('Cross-Origin-Opener-Policy', 'same-origin');

    // Cross-Origin-Resource-Policy
    c.header('Cross-Origin-Resource-Policy', 'same-origin');

    // Remove server header
    c.header('Server', 'EntregaFácil');

    // X-Permitted-Cross-Domain-Policies
    c.header('X-Permitted-Cross-Domain-Policies', 'none');

    // X-Download-Options
    c.header('X-Download-Options', 'noopen');

    // X-DNS-Prefetch-Control
    c.header('X-DNS-Prefetch-Control', 'off');
  });
}

/**
 * Additional security headers for API responses
 */
export function apiSecurityHeaders() {
  return createMiddleware(async (c, next) => {
    await next();

    // Cache control for API responses
    if (c.req.path.startsWith('/api/')) {
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      c.header('Pragma', 'no-cache');
      c.header('Expires', '0');
    }

    // Ensure JSON responses
    if (c.res.headers.get('Content-Type')?.includes('application/json')) {
      c.header('X-Content-Type-Options', 'nosniff');
    }
  });
}

/**
 * Webhook security headers
 */
export function webhookSecurityHeaders() {
  return createMiddleware(async (c, next) => {
    await next();

    // Webhooks should not be cached
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    c.header('X-Content-Type-Options', 'nosniff');
  });
}