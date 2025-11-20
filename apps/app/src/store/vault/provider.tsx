"use client";

import { useEffect } from "react";

import type { VaultProps } from "./store";
import { createVaultStore, VaultContext } from "./store";

type VaultProviderProps = React.PropsWithChildren<VaultProps>;

export function VaultProvider({ children, data }: VaultProviderProps) {
  const store = createVaultStore({ data });

  useEffect(() => {
    store.setState({ data });
  }, [data, store]);

  return (
    <VaultContext.Provider value={store}>{children}</VaultContext.Provider>
  );
}
