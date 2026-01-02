import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DnsPreset } from "@/templates/dns";
import type { InboundPreset } from "@/templates/inbounds";
import type { Outbound, AwgEndpointConfig } from "@/lib/builder";

interface ConfigState {
  // Импортированные outbounds
  outbounds: Outbound[];
  setOutbounds: (outbounds: Outbound[]) => void;
  clearOutbounds: () => void;

  // AWG endpoints (отдельно от outbounds)
  endpoints: AwgEndpointConfig[];
  setEndpoints: (endpoints: AwgEndpointConfig[]) => void;
  clearEndpoints: () => void;

  // Выбранные presets
  dnsPreset: DnsPreset;
  setDnsPreset: (preset: DnsPreset) => void;

  inboundPreset: InboundPreset;
  setInboundPreset: (preset: InboundPreset) => void;

  // Текущий шаг
  step: number;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      outbounds: [],
      setOutbounds: (outbounds) => set({ outbounds }),
      clearOutbounds: () => set({ outbounds: [] }),

      endpoints: [],
      setEndpoints: (endpoints) => set({ endpoints }),
      clearEndpoints: () => set({ endpoints: [] }),

      dnsPreset: "google",
      setDnsPreset: (dnsPreset) => set({ dnsPreset }),

      inboundPreset: "tun",
      setInboundPreset: (inboundPreset) => set({ inboundPreset }),

      step: 1,
      setStep: (step) => set({ step }),
      nextStep: () => set((state) => ({ step: Math.min(state.step + 1, 3) })),
      prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 1) })),
    }),
    {
      name: "singcraft-config",
      partialize: (state) => ({
        dnsPreset: state.dnsPreset,
        inboundPreset: state.inboundPreset,
      }),
    }
  )
);
