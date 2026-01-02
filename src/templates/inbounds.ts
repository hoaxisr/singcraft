export type InboundPreset = "tun" | "mixed" | "full";

export interface InboundConfig {
  type: string;
  tag: string;
  address?: string[];
  auto_route?: boolean;
  strict_route?: boolean;
  stack?: string;
  listen?: string;
  listen_port?: number;
}

export const inboundPresets: Record<InboundPreset, { label: string; desc: string; config: InboundConfig[] }> = {
  tun: {
    label: "TUN",
    desc: "Системный VPN - весь трафик через sing-box",
    config: [
      {
        type: "tun",
        tag: "tun-in",
        address: ["172.19.0.1/30", "fdfe:dcba:9876::1/126"],
        auto_route: true,
        strict_route: true,
        stack: "system",
      },
    ],
  },
  mixed: {
    label: "Mixed",
    desc: "Локальный прокси на порту 7890",
    config: [
      {
        type: "mixed",
        tag: "mixed-in",
        listen: "127.0.0.1",
        listen_port: 7890,
      },
    ],
  },
  full: {
    label: "Full",
    desc: "TUN + локальный прокси",
    config: [
      {
        type: "tun",
        tag: "tun-in",
        address: ["172.19.0.1/30", "fdfe:dcba:9876::1/126"],
        auto_route: true,
        strict_route: true,
        stack: "system",
      },
      {
        type: "mixed",
        tag: "mixed-in",
        listen: "127.0.0.1",
        listen_port: 7890,
      },
    ],
  },
};
