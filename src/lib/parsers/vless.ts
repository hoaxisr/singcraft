/**
 * VLESS link parser for sing-box outbound configuration
 *
 * Supported link format:
 * vless://uuid@host:port?type=transport&security=tls|reality&...#name
 *
 * Supported parameters:
 * - type: tcp, ws, grpc, http, quic
 * - security: none, tls, reality
 * - flow: xtls-rprx-vision
 * - sni: server name indication
 * - fp: TLS fingerprint
 * - alpn: ALPN protocols (comma-separated)
 * - pbk: Reality public key
 * - sid: Reality short ID
 * - path: WebSocket/HTTP path
 * - host: WebSocket/HTTP host header
 * - serviceName: gRPC service name
 */

import type {
  VlessOutbound,
  ParseResult,
  BatchParseResult,
  TlsConfig,
  Transport,
  WsTransport,
  GrpcTransport,
  HttpTransport,
  TlsFingerprint,
  AlpnProtocol,
  SecurityType,
  TransportType,
} from "./types";

// Valid values for validation
const VALID_TRANSPORTS: TransportType[] = ["tcp", "ws", "grpc", "http", "quic"];
const VALID_SECURITY: SecurityType[] = ["none", "tls", "reality"];
const VALID_FINGERPRINTS: TlsFingerprint[] = [
  "chrome", "firefox", "edge", "safari", "360", "qq", "ios", "android", "random", "randomized"
];

/**
 * Parse a single VLESS link into sing-box outbound configuration
 */
export function parseVlessLink(link: string, lineNumber: number, defaultTag?: string): ParseResult {
  const trimmedLink = link.trim();

  // Basic validation
  if (!trimmedLink) {
    return {
      success: false,
      error: "Empty link",
      originalLink: link,
      lineNumber,
    };
  }

  if (!trimmedLink.startsWith("vless://")) {
    return {
      success: false,
      error: "Link must start with vless://",
      originalLink: link,
      lineNumber,
    };
  }

  try {
    // Remove vless:// prefix
    const withoutProtocol = trimmedLink.slice(8);

    // Split by # to get the name/tag
    const [mainPart, fragment] = withoutProtocol.split("#");
    const tag = fragment ? decodeURIComponent(fragment) : defaultTag || `proxy-p${lineNumber}`;

    // Split by @ to get uuid and rest
    const atIndex = mainPart.lastIndexOf("@");
    if (atIndex === -1) {
      return {
        success: false,
        error: "Invalid format: missing @ separator",
        originalLink: link,
        lineNumber,
      };
    }

    const uuid = mainPart.slice(0, atIndex);
    const hostPortParams = mainPart.slice(atIndex + 1);

    // Validate UUID format (basic check)
    if (!uuid || uuid.length < 32) {
      return {
        success: false,
        error: "Invalid UUID format",
        originalLink: link,
        lineNumber,
      };
    }

    // Split host:port and params
    const [hostPort, queryString] = hostPortParams.split("?");

    // Parse host and port
    let server: string;
    let serverPort: number;

    // Handle IPv6 addresses [::1]:port
    if (hostPort.startsWith("[")) {
      const bracketEnd = hostPort.indexOf("]");
      if (bracketEnd === -1) {
        return {
          success: false,
          error: "Invalid IPv6 address format",
          originalLink: link,
          lineNumber,
        };
      }
      server = hostPort.slice(1, bracketEnd);
      const portPart = hostPort.slice(bracketEnd + 1);
      if (!portPart.startsWith(":")) {
        return {
          success: false,
          error: "Missing port after IPv6 address",
          originalLink: link,
          lineNumber,
        };
      }
      serverPort = parseInt(portPart.slice(1), 10);
    } else {
      // IPv4 or hostname
      const colonIndex = hostPort.lastIndexOf(":");
      if (colonIndex === -1) {
        return {
          success: false,
          error: "Missing port",
          originalLink: link,
          lineNumber,
        };
      }
      server = hostPort.slice(0, colonIndex);
      serverPort = parseInt(hostPort.slice(colonIndex + 1), 10);
    }

    if (!server) {
      return {
        success: false,
        error: "Missing server address",
        originalLink: link,
        lineNumber,
      };
    }

    if (isNaN(serverPort) || serverPort < 1 || serverPort > 65535) {
      return {
        success: false,
        error: "Invalid port number",
        originalLink: link,
        lineNumber,
      };
    }

    // Parse query parameters
    const params = new URLSearchParams(queryString || "");

    // Build outbound configuration
    const outbound: VlessOutbound = {
      type: "vless",
      tag,
      server,
      server_port: serverPort,
      uuid,
    };

    // Parse flow
    const flow = params.get("flow");
    if (flow) {
      outbound.flow = flow;
    }

    // Parse security and TLS config
    const security = (params.get("security") || "none") as SecurityType;
    if (!VALID_SECURITY.includes(security)) {
      return {
        success: false,
        error: `Invalid security type: ${security}`,
        originalLink: link,
        lineNumber,
      };
    }

    if (security === "tls" || security === "reality") {
      const tlsConfig: TlsConfig = {
        enabled: true,
      };

      // Server name
      const sni = params.get("sni") || params.get("serverName");
      if (sni) {
        tlsConfig.server_name = sni;
      } else if (security === "tls") {
        // Use server as default SNI for TLS
        tlsConfig.server_name = server;
      }

      // Fingerprint (uTLS)
      const fp = params.get("fp") || params.get("fingerprint");
      if (fp) {
        const fingerprint = fp as TlsFingerprint;
        if (VALID_FINGERPRINTS.includes(fingerprint)) {
          tlsConfig.utls = {
            enabled: true,
            fingerprint,
          };
        }
      }

      // ALPN
      const alpn = params.get("alpn");
      if (alpn) {
        tlsConfig.alpn = alpn.split(",") as AlpnProtocol[];
      }

      // Reality specific
      if (security === "reality") {
        const pbk = params.get("pbk");
        const sid = params.get("sid") || "";

        if (!pbk) {
          return {
            success: false,
            error: "Reality requires public key (pbk)",
            originalLink: link,
            lineNumber,
          };
        }

        tlsConfig.reality = {
          enabled: true,
          public_key: pbk,
          short_id: sid,
        };

        // Reality requires SNI
        if (!tlsConfig.server_name) {
          const spx = params.get("spx");
          if (spx) {
            // spx contains the SNI for reality
            tlsConfig.server_name = spx;
          }
        }
      }

      // Allow insecure (for testing)
      const allowInsecure = params.get("allowInsecure");
      if (allowInsecure === "1" || allowInsecure === "true") {
        tlsConfig.insecure = true;
      }

      outbound.tls = tlsConfig;
    }

    // Parse transport
    const transportType = (params.get("type") || "tcp") as TransportType;
    if (!VALID_TRANSPORTS.includes(transportType)) {
      return {
        success: false,
        error: `Invalid transport type: ${transportType}`,
        originalLink: link,
        lineNumber,
      };
    }

    if (transportType !== "tcp") {
      const transport = buildTransport(transportType, params);
      if (transport) {
        outbound.transport = transport;
      }
    }

    return {
      success: true,
      outbound,
      originalLink: link,
      lineNumber,
    };
  } catch (error) {
    return {
      success: false,
      error: `Parse error: ${(error as Error).message}`,
      originalLink: link,
      lineNumber,
    };
  }
}

