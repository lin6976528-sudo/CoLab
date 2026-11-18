import React from 'react';
import { AlertTriangle, Lightbulb } from 'lucide-react';
import { ParsedError } from '../utils/errorHandling';

interface ErrorMessageProps {
  error: ParsedError;
  actionText?: string;
  onActionClick?: () => void;
}

export default function ErrorMessage({ error, actionText, onActionClick }: ErrorMessageProps) {
  return (
    <div className="p-4 bg-red-50/50 dark:bg-red-900/10 backdrop-blur-sm border border-red-200/50 dark:border-red-800/30 rounded-xl flex flex-col gap-3 shadow-sm w-full">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-100/50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 shrink-0 mt-0.5">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-400">{error.title}</h4>
          <p className="text-sm text-red-600/90 dark:text-red-400/90 mt-1 font-light">{error.message}</p>
          {onActionClick && actionText && (
            <button
              onClick={onActionClick}
              className="mt-3.5 px-4 py-2 cursor-pointer bg-red-150 dark:bg-red-950/60 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-900 dark:text-red-200 text-xs font-semibold rounded-xl transition-colors shadow-sm active:scale-[0.98]"
            >
              {actionText}
            </button>
          )}
        </div>
      </div>
      {error.suggestion && (
        <div className="flex items-start gap-2 pt-3 border-t border-red-100/50 dark:border-red-900/30 mt-1">
          <Lightbulb size={14} className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700/80 dark:text-red-400/80 font-medium">{error.suggestion}</p>
        </div>
      )}
    </div>
  );
}
