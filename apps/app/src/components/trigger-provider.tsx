"use client";

import { TriggerAuthContext } from "@trigger.dev/react-hooks";

export function TriggerProvider({
  accessToken,
  children,
}: {
  accessToken: string;
  children: React.ReactNode;
}) {
  return (
    <TriggerAuthContext.Provider
      value={{
        accessToken,
      }}
    >
      {children}
    </TriggerAuthContext.Provider>
  );
}
