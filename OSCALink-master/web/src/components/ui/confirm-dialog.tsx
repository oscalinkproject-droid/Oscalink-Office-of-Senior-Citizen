'use client';

import { useState, useCallback, ReactElement } from 'react';
import { m, AnimatePresence } from "framer-motion";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20',
    default: 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
        >
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" as const }}
            className="bg-surface-low border border-outline-variant/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-surface-high flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-foreground">help</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{title}</h3>
                <p className="text-sm text-outline mt-1">{description}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <m.button
                onClick={onCancel}
                className="px-4 py-2 text-xs font-bold text-outline hover:text-foreground hover:bg-surface-high rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {cancelLabel}
              </m.button>
              <m.button
                onClick={onConfirm}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors ${variantStyles[variant]}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {confirmLabel}
              </m.button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm?: () => void;
}

interface UseConfirmDialogReturn {
  ConfirmDialog: ReactElement;
  confirm: (options: Omit<ConfirmDialogState, 'isOpen'>) => Promise<boolean>;
}

export function useConfirmDialog(): UseConfirmDialogReturn {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'default',
  });

  const confirm = useCallback((options: Omit<ConfirmDialogState, 'isOpen'>): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        ...options,
        onConfirm: () => {
          resolve(true);
          setState((prev) => ({ ...prev, isOpen: false }));
        },
      });
    });
  }, []);

  const handleCancel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const dialog = (
    <ConfirmDialog
      isOpen={state.isOpen}
      title={state.title}
      description={state.description}
      variant={state.variant}
      onConfirm={state.onConfirm || (() => {})}
      onCancel={handleCancel}
    />
  );

  return { ConfirmDialog: dialog, confirm };
}
