import { dnsPresets } from "@/templates/dns";
import { inboundPresets } from "@/templates/inbounds";
import type { DnsPreset, DnsConfig } from "@/templates/dns";
import type { InboundPreset, InboundConfig } from "@/templates/inbounds";

export interface Outbound {
  type: string;
  tag: string;
  [key: string]: unknown;
}

// AWG Peer for endpoint configuration
export interface AwgPeerConfig {
  address: string;
  port: number;
  public_key: string;
  preshared_key?: string;
  allowed_ips: string[];
  persistent_keepalive_interval?: number;
}

// AWG endpoint configuration (sing-box format)
export interface AwgEndpointConfig {
  type: "awg";
  tag: string;
  useIntegratedTun?: boolean;
  private_key: string;
  address: string[];
  mtu?: number;
  listen_port?: number;

  // AWG 1.0 obfuscation parameters
  jc?: number;
  jmin?: number;
  jmax?: number;
  s1?: number;
  s2?: number;
  s3?: number;
  s4?: number;
  h1?: string;
  h2?: string;
  h3?: string;
  h4?: string;

  // AWG 2.0 init packet parameters (optional)
  i1?: string;
  i2?: string;
  i3?: string;
  i4?: string;
  i5?: string;

  peers: AwgPeerConfig[];
}

export interface SingBoxConfig {
  log: {
    level: string;
    timestamp: boolean;
  };
  experimental: {
    cache_file: {
      enabled: boolean;
      path: string;
    };
    clash_api: {
      external_controller: string;
      external_ui: string;
      secret: string;
    };
  };
  dns: DnsConfig;
  inbounds: InboundConfig[];
  endpoints?: AwgEndpointConfig[];
  outbounds: Outbound[];
  route: {
    default_domain_resolver: string;
    auto_detect_interface: boolean;
    final: string;
    rules: Array<{
      ip_is_private?: boolean;
      outbound: string;
    }>;
  };
}

export interface BuildOptions {
  outbounds: Outbound[];
  endpoints?: AwgEndpointConfig[];
  dnsPreset: DnsPreset;
  inboundPreset: InboundPreset;
}

export function buildConfig(options: BuildOptions): SingBoxConfig {
  const { outbounds, endpoints = [], dnsPreset, inboundPreset } = options;

  // Получаем теги всех outbounds + endpoints (теги endpoints используются напрямую)
  const allTags = [
    ...outbounds.map((o) => o.tag),
    ...endpoints.map((ep) => ep.tag),
  ];

  // Создаём системные outbounds
  const systemOutbounds: Outbound[] = [
    {
      type: "selector",
      tag: "proxy",
      outbounds: allTags.length > 0 ? ["auto", ...allTags] : ["direct"],
      default: allTags.length > 0 ? "auto" : "direct",
    },
    ...(allTags.length > 0
      ? [
          {
            type: "urltest",
            tag: "auto",
            outbounds: allTags,
            url: "https://www.gstatic.com/generate_204",
            interval: "5m",
            tolerance: 50,
          },
        ]
      : []),
    {
      type: "direct",
      tag: "direct",
    },
  ];

  const config: SingBoxConfig = {
    log: {
      level: "info",
      timestamp: true,
    },
    experimental: {
      cache_file: {
        enabled: true,
        path: "cache.db",
      },
      clash_api: {
        external_controller: "127.0.0.1:9090",
        external_ui: "ui",
        secret: "",
      },
    },
    dns: dnsPresets[dnsPreset].config,
    inbounds: inboundPresets[inboundPreset].config,
    outbounds: [...outbounds, ...systemOutbounds],
    route: {
      default_domain_resolver: "local",
      auto_detect_interface: true,
      final: "proxy",
      rules: [
        {
          ip_is_private: true,
          outbound: "direct",
        },
      ],
    },
  };

  // Добавляем endpoints если есть
  if (endpoints.length > 0) {
    config.endpoints = endpoints;
  }

  return config;
}
