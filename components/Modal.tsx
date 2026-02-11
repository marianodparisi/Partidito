import React, { useEffect, useState } from 'react';
import { IconX, IconCheck, IconTrash, IconAlert } from './Icons';

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
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setVisible(false), 200); // Wait for animation
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
        return <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"><IconTrash className="h-6 w-6 text-red-600" /></div>;
      case 'success':
        return <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10"><IconCheck className="h-6 w-6 text-green-600" /></div>;
      case 'alert':
      default:
        return <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10"><IconAlert className="h-6 w-6 text-yellow-600" /></div>;
    }
  };

  return (
    <div className={`relative z-50 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200`}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" 
        onClick={handleCancel}
      />

      {/* Modal Panel */}
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className={`relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4 sm:translate-y-0 sm:scale-95'} duration-200`}>
            
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                {getIcon()}
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                    {title}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
              <button
                type="button"
                className={`inline-flex w-full justify-center rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm sm:w-auto ${
                  type === 'confirm' 
                    ? 'bg-red-600 hover:bg-red-500' 
                    : type === 'success' 
                      ? 'bg-pitch-600 hover:bg-pitch-500' 
                      : 'bg-blue-600 hover:bg-blue-500'
                }`}
                onClick={handleConfirm}
              >
                {confirmText || 'Aceptar'}
              </button>
              
              {type === 'confirm' && (
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  onClick={handleCancel}
                >
                  {cancelText || 'Cancelar'}
                </button>
              )}
            </div>

            {/* Close X */}
            <button 
                onClick={handleCancel}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
                <IconX className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};