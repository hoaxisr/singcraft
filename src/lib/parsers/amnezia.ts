/**
 * AmneziaVPN / XRay JSON config parser
 * Converts XRay/V2Ray format to sing-box outbound format
 *
 * Input format (XRay):
 * {
 *   "outbounds": [{
 *     "protocol": "vless",
 *     "settings": {
 *       "vnext": [{
 *         "address": "server",
 *         "port": 443,
 *         "users": [{ "id": "uuid", "encryption": "none", "flow": "..." }]
 *       }]
 *     },
 *     "streamSettings": {
 *       "network": "tcp",
 *       "security": "reality",
 *       "realitySettings": { ... },
 *       "tlsSettings": { ... },
 *       "wsSettings": { ... },
 *       "grpcSettings": { ... }
 *     }
 *   }]
 * }
 */

import type {
  VlessOutbound,
  TlsConfig,
  Transport,
  WsTransport,
  GrpcTransport,
  HttpTransport,
  TlsFingerprint,
  AlpnProtocol,
} from "./types";

// XRay/V2Ray types
interface XRayUser {
  id: string;
  encryption?: string;
  flow?: string;
}

interface XRayVnext {
  address: string;
  port: number;
  users: XRayUser[];
}

interface XRayRealitySettings {
  fingerprint?: string;
  publicKey?: string;
  serverName?: string;
  shortId?: string;
  spiderX?: string;
}

interface XRayTlsSettings {
  serverName?: string;
  fingerprint?: string;
  alpn?: string[];
  allowInsecure?: boolean;
}

interface XRayWsSettings {
  path?: string;
  headers?: Record<string, string>;
}

interface XRayGrpcSettings {
  serviceName?: string;
  multiMode?: boolean;
}

interface XRayHttpSettings {
  path?: string;
  host?: string[];
}

interface XRayStreamSettings {
  network?: string;
  security?: string;
  realitySettings?: XRayRealitySettings;
  tlsSettings?: XRayTlsSettings;
  wsSettings?: XRayWsSettings;
  grpcSettings?: XRayGrpcSettings;
  httpSettings?: XRayHttpSettings;
}

interface XRayOutbound {
  protocol: string;
  tag?: string;
  settings?: {
    vnext?: XRayVnext[];
  };
  streamSettings?: XRayStreamSettings;
}

interface XRayConfig {
  outbounds?: XRayOutbound[];
  inbounds?: unknown[];
  log?: unknown;
}

export interface AmneziaParseResult {
  success: boolean;
  outbounds: VlessOutbound[];
  errors: string[];
}

/**
 * Parse AmneziaVPN/XRay JSON config and convert to sing-box format
 */
export function parseAmneziaConfig(jsonText: string): AmneziaParseResult {
  const errors: string[] = [];
  const outbounds: VlessOutbound[] = [];

  // Parse JSON
  let config: XRayConfig;
  try {
    config = JSON.parse(jsonText);
  } catch (e) {
    return {
      success: false,
      outbounds: [],
      errors: [`Invalid JSON: ${(e as Error).message}`],
    };
  }

  // Check for outbounds
  if (!config.outbounds || !Array.isArray(config.outbounds)) {
    return {
      success: false,
      outbounds: [],
      errors: ["No outbounds array found in config"],
    };
  }

  // Process each outbound
  let proxyCounter = 1;
  for (let i = 0; i < config.outbounds.length; i++) {
    const xrayOutbound = config.outbounds[i];

    // Only process vless protocol for now
    if (xrayOutbound.protocol !== "vless") {
      errors.push(`Outbound ${i + 1}: protocol "${xrayOutbound.protocol}" not supported, skipping`);
      continue;
    }

    try {
      const singboxOutbound = convertXRayToSingbox(xrayOutbound, proxyCounter);
      if (singboxOutbound) {
        outbounds.push(singboxOutbound);
        proxyCounter++;
      }
    } catch (e) {
      errors.push(`Outbound ${i + 1}: ${(e as Error).message}`);
    }
  }

  return {
    success: outbounds.length > 0,
    outbounds,
    errors,
  };
}

