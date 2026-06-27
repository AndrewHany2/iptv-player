import { createContext, useContext, useMemo } from "react";
import { detectPlatform, getPlatformConfig } from "./configs/detectPlatform";

const PlatformContext = createContext(null);

export function PlatformProvider({ children }) {
  const value = useMemo(() => {
    const platform = detectPlatform();
    const config = getPlatformConfig(platform);
    return { platform, config, isTV: platform === "tv" };
  }, []);

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider");
  return ctx;
}

export function usePlatformConfig() {
  return usePlatform().config;
}
