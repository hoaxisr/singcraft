/**
 * AmneziaWG .conf file parser
 * Converts WireGuard/AmneziaWG config format to sing-box endpoint format
 *
 * Input format (.conf):
 * [Interface]
 * PrivateKey = base64...
 * Address = 10.0.0.2/32, fd00::2/128
 * DNS = 1.1.1.1
 * MTU = 1280
 * Jc = 4
 * Jmin = 40
 * Jmax = 70
 * S1 = 0
 * S2 = 0
 * H1 = 1234567890
 * H2 = 0987654321
 * H3 = 1122334455
 * H4 = 5544332211
 * I1 = <base64 data>  (AWG 2.0 optional)
 *
 * [Peer]
 * PublicKey = base64...
 * PresharedKey = base64... (optional)
 * AllowedIPs = 0.0.0.0/0, ::/0
 * Endpoint = server:port
 * PersistentKeepalive = 25
 *
 * Output format (sing-box endpoint):
 * {
 *   "type": "awg",
 *   "tag": "awg-endpoint",
 *   "private_key": "...",
 *   "address": ["10.0.0.2/32"],
 *   "peers": [{ "address": "...", "port": 51820, ... }],
 *   "jc": 4, "jmin": 40, "jmax": 70, ...
 * }
 */

// AWG Peer configuration
export interface AwgPeer {
  address: string;
  port: number;
  public_key: string;
  preshared_key?: string;
  allowed_ips: string[];
  persistent_keepalive_interval?: number;
}

// AWG Endpoint configuration (sing-box format)
export interface AwgEndpoint {
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

  peers: AwgPeer[];
}

export interface AwgParseResult {
  success: boolean;
  endpoint?: AwgEndpoint;
  errors: string[];
}

interface ParsedSection {
  [key: string]: string;
}

/**
 * Parse a single line of key = value format
 */
function parseLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();

  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
    return null;
  }

  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) return null;

  const key = trimmed.slice(0, eqIndex).trim();
  let value = trimmed.slice(eqIndex + 1).trim();

  // Handle special case for I1-I5 which can have <...> format
  if (value.startsWith("<") && value.includes(">")) {
    // Extract content between < and >
    const match = value.match(/<([^>]+)>/);
    if (match) {
      value = match[1].trim();
    }
  }

  return { key, value };
}

/**
 * Parse sections from .conf content
 */
function parseSections(content: string): { interface: ParsedSection; peers: ParsedSection[] } {
  // Remove BOM if present and normalize line endings
  const cleanContent = content.replace(/^\ufeff/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanContent.split("\n");
  const result = {
    interface: {} as ParsedSection,
    peers: [] as ParsedSection[],
  };

  let currentSection: "none" | "interface" | "peer" = "none";
  let currentPeer: ParsedSection = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Section headers
    if (trimmed.toLowerCase() === "[interface]") {
      currentSection = "interface";
      continue;
    }

    if (trimmed.toLowerCase() === "[peer]") {
      // Save previous peer if exists
      if (currentSection === "peer" && Object.keys(currentPeer).length > 0) {
        result.peers.push(currentPeer);
      }
      currentSection = "peer";
      currentPeer = {};
      continue;
    }

    // Parse key-value pairs
    const parsed = parseLine(trimmed);
    if (!parsed) continue;

    const { key, value } = parsed;
    const keyLower = key.toLowerCase();

    if (currentSection === "interface") {
      result.interface[keyLower] = value;
    } else if (currentSection === "peer") {
      currentPeer[keyLower] = value;
    }
  }

  // Don't forget the last peer
  if (currentSection === "peer" && Object.keys(currentPeer).length > 0) {
    result.peers.push(currentPeer);
  }

  return result;
}

/**
 * Parse endpoint from Endpoint = host:port format
 */
function parseEndpoint(endpoint: string): { address: string; port: number } | null {
  // Handle IPv6 addresses like [::1]:port
  const ipv6Match = endpoint.match(/^\[([^\]]+)\]:(\d+)$/);
  if (ipv6Match) {
    return {
      address: ipv6Match[1],
      port: parseInt(ipv6Match[2], 10),
    };
  }

  // Handle regular host:port
  const lastColon = endpoint.lastIndexOf(":");
  if (lastColon === -1) return null;

  const address = endpoint.slice(0, lastColon);
  const port = parseInt(endpoint.slice(lastColon + 1), 10);

  if (isNaN(port)) return null;

  return { address, port };
}

/**
 * Parse comma-separated list (for Address, AllowedIPs, etc.)
 */

/**
 * Normalizes an IP address by adding subnet mask if missing
 * IPv4 gets /32, IPv6 gets /128
 */
function normalizeAddress(addr: string): string {
  const trimmed = addr.trim();
  // Already has a mask
  if (trimmed.includes("/")) {
    return trimmed;
  }
  // IPv6 (contains colons)
  if (trimmed.includes(":")) {
    return `${trimmed}/128`;
  }
  // IPv4
  return `${trimmed}/32`;
}

function parseCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Parse AWG .conf file and convert to sing-box endpoint format
 */
