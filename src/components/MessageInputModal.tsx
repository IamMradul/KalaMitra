import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface MessageInputModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  defaultMessage?: string;
  maxWords?: number;
}

const defaultMaxWords = 100;

export default function MessageInputModal({ open, onClose, onSend, defaultMessage = '', maxWords = defaultMaxWords }: MessageInputModalProps) {
  const [message, setMessage] = useState(defaultMessage);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setMessage(defaultMessage);
      setError('');
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, defaultMessage]);

  const wordCount = message.trim() ? message.trim().split(/\s+/).length : 0;
  const remaining = maxWords - wordCount;

  const handleSend = () => {
    if (wordCount === 0) {
      setError('Please enter a message.');
      return;
    }
    if (wordCount > maxWords) {
      setError(`Message cannot exceed ${maxWords} words.`);
      return;
    }
    onSend(message.trim());
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all ${open ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'}`}
      style={{ background: 'rgba(0,0,0,0.35)' }}
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-2 p-6 relative animate-fadeInUp">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold mb-2 text-yellow-700 dark:text-yellow-300">Send a Collaboration Message</h2>
        <p className="mb-3 text-gray-600 dark:text-gray-400 text-sm">Share why you want to collaborate. (Max {maxWords} words)</p>
        <textarea
          ref={textareaRef}
          className="w-full min-h-[90px] max-h-40 rounded-lg border border-yellow-300 focus:ring-2 focus:ring-yellow-500 bg-yellow-50 dark:bg-yellow-950/40 text-gray-900 dark:text-yellow-100 p-3 text-base resize-none transition-all placeholder:text-gray-400"
          placeholder="Why do you want to collaborate?"
          value={message}
          onChange={e => {
            setMessage(e.target.value);
            setError('');
          }}
          maxLength={1000}
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${remaining < 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>{remaining} words left</span>
          <button
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors disabled:opacity-50"
            onClick={handleSend}
            disabled={wordCount === 0 || wordCount > maxWords}
          >
            Send
          </button>
        </div>
        {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
      </div>
      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.25s cubic-bezier(.4,0,.2,1); }
      `}</style>
    </div>
  );
}
