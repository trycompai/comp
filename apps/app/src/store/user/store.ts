import type { Session } from '@/utils/auth';
import { createContext } from 'react';
import { createStore } from 'zustand';

export interface UserProps {
  data: Session | null;
}

export interface UserState extends UserProps {
  setUser: (user: Session) => void;
}

export const createUserStore = (initProps: UserProps) => {
  return createStore<UserState>()((set) => ({
    data: initProps?.data,
    setUser: (user: Session) => set({ data: user }),
  }));
};

export type UserStore = ReturnType<typeof createUserStore>;
export const UserContext = createContext<UserStore | null>(null);
