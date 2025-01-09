import { create } from "zustand";

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  showAlert: (params: {
    title: string;
    message: string;
    onConfirm: () => void;
  }) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  title: "",
  message: "",
  onConfirm: () => {},
  showAlert: ({ title, message, onConfirm }) =>
    set({ visible: true, title, message, onConfirm }),
  hideAlert: () => set({ visible: false }),
}));
