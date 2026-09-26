import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ModalType = 'success' | 'error' | 'warning' | 'info';

interface ModalOptions {
  title?: string;
  message: string;
  type?: ModalType;
  isConfirm?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  resolve?: (value: boolean) => void;
}

interface ModalContextType {
  showAlert: (message: string, type?: ModalType, title?: string) => Promise<boolean>;
  showConfirm: (message: string, title?: string, confirmText?: string, cancelText?: string) => Promise<boolean>;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

// Helper function to auto-detect notification type based on message text
function autoDetectType(message: string): ModalType {
  const lower = message.toLowerCase();
  if (
    lower.includes('success') ||
    lower.includes('accepted') ||
    lower.includes('approved') ||
    lower.includes('created') ||
    lower.includes('submitted') ||
    lower.includes('sent') ||
    lower.includes('updated') ||
    lower.includes('verified')
  ) {
    return 'success';
  }
  if (
    lower.includes('failed') ||
    lower.includes('error') ||
    lower.includes('denied') ||
    lower.includes('rejected') ||
    lower.includes('invalid') ||
    lower.includes('cannot') ||
    lower.includes('unable')
  ) {
    return 'error';
  }
  if (
    lower.includes('warning') ||
    lower.includes('sure') ||
    lower.includes('confirm') ||
    lower.includes('delete') ||
    lower.includes('remove') ||
    lower.includes('cancel')
  ) {
    return 'warning';
  }
  return 'info';
}

function getDefaultTitle(type: ModalType, isConfirm: boolean): string {
  if (isConfirm) return 'Confirmation Required';
  switch (type) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Notice';
    case 'warning':
      return 'Warning';
    default:
      return 'Notification';
  }
}

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<ModalOptions | null>(null);

  const closeModal = useCallback(() => {
    if (modal?.resolve) {
      modal.resolve(false);
    }
    setModal(null);
  }, [modal]);

  const handleConfirm = useCallback(() => {
    if (modal?.onConfirm) modal.onConfirm();
    if (modal?.resolve) modal.resolve(true);
    setModal(null);
  }, [modal]);

  const handleCancel = useCallback(() => {
    if (modal?.onCancel) modal.onCancel();
    if (modal?.resolve) modal.resolve(false);
    setModal(null);
  }, [modal]);

  const showAlert = useCallback((message: string, type?: ModalType, title?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const detectedType = type || autoDetectType(message);
      setModal({
        message,
        type: detectedType,
        title: title || getDefaultTitle(detectedType, false),
        isConfirm: false,
        resolve
      });
    });
  }, []);

  const showConfirm = useCallback(
    (message: string, title?: string, confirmText?: string, cancelText?: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const detectedType = autoDetectType(message);
        setModal({
          message,
          type: detectedType === 'success' ? 'warning' : detectedType,
          title: title || 'Confirmation Required',
          isConfirm: true,
          confirmText: confirmText || 'Confirm',
          cancelText: cancelText || 'Cancel',
          resolve
        });
      });
    },
    []
  );

  // Global override for native window.alert and window.confirm
  useEffect(() => {
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    window.alert = (msg?: any) => {
      const messageStr = typeof msg === 'object' ? JSON.stringify(msg) : String(msg || '');
      showAlert(messageStr);
    };

    window.confirm = (msg?: any) => {
      const messageStr = typeof msg === 'object' ? JSON.stringify(msg) : String(msg || '');
      showAlert(messageStr, 'warning', 'Confirmation Required');
      return true; // prevent blocking native call
    };

    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, [showAlert]);

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, closeModal }}>
      {children}

      {/* Global Responsive Centered Custom Modal UI */}
      {modal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm transition-all duration-200 animate-in fade-in">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-7 relative overflow-hidden transform transition-all duration-200 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              {/* Icon Badge */}
              <div className="shrink-0">
                {modal.type === 'success' && (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                )}
                {modal.type === 'error' && (
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                )}
                {modal.type === 'warning' && (
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                )}
                {modal.type === 'info' && (
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                    <Info className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Title & Message Content */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  {modal.title}
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed break-words">
                  {modal.message}
                </p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              {modal.isConfirm ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition"
                  >
                    {modal.cancelText || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-500/20 transition active:scale-[0.99]"
                  >
                    {modal.confirmText || 'Confirm'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="w-full py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-500/20 transition active:scale-[0.99]"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
