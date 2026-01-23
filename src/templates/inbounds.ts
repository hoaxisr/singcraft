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
    desc: "Системный интерфейс tun0 для HR/Magitrickle",
    config: [
      {
        type: "tun",
        tag: "tun-in",
        address: ["172.19.0.1/30", "fdfe:dcba:9876::1/126"],
        stack: "system",
      },
    ],
  },
  mixed: {
    label: "Mixed",
    desc: "Встроенный механизм Keenetic (Proxy клиент)",
    config: [
      {
        type: "mixed",
        tag: "mixed-in",
        listen: "0.0.0.0",
        listen_port: 7890,
      },
    ],
  },
  full: {
    label: "Full",
    desc: "Оба режима одновременно",
    config: [
      {
        type: "tun",
        tag: "tun-in",
        address: ["172.19.0.1/30", "fdfe:dcba:9876::1/126"],
        stack: "system",
      },
      {
        type: "mixed",
        tag: "mixed-in",
        listen: "0.0.0.0",
        listen_port: 7890,
      },
    ],
  },
};
