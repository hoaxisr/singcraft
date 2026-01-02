import { useState, useCallback, useRef } from "react";
import { Upload, FileText } from "lucide-react";
import { useConfigStore } from "@/stores/config";
import { parseVlessLinks } from "@/lib/parsers/vless";
import { parseAmneziaConfig } from "@/lib/parsers/amnezia";
import { parseAwgConfig } from "@/lib/parsers/awg";
import type { Outbound, AwgEndpointConfig } from "@/lib/builder";

type ImportMode = "vless" | "amnezia" | "awg";

export function ImportStep() {
  const { outbounds, setOutbounds, endpoints, setEndpoints, nextStep } = useConfigStore();
  const [mode, setMode] = useState<ImportMode>("vless");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParse = useCallback(() => {
    setError(null);

    if (!input.trim()) {
      setError("Введите данные для импорта");
      return;
    }

    try {
      switch (mode) {
        case "vless": {
          const result = parseVlessLinks(input);
          if (result.outbounds.length === 0) {
            const errorMessages = result.errors.map(e => `Строка ${e.lineNumber}: ${e.error}`);
            setError(errorMessages.join("\n") || "Не найдено валидных VLESS ссылок");
            return;
          }
          // Convert VlessOutbound to Outbound
          const converted: Outbound[] = result.outbounds.map(o => ({
            type: o.type,
            tag: o.tag,
            server: o.server,
            server_port: o.server_port,
            uuid: o.uuid,
            ...(o.flow && { flow: o.flow }),
            ...(o.tls && { tls: o.tls }),
            ...(o.transport && { transport: o.transport }),
          }));
          // Clear endpoints and set outbounds
          setEndpoints([]);
          setOutbounds(converted);
          break;
        }
        case "amnezia": {
          const result = parseAmneziaConfig(input);
          if (result.outbounds.length === 0) {
            setError(result.errors.join("\n") || "Не найдено валидных outbounds");
            return;
          }
          const converted: Outbound[] = result.outbounds.map(o => ({
            type: o.type,
            tag: o.tag,
            server: o.server,
            server_port: o.server_port,
            uuid: o.uuid,
            ...(o.flow && { flow: o.flow }),
            ...(o.tls && { tls: o.tls }),
            ...(o.transport && { transport: o.transport }),
          }));
          // Clear endpoints and set outbounds
          setEndpoints([]);
          setOutbounds(converted);
          break;
        }
        case "awg": {
          const result = parseAwgConfig(input);
          if (!result.success || !result.endpoint) {
            setError(result.errors?.join("\n") || "Ошибка парсинга AWG конфига");
            return;
          }
          // AWG returns a single endpoint - store in endpoints, not outbounds
          const ep = result.endpoint;
          const awgEndpoint: AwgEndpointConfig = {
            type: "awg",
            tag: ep.tag,
            private_key: ep.private_key,
            address: ep.address,
            peers: ep.peers,
            ...(ep.useIntegratedTun !== undefined && { useIntegratedTun: ep.useIntegratedTun }),
            ...(ep.mtu !== undefined && { mtu: ep.mtu }),
            ...(ep.listen_port !== undefined && { listen_port: ep.listen_port }),
            // AWG 1.0 obfuscation
            ...(ep.jc !== undefined && { jc: ep.jc }),
            ...(ep.jmin !== undefined && { jmin: ep.jmin }),
            ...(ep.jmax !== undefined && { jmax: ep.jmax }),
            ...(ep.s1 !== undefined && { s1: ep.s1 }),
            ...(ep.s2 !== undefined && { s2: ep.s2 }),
            ...(ep.s3 !== undefined && { s3: ep.s3 }),
            ...(ep.s4 !== undefined && { s4: ep.s4 }),
            ...(ep.h1 && { h1: ep.h1 }),
            ...(ep.h2 && { h2: ep.h2 }),
            ...(ep.h3 && { h3: ep.h3 }),
            ...(ep.h4 && { h4: ep.h4 }),
            // AWG 2.0 init packet
            ...(ep.i1 && { i1: ep.i1 }),
            ...(ep.i2 && { i2: ep.i2 }),
            ...(ep.i3 && { i3: ep.i3 }),
            ...(ep.i4 && { i4: ep.i4 }),
            ...(ep.i5 && { i5: ep.i5 }),
          };
          // Clear regular outbounds and set endpoints
          setOutbounds([]);
          setEndpoints([awgEndpoint]);
          break;
        }
      }
      nextStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка парсинга");
    }
  }, [input, mode, setOutbounds, nextStep]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setInput(content);
      };
      reader.readAsText(file);
    },
    []
  );

  const modes: { id: ImportMode; label: string }[] = [
    { id: "vless", label: "VLESS ссылки" },
    { id: "amnezia", label: "AmneziaVPN" },
    { id: "awg", label: "AmneziaWG" },
  ];

  const placeholders: Record<ImportMode, string> = {
    vless: "vless://uuid@server:port?...\nvless://uuid@server2:port?...",
    amnezia: '{\n  "outbounds": [...]\n}',
    awg: "[Interface]\nPrivateKey = ...\n\n[Peer]\nPublicKey = ...",
  };

  return (
    <div className="terminal-card">
      <div className="terminal-card-title">
        <span className="step-number">1</span>
        импорт
      </div>

      {/* Mode tabs */}
      <div className="terminal-tabs">
        {modes.map((m) => (
          <button
            key={m.id}
            className={`terminal-tab ${mode === m.id ? "active" : ""}`}
            onClick={() => {
              setMode(m.id);
              setError(null);
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        className="terminal-textarea"
        placeholder={placeholders[mode]}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={8}
      />

      {/* File upload */}
      <div className="flex items-center justify-between mt-4">
        <div className="terminal-file-input">
          <input
            ref={fileInputRef}
            type="file"
            accept={mode === "awg" ? ".conf" : ".json,.txt"}
            onChange={handleFileUpload}
          />
          <label
            className="terminal-file-label"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} />
            Загрузить файл
          </label>
        </div>

        <button
          className="terminal-btn primary"
          onClick={handleParse}
          disabled={!input.trim()}
        >
          <FileText size={14} />
          Парсить
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded bg-[rgba(202,71,84,0.1)] text-[var(--terminal-error)] text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}

      {/* Parsed outbounds/endpoints preview */}
      {(outbounds.length > 0 || endpoints.length > 0) && (
        <div className="terminal-outbounds">
          <div className="text-xs text-[var(--terminal-text-dim)] mb-2">
            Найдено: {outbounds.length + endpoints.length}
          </div>
          {outbounds.slice(0, 5).map((o, i) => (
            <div key={`out-${i}`} className="terminal-outbound">
              <span className="terminal-outbound-name">{o.tag}</span>
              <span className="terminal-outbound-type">{o.type}</span>
            </div>
          ))}
          {endpoints.slice(0, 5).map((ep, i) => (
            <div key={`ep-${i}`} className="terminal-outbound">
              <span className="terminal-outbound-name">{ep.tag}</span>
              <span className="terminal-outbound-type">{ep.type}</span>
            </div>
          ))}
          {(outbounds.length + endpoints.length) > 5 && (
            <div className="text-xs text-[var(--terminal-text-dimmer)] text-center py-2">
              ... и ещё {(outbounds.length + endpoints.length) - 5}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
