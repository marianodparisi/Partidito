import React, { useEffect, useState } from 'react';

export interface ModalConfig {
  isOpen: boolean;
  type: 'confirm' | 'alert' | 'success';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalProps extends Omit<ModalConfig, 'isOpen'> {
  isOpen: boolean;
  onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  type,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  onClose
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setVisible(false), 200);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'confirm':
        return (
          <div className="w-12 h-12 bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500 text-2xl">delete</span>
          </div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[var(--primary)] text-2xl">check_circle</span>
          </div>
        );
      case 'alert':
      default:
        return (
          <div className="w-12 h-12 bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-yellow-500 text-2xl">warning</span>
          </div>
        );
    }
  };

  const getConfirmClasses = () => {
    switch (type) {
      case 'confirm':
        return 'bg-red-600 hover:bg-red-500 text-white';
      case 'success':
        return 'bg-[var(--primary)] hover:brightness-110 text-black font-black';
      case 'alert':
      default:
        return 'bg-[var(--primary)] hover:brightness-110 text-black font-black';
    }
  };

  return (
    <div className={`relative z-50 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200`}>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={handleCancel}
      />

      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className={`relative transform overflow-hidden glass-card text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} duration-200`}>

            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                {getIcon()}
                <div className="flex-1">
                  <h3 className="display-font text-xl font-black uppercase italic text-white mb-2">
                    {title}
                  </h3>
                  <p className="mono-font text-sm text-white/60 uppercase tracking-tight">
                    {message}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 p-4 sm:p-6 flex flex-row-reverse gap-3">
              <button
                type="button"
                className={`mono-font text-xs font-bold uppercase tracking-widest px-6 py-3 transition-all ${getConfirmClasses()}`}
                onClick={handleConfirm}
              >
                {confirmText || 'Aceptar'}
              </button>

              {type === 'confirm' && (
                <button
                  type="button"
                  className="mono-font text-xs font-bold uppercase tracking-widest px-6 py-3 text-white/50 border border-white/10 hover:border-white/30 hover:text-white transition-all"
                  onClick={handleCancel}
                >
                  {cancelText || 'Cancelar'}
                </button>
              )}
            </div>

            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
