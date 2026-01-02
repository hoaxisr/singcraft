export type DnsPreset = "google" | "cloudflare" | "adguard";

export interface DnsConfig {
  servers: Array<{
    tag: string;
    type: string;
    server?: string;
    server_port?: number;
    detour?: string;
  }>;
  final: string;
  strategy: string;
}

export const dnsPresets: Record<DnsPreset, { label: string; desc: string; config: DnsConfig }> = {
  google: {
    label: "Google DNS",
    desc: "DNS over TLS через 8.8.8.8",
    config: {
      servers: [
        {
          tag: "google",
          type: "tls",
          server: "8.8.8.8",
          detour: "proxy",
        },
        {
          tag: "local",
          type: "local",
        },
      ],
      final: "google",
      strategy: "prefer_ipv4",
    },
  },
  cloudflare: {
    label: "Cloudflare DNS",
    desc: "DNS over HTTPS через 1.1.1.1",
    config: {
      servers: [
        {
          tag: "cloudflare",
          type: "https",
          server: "1.1.1.1",
          server_port: 443,
          detour: "proxy",
        },
        {
          tag: "local",
          type: "local",
        },
      ],
      final: "cloudflare",
      strategy: "prefer_ipv4",
    },
  },
  adguard: {
    label: "AdGuard DNS",
    desc: "DNS over TLS с блокировкой рекламы",
    config: {
      servers: [
        {
          tag: "adguard",
          type: "tls",
          server: "dns.adguard-dns.com",
          detour: "proxy",
        },
        {
          tag: "local",
          type: "local",
        },
      ],
      final: "adguard",
      strategy: "prefer_ipv4",
    },
  },
};