/**
 * Convert single XRay outbound to sing-box format
 */
function convertXRayToSingbox(xray: XRayOutbound, index: number): VlessOutbound | null {
  const vnext = xray.settings?.vnext?.[0];
  if (!vnext) {
    throw new Error("No vnext configuration found");
  }

  const user = vnext.users?.[0];
  if (!user) {
    throw new Error("No user configuration found");
  }

  const stream = xray.streamSettings;
  const tag = xray.tag || `proxy-p${index}`;

  // Build base outbound
  const outbound: VlessOutbound = {
    type: "vless",
    tag,
    server: vnext.address,
    server_port: vnext.port,
    uuid: user.id,
  };

  // Add flow if present
  if (user.flow) {
    outbound.flow = user.flow;
  }

  // Process stream settings
  if (stream) {
    // TLS/Reality configuration
    const security = stream.security;
    if (security === "tls" || security === "reality") {
      outbound.tls = buildTlsConfig(stream);
    }

    // Transport configuration
    const network = stream.network || "tcp";
    if (network !== "tcp") {
      const transport = buildTransport(network, stream);
      if (transport) {
        outbound.transport = transport;
      }
    }
  }

  return outbound;
}

/**
 * Build TLS configuration from XRay stream settings
 */
function buildTlsConfig(stream: XRayStreamSettings): TlsConfig {
  const tlsConfig: TlsConfig = {
    enabled: true,
  };

  if (stream.security === "reality") {
    const reality = stream.realitySettings;
    if (reality) {
      // Server name
      if (reality.serverName) {
        tlsConfig.server_name = reality.serverName;
      }

      // Fingerprint (uTLS)
      if (reality.fingerprint) {
        tlsConfig.utls = {
          enabled: true,
          fingerprint: reality.fingerprint as TlsFingerprint,
        };
      }

      // Reality config
      if (reality.publicKey) {
        tlsConfig.reality = {
          enabled: true,
          public_key: reality.publicKey,
          short_id: reality.shortId || "",
        };
      }
    }
  } else if (stream.security === "tls") {
    const tls = stream.tlsSettings;
    if (tls) {
      // Server name
      if (tls.serverName) {
        tlsConfig.server_name = tls.serverName;
      }

      // Fingerprint
      if (tls.fingerprint) {
        tlsConfig.utls = {
          enabled: true,
          fingerprint: tls.fingerprint as TlsFingerprint,
        };
      }

      // ALPN
      if (tls.alpn && tls.alpn.length > 0) {
        tlsConfig.alpn = tls.alpn as AlpnProtocol[];
      }

      // Allow insecure
      if (tls.allowInsecure) {
        tlsConfig.insecure = true;
      }
    }
  }

  return tlsConfig;
}

/**
 * Build transport configuration from XRay stream settings
 */
function buildTransport(network: string, stream: XRayStreamSettings): Transport | undefined {
  switch (network) {
    case "ws": {
      const ws = stream.wsSettings;
      const transport: WsTransport = { type: "ws" };

      if (ws?.path) {
        transport.path = ws.path;
      }

      if (ws?.headers) {
        transport.headers = ws.headers;
      }

      return transport;
    }

    case "grpc": {
      const grpc = stream.grpcSettings;
      const transport: GrpcTransport = { type: "grpc" };

      if (grpc?.serviceName) {
        transport.service_name = grpc.serviceName;
      }

      return transport;
    }

    case "http":
    case "h2": {
      const http = stream.httpSettings;
      const transport: HttpTransport = { type: "http" };

      if (http?.path) {
        transport.path = http.path;
      }

      if (http?.host && http.host.length > 0) {
        transport.host = http.host;
      }

      return transport;
    }

    case "quic": {
      return { type: "quic" };
    }

    default:
      return undefined;
  }
}
