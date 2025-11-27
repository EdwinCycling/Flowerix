
import React from 'react';
import { Icons } from '../Icons';

interface ToastProps {
    message: string;
    visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, visible }) => {
    if (!visible) return null;
    return (
        <div className="fixed bottom-10 inset-x-0 flex justify-center z-[100] pointer-events-none">
            <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium animate-bounce">
                {message}
            </div>
        </div>
    );
};

interface LoadingOverlayProps {
    visible: boolean;
    message: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, message }) => {
    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col items-center animate-pulse">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mb-4"></div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{message}</h3>
            </div>
        </div>
    );
};

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText
}) => {
    if (!isOpen) return null;
    
    // If no cancel function or cancel text is provided, treat as Alert
    const isAlert = !onCancel || cancelText === "";

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md transition-opacity">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    {!isAlert && (
                        <button 
                            onClick={onCancel}
                            className="flex-1 py-2 px-4 rounded-xl text-gray-900 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
                        >
                            {cancelText || "Cancel"}
                        </button>
                    )}
                    <button 
                        onClick={onConfirm}
                        className={`flex-1 py-2 px-4 rounded-xl text-white transition-colors font-medium shadow-sm text-sm ${isAlert ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
