// Dummy environment for unit tests. Import this module (for its side effect)
// before dynamically importing any src module: env.ts validates at load and
// exits the process when a required variable is missing.
export const DC_DNS = "dc.test.local";
export const K8S_DNS = "k8s.test.local";

export const FRONTEND_DC_PORT = "8080";
export const FRONTEND_K8S_PORT = "8180";
export const ASTROLOGY_DC_PORT = "3031";
export const ASTROLOGY_K8S_PORT = "3131";
export const BOOKING_DC_PORT = "3033";
export const BOOKING_K8S_PORT = "3133";
export const PAYMENT_DC_PORT = "3032";
export const PAYMENT_K8S_PORT = "3132";

const SENTRY_DSN = "https://abc123@o0.ingest.sentry.io/0";

Object.assign(process.env, {
  NODE_ENV: "development",

  BOOKING_API_SERVER_PORT: BOOKING_DC_PORT,
  BOOKING_API_SENTRY_DSN: SENTRY_DSN,

  RESEND_API_KEY: "test-resend-key",
  CALCOM_API_KEY: "test-calcom-key",
  CALCOM_BASE_URL: "https://cal.test.local",
  R2_BASE_URL: "https://r2.test.local",
  D1_ACCOUNT_ID: "test-account-id",
  D1_DATABASE_ID: "test-database-id",
  D1_API_TOKEN: "test-d1-token",

  ASTROLOGY_API_SERVER_DC_PORT: ASTROLOGY_DC_PORT,
  ASTROLOGY_API_SERVER_DC_DNS: DC_DNS,
  ASTROLOGY_API_SERVER_K8S_PORT: ASTROLOGY_K8S_PORT,
  ASTROLOGY_API_SERVER_K8S_DNS: K8S_DNS,

  BOOKING_API_SERVER_DC_PORT: BOOKING_DC_PORT,
  BOOKING_API_SERVER_DC_DNS: DC_DNS,
  BOOKING_API_SERVER_K8S_PORT: BOOKING_K8S_PORT,
  BOOKING_API_SERVER_K8S_DNS: K8S_DNS,

  PAYMENT_API_SERVER_DC_PORT: PAYMENT_DC_PORT,
  PAYMENT_API_SERVER_DC_DNS: DC_DNS,
  PAYMENT_API_SERVER_K8S_PORT: PAYMENT_K8S_PORT,
  PAYMENT_API_SERVER_K8S_DNS: K8S_DNS,

  FRONTEND_SERVER_DC_PORT: FRONTEND_DC_PORT,
  FRONTEND_SERVER_DC_DNS: DC_DNS,
  FRONTEND_SERVER_K8S_PORT: FRONTEND_K8S_PORT,
  FRONTEND_SERVER_K8S_DNS: K8S_DNS,
});
