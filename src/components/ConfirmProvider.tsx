"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import CustomModal, { ModalType } from "./CustomModal";

export interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  variant?: ModalType;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  icon?: React.ReactNode;
  maxWidth?: string;
}

export interface AlertOptions {
  title?: string;
  message: React.ReactNode;
  variant?: ModalType;
  type?: ModalType;
  confirmText?: string;
  icon?: React.ReactNode;
  maxWidth?: string;
}

interface ConfirmContextType {
  confirm: (optionsOrMessage: ConfirmOptions | string) => Promise<boolean>;
  alert: (optionsOrMessage: AlertOptions | string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    type: ModalType;
    confirmText: string;
    cancelText: string;
    showCancel: boolean;
    maxWidth?: string;
    icon?: React.ReactNode;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "confirm",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    showCancel: true,
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((optionsOrMessage: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      if (typeof optionsOrMessage === "string") {
        setModalState({
          isOpen: true,
          title: "Confirmação",
          message: optionsOrMessage,
          type: "confirm",
          confirmText: "Confirmar",
          cancelText: "Cancelar",
          showCancel: true,
        });
      } else {
        const type = optionsOrMessage.variant || optionsOrMessage.type || "confirm";
        const defaultConfirmText = (type === "danger" || type === "error") ? "Excluir" : "Confirmar";
        setModalState({
          isOpen: true,
          title: optionsOrMessage.title || (type === "danger" || type === "error" ? "Excluir" : "Confirmação"),
          message: optionsOrMessage.message,
          type,
          confirmText: optionsOrMessage.confirmText || defaultConfirmText,
          cancelText: optionsOrMessage.cancelText || "Cancelar",
          showCancel: true,
          maxWidth: optionsOrMessage.maxWidth,
          icon: optionsOrMessage.icon,
        });
      }
    });
  }, []);

  const alert = useCallback((optionsOrMessage: AlertOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      resolverRef.current = () => resolve();
      if (typeof optionsOrMessage === "string") {
        setModalState({
          isOpen: true,
          title: "Aviso",
          message: optionsOrMessage,
          type: "info",
          confirmText: "OK",
          cancelText: "",
          showCancel: false,
        });
      } else {
        const type = optionsOrMessage.variant || optionsOrMessage.type || "info";
        setModalState({
          isOpen: true,
          title: optionsOrMessage.title || "Aviso",
          message: optionsOrMessage.message,
          type,
          confirmText: optionsOrMessage.confirmText || "OK",
          cancelText: "",
          showCancel: false,
          maxWidth: optionsOrMessage.maxWidth,
          icon: optionsOrMessage.icon,
        });
      }
    });
  }, []);

  const handleClose = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  const handleConfirm = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      <CustomModal
        isOpen={modalState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
        icon={modalState.icon}
        maxWidth={modalState.maxWidth}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
