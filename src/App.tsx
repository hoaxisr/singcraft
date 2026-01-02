import { Wrench } from "lucide-react";
import { useConfigStore } from "@/stores/config";
import { ImportStep } from "@/components/ImportStep";
import { PresetsStep } from "@/components/PresetsStep";
import { ResultStep } from "@/components/ResultStep";

function App() {
  const { step } = useConfigStore();

  return (
    <div className="terminal-mode">
      <div className="terminal-app">
        {/* Header */}
        <header className="terminal-header">
          <div className="terminal-logo">
            <Wrench size={24} className="terminal-logo-icon" />
            <div>
              <div className="terminal-logo-text">SINGCRAFT</div>
              <div className="terminal-logo-sub">sing-box config generator</div>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-1 rounded ${
                  s <= step
                    ? "bg-[var(--terminal-main)]"
                    : "bg-[var(--terminal-bg-secondary)]"
                }`}
              />
            ))}
          </div>
        </header>

        {/* Main content */}
        <main className="terminal-main">
          {step === 1 && <ImportStep />}
          {step === 2 && <PresetsStep />}
          {step === 3 && <ResultStep />}
        </main>

        {/* Footer */}
        <footer className="terminal-footer">
          <a
            href="https://github.com/user/singcraft"
            target="_blank"
            rel="noopener noreferrer"
          >
            github
          </a>
          {" · "}
          <span>serika dark</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
