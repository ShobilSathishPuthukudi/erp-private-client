import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  hideHeader?: boolean;
  isTransparent?: boolean;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = '2xl',
  hideHeader = false,
  isTransparent = false
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open-blur');
    } else {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('modal-open-blur');
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('modal-open-blur');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full lg:max-w-[95vw]',
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-0">
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
          onClick={onClose}
        />

        <div 
          className={clsx(
            "relative transform flex flex-col transition-all w-full my-8 max-h-[90vh] text-left",
            !isTransparent && "rounded-2xl bg-white shadow-2xl",
            maxWidthClasses[maxWidth]
          )}
          style={{ maxWidth: maxWidth === 'full' ? '95vw' : undefined }}
        >
          {!hideHeader && (
            <div className="bg-white px-6 py-5 border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900 leading-6">{title}</h3>
                <button
                  type="button"
                  className="rounded-md bg-white text-slate-400 hover:text-slate-900 transition-all hover:scale-110 active:scale-95 cursor-pointer focus:outline-none"
                  onClick={onClose}
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
          
          <div className={clsx(
            "overflow-y-auto flex-1",
            !hideHeader ? "px-6 py-5 bg-slate-50/50" : (!isTransparent ? "bg-white" : "")
          )}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