export function parseAwgConfig(confContent: string): AwgParseResult {
  const errors: string[] = [];

  // Parse sections
  const sections = parseSections(confContent);

  // Validate Interface section
  if (Object.keys(sections.interface).length === 0) {
    return {
      success: false,
      errors: ["No [Interface] section found"],
    };
  }

  const iface = sections.interface;

  // Required field: PrivateKey
  if (!iface.privatekey) {
    return {
      success: false,
      errors: ["PrivateKey is required in [Interface] section"],
    };
  }

  // Validate Peers
  if (sections.peers.length === 0) {
    return {
      success: false,
      errors: ["No [Peer] section found"],
    };
  }

  // Build endpoint
  const endpoint: AwgEndpoint = {
    type: "awg",
    tag: "awg-endpoint",
    useIntegratedTun: false,
    private_key: iface.privatekey,
    address: [],
    peers: [],
  };

  // Parse Address (can be commented out with //)
  // Normalize addresses: add /32 for IPv4, /128 for IPv6 if mask is missing
  if (iface.address) {
    endpoint.address = parseCommaSeparated(iface.address).map(normalizeAddress);
  }

  // Parse MTU
  if (iface.mtu) {
    const mtu = parseInt(iface.mtu, 10);
    if (!isNaN(mtu)) {
      endpoint.mtu = mtu;
    }
  }

  // Parse ListenPort
  if (iface.listenport) {
    const port = parseInt(iface.listenport, 10);
    if (!isNaN(port)) {
      endpoint.listen_port = port;
    }
  }

  // Parse AWG obfuscation parameters
  // Jc, Jmin, Jmax (jitter)
  if (iface.jc) {
    const jc = parseInt(iface.jc, 10);
    if (!isNaN(jc)) endpoint.jc = jc;
  }
  if (iface.jmin) {
    const jmin = parseInt(iface.jmin, 10);
    if (!isNaN(jmin)) endpoint.jmin = jmin;
  }
  if (iface.jmax) {
    const jmax = parseInt(iface.jmax, 10);
    if (!isNaN(jmax)) endpoint.jmax = jmax;
  }

  // S1, S2 (packet size)
  if (iface.s1) {
    const s1 = parseInt(iface.s1, 10);
    if (!isNaN(s1)) endpoint.s1 = s1;
  }
  if (iface.s2) {
    const s2 = parseInt(iface.s2, 10);
    if (!isNaN(s2)) endpoint.s2 = s2;
  }
  if (iface.s3) {
    const s3 = parseInt(iface.s3, 10);
    if (!isNaN(s3)) endpoint.s3 = s3;
  }
  if (iface.s4) {
    const s4 = parseInt(iface.s4, 10);
    if (!isNaN(s4)) endpoint.s4 = s4;
  }

  // H1-H4 (header obfuscation)
  if (iface.h1) endpoint.h1 = iface.h1;
  if (iface.h2) endpoint.h2 = iface.h2;
  if (iface.h3) endpoint.h3 = iface.h3;
  if (iface.h4) endpoint.h4 = iface.h4;

  // I1-I5 (AWG 2.0 init packet - optional)
  if (iface.i1) endpoint.i1 = iface.i1;
  if (iface.i2) endpoint.i2 = iface.i2;
  if (iface.i3) endpoint.i3 = iface.i3;
  if (iface.i4) endpoint.i4 = iface.i4;
  if (iface.i5) endpoint.i5 = iface.i5;

  // Parse Peers
  for (let i = 0; i < sections.peers.length; i++) {
    const peerData = sections.peers[i];

    // Required: PublicKey
    if (!peerData.publickey) {
      errors.push(`Peer ${i + 1}: PublicKey is required`);
      continue;
    }

    // Required: Endpoint
    if (!peerData.endpoint) {
      errors.push(`Peer ${i + 1}: Endpoint is required`);
      continue;
    }

    const parsedEndpoint = parseEndpoint(peerData.endpoint);
    if (!parsedEndpoint) {
      errors.push(`Peer ${i + 1}: Invalid Endpoint format`);
      continue;
    }

    const peer: AwgPeer = {
      address: parsedEndpoint.address,
      port: parsedEndpoint.port,
      public_key: peerData.publickey,
      allowed_ips: [],
    };

    // PresharedKey (optional)
    if (peerData.presharedkey) {
      peer.preshared_key = peerData.presharedkey;
    }

    // AllowedIPs
    if (peerData.allowedips) {
      peer.allowed_ips = parseCommaSeparated(peerData.allowedips);
    }

    // PersistentKeepalive
    if (peerData.persistentkeepalive) {
      const keepalive = parseInt(peerData.persistentkeepalive, 10);
      if (!isNaN(keepalive)) {
        peer.persistent_keepalive_interval = keepalive;
      }
    }

    endpoint.peers.push(peer);
  }

  // Check if we have at least one valid peer
  if (endpoint.peers.length === 0) {
    return {
      success: false,
      errors: errors.length > 0 ? errors : ["No valid peers found"],
    };
  }

  return {
    success: true,
    endpoint,
    errors,
  };
}

/**
 * Format AWG endpoint as JSON string wrapped in endpoints array
 */
export function formatAwgEndpointJson(endpoint: AwgEndpoint, pretty: boolean = true): string {
  const wrapper = {
    endpoints: [endpoint],
  };
  return JSON.stringify(wrapper, null, pretty ? 2 : 0);
}
