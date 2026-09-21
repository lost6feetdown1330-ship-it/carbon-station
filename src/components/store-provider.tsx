import { useEffect } from "react";
import { owns } from "@/lib/catalog";
import { provisionCarbonLine } from "@/lib/line";
import { useFaxStore } from "@/lib/store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const lcd = useFaxStore((s) => s.settings.lcd);
  const paper = useFaxStore((s) => s.settings.paperStock);
  const entitlements = useFaxStore((s) => s.entitlements);

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

  useEffect(() => {
    const studio = owns(entitlements, "studio");
    document.documentElement.dataset.lcd = studio ? lcd || "green" : "green";
    document.documentElement.dataset.paper = studio ? paper || "cream" : "cream";
  }, [entitlements, lcd, paper]);

  return children;
}