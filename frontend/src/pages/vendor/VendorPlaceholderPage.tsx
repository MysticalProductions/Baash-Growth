import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';

interface VendorPlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  targetPhase: string;
}

export const VendorPlaceholderPage: React.FC<VendorPlaceholderPageProps> = ({
  title,
  description,
  icon: Icon,
  targetPhase,
}) => {
  return (
    <div className="baash-card p-12 border border-baash-cardBorder text-center flex flex-col items-center justify-center my-8">
      <div className="w-16 h-16 rounded-3xl bg-baash-purple/20 border border-baash-purple/30 text-baash-purpleLight flex items-center justify-center mb-4">
        <Icon size={32} />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-baash-pink/10 border border-baash-pink/20 text-baash-pink text-xs font-semibold mb-3">
        <Sparkles size={14} />
        <span>Scheduled for {targetPhase}</span>
      </div>

      <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
      <p className="text-sm text-baash-textMuted max-w-md mt-2">
        {description}
      </p>

      <div className="mt-8 p-4 bg-baash-darkBg rounded-xl border border-baash-cardBorder/60 max-w-md text-xs text-baash-textMuted text-left">
        <p className="font-semibold text-white mb-1">Part 1 Development Scope</p>
        <p>
          In Part 1, your vendor workspace has been isolated with multi-tenant row-level boundaries,
          RBAC staff permission management, and profile controls. This module will integrate in {targetPhase}.
        </p>
      </div>
    </div>
  );
};
