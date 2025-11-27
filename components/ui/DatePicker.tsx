
import React from 'react';
import { Icons } from '../Icons';

interface DatePickerProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    min?: string;
    max?: string;
    required?: boolean;
    className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label, min, max, required, className }) => {
    return (
        <div className={`w-full ${className || ''}`}>
            {label && (
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                    <Icons.Calendar className="h-5 w-5" />
                </div>
                <input
                    type="date"
                    value={value}
                    min={min}
                    max={max}
                    required={required}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium shadow-sm appearance-none"
                    style={{ colorScheme: 'light dark' }} // Ensures calendar icon inside input adapts to theme if browser supports it
                />
                {/* Custom Chevron for visual consistency, pointer-events-none lets click pass through to input */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                    <Icons.ChevronDown className="h-4 w-4" />
                </div>
            </div>
        </div>
    );
};
