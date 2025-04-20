import React, { useEffect, useRef } from 'react';
import './Dialog.css';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  showCloseButton?: boolean;
}

const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  showCloseButton = true
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // 尺寸映射
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  };

  // ESC关闭dialog
  useEffect(() => {
    const handEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handEscape);

    // 打开dialog时禁止背景滚动
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // 点击其他区域关闭dialog
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // 如果未打开就不进行渲染
  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 overflow-auto bg-black/50 flex items-center justify-center p-4 dialog-backdrop'
      onClick={handleBackdropClick}
      aria-modal="true"
      role='dialog'
    >
      <div
        ref={dialogRef}
        className={`bg-white rounded-xl shadow-xl transform transition-all w-full dialog-content ${sizeClasses[size]}`}
      >
        {/* 标题栏 */}
        {(title || showCloseButton) && (
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            {title && <h3 className="text-lg font-bold text-gray-800">{title}</h3>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-md p-1"
                aria-label="关闭"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        )}
        {/* 内容区域 */}
        <div className='p-6'>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Dialog;