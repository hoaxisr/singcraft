/**
 * TypeScript types for sing-box VLESS outbound configuration
 * Based on sing-box documentation: https://sing-box.sagernet.org/configuration/outbound/vless/
 */

// Transport types
export type TransportType = "tcp" | "ws" | "grpc" | "http" | "quic";

// Security types
export type SecurityType = "none" | "tls" | "reality";

// TLS fingerprint options
export type TlsFingerprint =
  | "chrome"
  | "firefox"
  | "edge"
  | "safari"
  | "360"
  | "qq"
  | "ios"
  | "android"
  | "random"
  | "randomized";

// ALPN protocols
export type AlpnProtocol = "h2" | "http/1.1" | "h3";

// WebSocket transport configuration
export interface WsTransport {
  type: "ws";
  path?: string;
  headers?: Record<string, string>;
  max_early_data?: number;
  early_data_header_name?: string;
}

// gRPC transport configuration
export interface GrpcTransport {
  type: "grpc";
  service_name?: string;
  idle_timeout?: string;
  ping_timeout?: string;
  permit_without_stream?: boolean;
}

// HTTP transport configuration
export interface HttpTransport {
  type: "http";
  host?: string[];
  path?: string;
  method?: string;
  headers?: Record<string, string>;
  idle_timeout?: string;
  ping_timeout?: string;
}

// QUIC transport configuration
export interface QuicTransport {
  type: "quic";
}

// TCP transport (no additional config needed)
export interface TcpTransport {
  type: "tcp";
}

// Union type for all transports
export type Transport =
  | TcpTransport
  | WsTransport
  | GrpcTransport
  | HttpTransport
  | QuicTransport;

// uTLS configuration
export interface UtlsConfig {
  enabled: boolean;
  fingerprint: TlsFingerprint;
}

// Reality configuration
export interface RealityConfig {
  enabled: boolean;
  public_key: string;
  short_id?: string;
}

// TLS configuration
export interface TlsConfig {
  enabled: boolean;
  server_name?: string;
  insecure?: boolean;
  alpn?: AlpnProtocol[];
  utls?: UtlsConfig;
  reality?: RealityConfig;
}

// VLESS outbound configuration for sing-box
export interface VlessOutbound {
  type: "vless";
  tag: string;
  server: string;
  server_port: number;
  uuid: string;
  flow?: string;
  tls?: TlsConfig;
  transport?: Transport;
}

// Parser result with potential errors
export interface ParseResult {
  success: boolean;
  outbound?: VlessOutbound;
  error?: string;
  originalLink: string;
  lineNumber: number;
}

// Batch parse result
export interface BatchParseResult {
  outbounds: VlessOutbound[];
  errors: ParseError[];
  totalLinks: number;
  successCount: number;
  errorCount: number;
}

// Parse error details
export interface ParseError {
  lineNumber: number;
  link: string;
  error: string;
}
