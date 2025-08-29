import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export type PopupType = 'success' | 'error' | 'info' | '';

interface PopupProps {
    message: string;
    type: PopupType;
    onClose: () => void;
    duration?: number;
}

const Popup: React.FC<PopupProps> = ({
    message,
    type,
    onClose,
    duration = 3000
}) => {
    useEffect(() => {
        if (message && type) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [message, type, onClose, duration]);

    if (!message || !type) return null;

    let bgColor, borderColor, textColor, Icon;

    switch (type) {
        case 'success':
            bgColor = 'bg-green-50';
            borderColor = 'border-green-300';
            textColor = 'text-green-800';
            Icon = CheckCircle;
            break;
        case 'error':
            bgColor = 'bg-red-50';
            borderColor = 'border-red-300';
            textColor = 'text-red-800';
            Icon = AlertCircle;
            break;
        case 'info':
            bgColor = 'bg-blue-50';
            borderColor = 'border-blue-300';
            textColor = 'text-blue-800';
            Icon = Info;
            break;
        default:
            bgColor = 'bg-gray-50';
            borderColor = 'border-gray-300';
            textColor = 'text-gray-800';
            Icon = Info;
    }

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down max-w-md w-full">
            <div className={`${bgColor} ${borderColor} ${textColor} border p-4 rounded-lg shadow-lg flex items-center`}>
                <div className={`w-8 h-8 rounded-full ${type === 'success' ? 'bg-green-100' : type === 'error' ? 'bg-red-100' : 'bg-blue-100'} flex items-center justify-center mr-3 flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${type === 'success' ? 'text-green-600' : type === 'error' ? 'text-red-600' : 'text-blue-600'}`} />
                </div>
                <p className="text-sm font-medium flex-grow">{message}</p>
                <button
                    onClick={onClose}
                    className={`${textColor} hover:bg-opacity-10 hover:bg-gray-500 ml-2 p-1 rounded-full flex-shrink-0 transition-colors duration-200`}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default Popup;
