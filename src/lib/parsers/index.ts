/**
 * Proxy link parser module
 *
 * Currently supports VLESS protocol.
 * Designed for easy extension to support other protocols (VMess, Trojan, etc.)
 */

import { parseVlessLink } from "./vless";
import type {
  VlessOutbound,
  ParseResult,
  BatchParseResult,
  ParseError,
} from "./types";

// Re-export types
export type {
  VlessOutbound,
  ParseResult,
  BatchParseResult,
  ParseError,
  TlsConfig,
  Transport,
  WsTransport,
  GrpcTransport,
  HttpTransport,
  QuicTransport,
} from "./types";

export type { AmneziaParseResult } from "./amnezia";
export { parseAmneziaConfig } from "./amnezia";

export type { AwgEndpoint, AwgPeer, AwgParseResult } from "./awg";
export { parseAwgConfig, formatAwgEndpointJson } from "./awg";

// Supported protocols
type Protocol = "vless" | "vmess" | "trojan" | "ss" | "hy2" | "tuic";

/**
 * Detect protocol from link
 */
function detectProtocol(link: string): Protocol | null {
  const trimmed = link.trim().toLowerCase();

  if (trimmed.startsWith("vless://")) return "vless";
  if (trimmed.startsWith("vmess://")) return "vmess";
  if (trimmed.startsWith("trojan://")) return "trojan";
  if (trimmed.startsWith("ss://")) return "ss";
  if (trimmed.startsWith("hy2://") || trimmed.startsWith("hysteria2://"))
    return "hy2";
  if (trimmed.startsWith("tuic://")) return "tuic";

  return null;
}

/**
 * Parse a single proxy link
 * Returns ParseResult with success status and outbound or error
 */
export function parseProxyLink(
  link: string,
  lineNumber: number = 1,
): ParseResult {
  const protocol = detectProtocol(link);

  if (!protocol) {
    return {
      success: false,
      error: "Unsupported or invalid protocol",
      originalLink: link,
      lineNumber,
    };
  }

  switch (protocol) {
    case "vless":
      return parseVlessLink(link, lineNumber);

    // Future protocol support
    case "vmess":
    case "trojan":
    case "ss":
    case "hy2":
    case "tuic":
      return {
        success: false,
        error: `Protocol "${protocol}" is not yet supported`,
        originalLink: link,
        lineNumber,
      };

    default:
      return {
        success: false,
        error: "Unknown protocol",
        originalLink: link,
        lineNumber,
      };
  }
}

/**
 * Parse multiple proxy links (one per line)
 * Returns BatchParseResult with all successful outbounds and errors
 */
export function parseProxyLinks(text: string): BatchParseResult {
  const lines = text.split("\n").filter((line) => line.trim());

  const outbounds: VlessOutbound[] = [];
  const errors: ParseError[] = [];
  let proxyCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith("#") || line.startsWith("//")) {
      continue;
    }

    const lineNumber = i + 1;
    const result = parseProxyLink(line, lineNumber);

    if (result.success && result.outbound) {
      // If tag is default pattern, replace with sequential counter
      if (result.outbound.tag.startsWith("proxy-p")) {
        result.outbound.tag = `proxy-p${proxyCounter}`;
      }
      outbounds.push(result.outbound);
      proxyCounter++;
    } else {
      errors.push({
        lineNumber,
        link: line.length > 50 ? line.slice(0, 50) + "..." : line,
        error: result.error || "Unknown error",
      });
    }
  }

  return {
    outbounds,
    errors,
    totalLinks: lines.length,
    successCount: outbounds.length,
    errorCount: errors.length,
  };
}

/**
 * Format outbounds array as JSON string
 */
export function formatOutboundsJson(
  outbounds: VlessOutbound[],
  pretty: boolean = true,
): string {
  return JSON.stringify(outbounds, null, pretty ? 2 : 0);
}
