"use client";

import { useEffect } from "react";

import type { UserProps } from "./store";
import { createUserStore, UserContext } from "./store";

type UserProviderProps = React.PropsWithChildren<UserProps>;

export function UserProvider({ children, data }: UserProviderProps) {
  const store = createUserStore({ data });

  useEffect(() => {
    if (data) {
      store.setState({ data });
    }
  }, [data, store]);

  return <UserContext.Provider value={store}>{children}</UserContext.Provider>;
}
