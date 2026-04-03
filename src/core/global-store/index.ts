import { type TUser } from "@/core/types";
import { create } from "zustand";

type TConfirmConfig = {
  title?: string;
  message?: string;
  onConfirm: () => Promise<void> | void;
  onCancel?: (() => void) | null;
};

const defaultConfirmConfig: TConfirmConfig = {
  onConfirm: () => {},
  title: "Confirm Action",
  message: "Are you sure you want to proceed with this action?",
  onCancel: null,
};

type TState = {
  user: TUser | undefined | null;
  headerTitle: string;
  confirmDialogOpen: boolean;
  confirmConfig: TConfirmConfig;
  themeUpdated: number;
  theme: string;
};

type TActions = {
  setUser: (user: TUser | undefined | null) => void;
  setHeaderTitle: (title?: string) => void;
  confirm: (config: TConfirmConfig) => void;
  closeConfirm: () => void;
  setThemeUpdated: (value: number) => void;
  setTheme: (theme: string) => void;
};
export type TGlobalStore = TState & TActions;

const initialState: TState = {
  user: undefined,
  headerTitle: "",
  confirmDialogOpen: false,
  confirmConfig: defaultConfirmConfig,
  themeUpdated: 0,
  theme:
    localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"),
};

export const useGlobalStore = create<TGlobalStore>((set) => ({
  ...initialState,
  setUser: (user) => set({ user }),
  setHeaderTitle: (title = "") => set({ headerTitle: title }),
  confirm: (config) =>
    set({
      confirmDialogOpen: true,
      confirmConfig: {
        ...defaultConfirmConfig,
        ...config,
      },
    }),
  closeConfirm: () =>
    set({
      confirmDialogOpen: false,
      confirmConfig: defaultConfirmConfig,
    }),
  setThemeUpdated: (value) => set({ themeUpdated: value }),
  setTheme: (theme) => set({ theme }),
}));
