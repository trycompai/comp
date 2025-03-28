import type { User } from "next-auth";
import { createContext } from "react";
import { createStore } from "zustand";

export interface UserProps {
	data: User | null;
}

export interface UserState extends UserProps {
	setUser: (user: User) => void;
}

export const createUserStore = (initProps: UserProps) => {
	return createStore<UserState>()((set) => ({
		data: initProps?.data,
		setUser: (user: User) => set({ data: user }),
	}));
};

export type UserStore = ReturnType<typeof createUserStore>;
export const UserContext = createContext<UserStore | null>(null);
