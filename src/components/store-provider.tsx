import { useEffect } from "react";
import { provisionCarbonLine } from "@/lib/line";
import { useFaxStore } from "@/lib/store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await useFaxStore.persist.rehydrate();
      if (cancelled) return;
      const state = useFaxStore.getState();
      if (!state.settings.ownNumber) {
        state.updateSettings({ ownNumber: provisionCarbonLine() });
      }
      state.markHydrated();
      void state.seedIfNeeded();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return children;
}
