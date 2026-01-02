import { ArrowLeft, ArrowRight } from "lucide-react";
import { useConfigStore } from "@/stores/config";
import { dnsPresets } from "@/templates/dns";
import { inboundPresets } from "@/templates/inbounds";
import type { DnsPreset } from "@/templates/dns";
import type { InboundPreset } from "@/templates/inbounds";

export function PresetsStep() {
  const {
    dnsPreset,
    setDnsPreset,
    inboundPreset,
    setInboundPreset,
    prevStep,
    nextStep,
    outbounds,
  } = useConfigStore();

  const dnsOptions = Object.entries(dnsPresets) as [DnsPreset, typeof dnsPresets[DnsPreset]][];
  const inboundOptions = Object.entries(inboundPresets) as [InboundPreset, typeof inboundPresets[InboundPreset]][];

  return (
    <div className="terminal-card">
      <div className="terminal-card-title">
        <span className="step-number">2</span>
        настройки
      </div>

      {/* DNS presets */}
      <div className="mb-6">
        <div className="text-xs text-[var(--terminal-text-dim)] mb-3 uppercase tracking-wider">
          DNS
        </div>
        <div className="terminal-radio-group">
          {dnsOptions.map(([key, preset]) => (
            <div
              key={key}
              className={`terminal-radio ${dnsPreset === key ? "selected" : ""}`}
              onClick={() => setDnsPreset(key)}
            >
              <div className="terminal-radio-dot" />
              <div>
                <div className="terminal-radio-label">{preset.label}</div>
                <div className="terminal-radio-desc">{preset.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inbound presets */}
      <div className="mb-6">
        <div className="text-xs text-[var(--terminal-text-dim)] mb-3 uppercase tracking-wider">
          Inbounds
        </div>
        <div className="terminal-radio-group">
          {inboundOptions.map(([key, preset]) => (
            <div
              key={key}
              className={`terminal-radio ${inboundPreset === key ? "selected" : ""}`}
              onClick={() => setInboundPreset(key)}
            >
              <div className="terminal-radio-dot" />
              <div>
                <div className="terminal-radio-label">{preset.label}</div>
                <div className="terminal-radio-desc">{preset.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outbounds summary */}
      <div className="mb-6 p-3 rounded bg-[var(--terminal-bg-tertiary)]">
        <div className="text-xs text-[var(--terminal-text-dim)]">
          Outbounds: <span className="text-[var(--terminal-main)]">{outbounds.length}</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button className="terminal-btn" onClick={prevStep}>
          <ArrowLeft size={14} />
          Назад
        </button>
        <button className="terminal-btn primary" onClick={nextStep}>
          Далее
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
