import { useRef } from "react";
import { ZenToast } from "./components/feedback/ZenToast";
import { FlipCard } from "./components/layout/FlipCard";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { WorkArea } from "./components/zenreply/WorkArea";
import { AppProvider } from "./contexts/AppProvider";
import { useZenReplyContext } from "./contexts/ZenReplyContext";
import { useSettingsContext } from "./contexts/SettingsContext";
import { AppShortcuts } from "./AppShortcuts";

function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

function AppInner() {
  const panelRef = useRef<HTMLElement | null>(null);
  const { isAwake, panelAnimateKey } = useZenReplyContext();
  const { isSettingsOpen } = useSettingsContext();

  return (
    <>
      <AppShortcuts />

      {isAwake ? (
        <FlipCard
          isFlipped={isSettingsOpen}
          panelRef={panelRef}
          panelAnimateKey={panelAnimateKey}
          front={<WorkArea />}
          back={<SettingsPanel />}
        />
      ) : null}

      <ZenToast />
    </>
  );
}

export default App;
