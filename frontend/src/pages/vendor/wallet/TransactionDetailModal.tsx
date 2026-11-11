import React from 'react';
import { X, Receipt, ArrowDownLeft, ArrowUpRight, ShieldCheck, Clock, Hash } from 'lucide-react';
import { WalletTransaction } from '../../../types/wallet';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: WalletTransaction | null;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  if (!isOpen || !transaction) return null;

  const isCredit = transaction.direction === 'CREDIT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#12121A] border border-[#232336] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A2E]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#7B35E8]/10 rounded-xl text-[#7B35E8]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Transaction Details</h2>
              <p className="text-xs text-[#9E9E9E] font-mono">ID: {transaction.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9E9E9E] hover:text-white rounded-lg hover:bg-[#1A1A2E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Main Quantity Banner */}
          <div
            className={`p-5 rounded-2xl border flex items-center justify-between ${
              isCredit
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isCredit
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E]">
                  {transaction.type.replace('_', ' ')}
                </span>
                <p
                  className={`text-2xl font-extrabold ${
                    isCredit ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {isCredit ? '+' : '-'}
                  {transaction.credits.toLocaleString()} Credits
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#12121A] text-white border border-[#232336]">
              {transaction.channel}
            </span>
          </div>

          {/* Ledger Balance Details */}
          <div className="p-4 bg-[#1A1A2E]/50 border border-[#2A2A40] rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9E9E]">
              Balance Movement
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#12121A] border border-[#232336] rounded-lg">
                <span className="text-[10px] text-[#9E9E9E] block">Balance Before</span>
                <span className="text-sm font-mono font-bold text-white">
                  {transaction.balanceBefore.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-[#12121A] border border-[#232336] rounded-lg">
                <span className="text-[10px] text-[#9E9E9E] block">Balance After</span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {transaction.balanceAfter.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Description & Metadata */}
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#9E9E9E] block mb-1">Description</span>
              <p className="p-3 bg-[#1A1A2E]/50 border border-[#2A2A40] rounded-xl text-white leading-relaxed">
                {transaction.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-[#1A1A2E]/30 border border-[#2A2A40] rounded-xl">
                <span className="text-[#9E9E9E] block text-[10px]">Timestamp</span>
                <span className="text-white font-medium">
                  {new Date(transaction.createdAt).toLocaleString()}
                </span>
              </div>

              {transaction.referenceType && (
                <div className="p-3 bg-[#1A1A2E]/30 border border-[#2A2A40] rounded-xl">
                  <span className="text-[#9E9E9E] block text-[10px]">Reference</span>
                  <span className="text-white font-mono text-[11px]">
                    {transaction.referenceType}: {transaction.referenceId || 'N/A'}
                  </span>
                </div>
              )}
            </div>

            {transaction.idempotencyKey && (
              <div className="p-3 bg-[#12121A] border border-[#232336] rounded-xl">
                <span className="text-[10px] text-[#9E9E9E] block">Idempotency Key</span>
                <code className="text-[#D1D1DB] text-[11px] font-mono break-all">
                  {transaction.idempotencyKey}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1A1A2E] bg-[#0E0E17] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white rounded-xl text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