/**
 * Build transport configuration based on type and parameters
 */
function buildTransport(type: TransportType, params: URLSearchParams): Transport | undefined {
  switch (type) {
    case "ws": {
      const transport: WsTransport = { type: "ws" };

      const path = params.get("path");
      if (path) {
        transport.path = decodeURIComponent(path);
      }

      const host = params.get("host");
      if (host) {
        transport.headers = { Host: host };
      }

      const ed = params.get("ed");
      if (ed) {
        transport.max_early_data = parseInt(ed, 10);
        transport.early_data_header_name = "Sec-WebSocket-Protocol";
      }

      return transport;
    }

    case "grpc": {
      const transport: GrpcTransport = { type: "grpc" };

      const serviceName = params.get("serviceName") || params.get("service");
      if (serviceName) {
        transport.service_name = serviceName;
      }

      return transport;
    }

    case "http": {
      const transport: HttpTransport = { type: "http" };

      const path = params.get("path");
      if (path) {
        transport.path = decodeURIComponent(path);
      }

      const host = params.get("host");
      if (host) {
        transport.host = host.split(",");
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

/**
 * Parse multiple VLESS links (batch processing)
 */
export function parseVlessLinks(input: string): BatchParseResult {
  const lines = input.split("\n");
  const outbounds: VlessOutbound[] = [];
  const errors: { lineNumber: number; link: string; error: string }[] = [];
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
      continue;
    }

    // Only process vless:// links
    if (!trimmed.startsWith("vless://")) {
      continue;
    }

    const result = parseVlessLink(trimmed, lineNumber);

    if (result.success && result.outbound) {
      outbounds.push(result.outbound);
    } else if (result.error) {
      errors.push({
        lineNumber,
        link: trimmed,
        error: result.error,
      });
    }
  }

  return {
    outbounds,
    errors,
    totalLinks: outbounds.length + errors.length,
    successCount: outbounds.length,
    errorCount: errors.length,
  };
}
