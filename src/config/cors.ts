import { env } from "./env.js";

function httpAndHttps(host: string, port: number): string[] {
  return [`http://${host}:${port}`, `https://${host}:${port}`];
}

const services = [
  {
    dns: env.FRONTEND_SERVER_DNS,
    ports: [env.FRONTEND_SERVER_PORT, env.FRONTEND_SERVER_K8S_PORT],
  },
  {
    dns: env.ASTROLOGY_API_SERVER_DNS,
    ports: [env.ASTROLOGY_API_SERVER_PORT, env.ASTROLOGY_API_SERVER_K8S_PORT],
  },
  {
    dns: env.BOOKING_API_SERVER_DNS,
    ports: [env.BOOKING_API_SERVER_PORT, env.BOOKING_API_SERVER_K8S_PORT],
  },
  {
    dns: env.PAYMENT_API_SERVER_DNS,
    ports: [env.PAYMENT_API_SERVER_PORT, env.PAYMENT_API_SERVER_K8S_PORT],
  },
];

const localHosts = [
  "localhost",
  "192.168.122.10",
  "192.168.122.11",
  "192.168.122.12",
];

const origins: string[] = [];

for (const service of services) {
  for (const port of service.ports) {
    if (port === undefined) continue;
    for (const host of localHosts) {
      origins.push(...httpAndHttps(host, port));
    }
    origins.push(...httpAndHttps(service.dns, port));
  }
}

origins.push(
  "https://astrolumina.pages.dev",
  "https://develop.astrolumina.pages.dev",
  "https://astrolumina.com",
  "https://astrolumina.ro",
);

export const defaultOrigins = [...new Set(origins)];
