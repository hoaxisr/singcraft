import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, Download, Copy, Check, RotateCcw } from "lucide-react";
import { useConfigStore } from "@/stores/config";
import { buildConfig } from "@/lib/builder";

export function ResultStep() {
  const { outbounds, endpoints, dnsPreset, inboundPreset, prevStep, setStep, clearOutbounds, clearEndpoints } =
    useConfigStore();
  const [copied, setCopied] = useState(false);

  const config = useMemo(() => {
    return buildConfig({
      outbounds,
      endpoints,
      dnsPreset,
      inboundPreset,
    });
  }, [outbounds, endpoints, dnsPreset, inboundPreset]);

  const configJson = useMemo(() => {
    return JSON.stringify(config, null, 2);
  }, [config]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(configJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = configJson;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [configJson]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([configJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [configJson]);

  const handleReset = useCallback(() => {
    clearOutbounds();
    clearEndpoints();
    setStep(1);
  }, [clearOutbounds, clearEndpoints, setStep]);

  return (
    <div className="terminal-card">
      <div className="terminal-card-title">
        <span className="step-number">3</span>
        результат
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-4 flex-wrap">
        {outbounds.length > 0 && (
          <div className="terminal-badge info">
            {outbounds.length} outbounds
          </div>
        )}
        {endpoints.length > 0 && (
          <div className="terminal-badge info">
            {endpoints.length} endpoints
          </div>
        )}
        <div className="terminal-badge success">
          {dnsPreset} dns
        </div>
        <div className="terminal-badge success">
          {inboundPreset} inbound
        </div>
      </div>

      {/* Result preview */}
      <div className="terminal-result">
        <div className="terminal-result-header">
          <span className="terminal-result-title">config.json</span>
          <div className="terminal-result-actions">
            <button
              className="terminal-btn"
              onClick={handleCopy}
              title="Копировать"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Скопировано" : "Копировать"}
            </button>
            <button
              className="terminal-btn primary"
              onClick={handleDownload}
              title="Скачать"
            >
              <Download size={14} />
              Скачать
            </button>
          </div>
        </div>
        <div className="terminal-result-content">
          <pre>{configJson}</pre>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <button className="terminal-btn" onClick={prevStep}>
          <ArrowLeft size={14} />
          Назад
        </button>
        <button className="terminal-btn" onClick={handleReset}>
          <RotateCcw size={14} />
          Сначала
        </button>
      </div>
    </div>
  );
}
