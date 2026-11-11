import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  MessageSquare,
  Mail,
  Zap,
  Sparkles,
  RefreshCw,
  Layers,
} from 'lucide-react';
import api from '../../../services/api';
import { CreditPackage, WalletChannel, CreditPurchase } from '../../../types/wallet';

interface BuyCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultChannel?: WalletChannel;
  onPurchaseSuccess?: () => void;
}

export const BuyCreditsModal: React.FC<BuyCreditsModalProps> = ({
  isOpen,
  onClose,
  defaultChannel = 'SMS',
  onPurchaseSuccess,
}) => {
  const [channel, setChannel] = useState<WalletChannel>(defaultChannel);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Payment flow states: 'select' -> 'summary' -> 'checkout' -> 'success'
  const [flowStep, setFlowStep] = useState<'select' | 'summary' | 'checkout' | 'success'>('select');
  const [purchase, setPurchase] = useState<CreditPurchase | null>(null);
  const [orderData, setOrderData] = useState<any | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setChannel(defaultChannel);
      setFlowStep('select');
      setSelectedPackage(null);
      setPurchase(null);
      setOrderData(null);
      setPaymentSuccessData(null);
      setError('');
      fetchPackages(defaultChannel);
    }
  }, [isOpen, defaultChannel]);

  const fetchPackages = async (targetChannel: WalletChannel) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/credit-packages', { params: { channel: targetChannel } });
      const pkgs = Array.isArray(res) ? res : (res?.data || []);
      setPackages(pkgs);
      if (pkgs.length > 0) {
        setSelectedPackage(pkgs[0]);
      } else {
        setSelectedPackage(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load credit packages');
    } finally {
      setLoading(false);
    }
  };

  const handleChannelChange = (newChannel: WalletChannel) => {
    setChannel(newChannel);
    fetchPackages(newChannel);
  };

  const handleProceedToSummary = () => {
    if (!selectedPackage) return;
    setFlowStep('summary');
  };

  const handleCreateOrder = async () => {
    if (!selectedPackage) return;
    setPaymentProcessing(true);
    setError('');

    try {
      // 1. Create Purchase record in database
      const purchaseRes = await api.post('/purchases', {
        packageId: selectedPackage.id,
      });
      const createdPurchase = purchaseRes?.id ? purchaseRes : (purchaseRes?.data || purchaseRes);
      setPurchase(createdPurchase);

      // 2. Create Payment Order (Razorpay or Simulator)
      const orderRes = await api.post('/payments/create-order', {
        purchaseId: createdPurchase.id,
      });
      const order = orderRes?.orderId || orderRes?.razorpayOrderId ? orderRes : (orderRes?.data || orderRes);
      setOrderData(order);
      setFlowStep('checkout');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize payment order');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Execute Simulated Test Payment (Simulator Mode)
  const handleSimulatePayment = async (shouldSucceed: boolean) => {
    if (!orderData || !purchase) return;
    setPaymentProcessing(true);
    setError('');

    try {
      if (!shouldSucceed) {
        throw new Error('Customer cancelled payment in test mode');
      }

      // Verify payment on backend with test details
      const verifyRes = await api.post('/payments/verify', {
        purchaseId: purchase.id,
        razorpayOrderId: orderData.orderId,
        razorpayPaymentId: `pay_sim_${Date.now()}`,
        razorpaySignature: 'SIMULATED_TEST_SIGNATURE',
        isSimulator: true,
      });

      setPaymentSuccessData(verifyRes?.data || verifyRes);
      setFlowStep('success');
      window.dispatchEvent(new CustomEvent('baash:wallet-updated'));
      if (onPurchaseSuccess) {
        onPurchaseSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Payment simulation failed');
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#12121A] border border-[#232336] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A2E]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#7B35E8]/10 rounded-xl text-[#7B35E8]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Purchase Communication Credits</h2>
              <p className="text-xs text-[#9E9E9E]">
                Prepaid credit top-up with automated GST invoice and instant wallet allocation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9E9E9E] hover:text-white rounded-lg hover:bg-[#1A1A2E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: SELECT CHANNEL & PACKAGE */}
          {flowStep === 'select' && (
            <div className="space-y-5">
              {/* Channel Selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E] block mb-2">
                  1. Select Communication Channel
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['SMS', 'WHATSAPP', 'EMAIL'] as WalletChannel[]).map((ch) => {
                    const isSelected = channel === ch;
                    let Icon = Smartphone;
                    let accentColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
                    if (ch === 'WHATSAPP') {
                      Icon = MessageSquare;
                      accentColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
                    } else if (ch === 'EMAIL') {
                      Icon = Mail;
                      accentColor = 'text-purple-400 bg-purple-500/10 border-purple-500/30';
                    }

                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => handleChannelChange(ch)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-[#7B35E8]/15 text-white border-[#7B35E8] shadow-lg shadow-[#7B35E8]/10'
                            : 'bg-[#1A1A2E]/50 text-[#9E9E9E] border-[#2A2A40] hover:text-white hover:border-[#383854]'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${accentColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">{ch} Credits</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Package Selection */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E] block mb-2">
                  2. Choose Package
                </label>

                {loading ? (
                  <div className="py-12 text-center text-xs text-[#9E9E9E]">Loading packages...</div>
                ) : packages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#6E6E82] border border-dashed border-[#2A2A40] rounded-xl">
                    No active packages available for {channel} at this time.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {packages.map((pkg) => {
                      const isSelected = selectedPackage?.id === pkg.id;
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#7B35E8]/10 border-[#7B35E8] ring-1 ring-[#7B35E8]'
                              : 'bg-[#1A1A2E]/40 border-[#2A2A40] hover:border-[#383854]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-white">{pkg.name}</h4>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[#7B35E8]/20 text-[#7B35E8] font-bold">
                                {pkg.credits.toLocaleString()} Credits
                              </span>
                            </div>
                            {pkg.description && (
                              <p className="text-[11px] text-[#9E9E9E] mt-1 line-clamp-2">
                                {pkg.description}
                              </p>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t border-[#232336] flex items-baseline justify-between">
                            <span className="text-xs text-[#9E9E9E]">Base Price:</span>
                            <div className="text-right">
                              <span className="text-base font-extrabold text-white">
                                ₹{pkg.price.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-[#6E6E82] block">
                                +{pkg.gstPercentage}% GST = ₹{pkg.finalPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PURCHASE SUMMARY & GST INVOICE REVIEW */}
          {flowStep === 'summary' && selectedPackage && (
            <div className="space-y-4">
              <div className="p-4 bg-[#1A1A2E]/60 border border-[#2A2A40] rounded-xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#9E9E9E]">
                  Order & Tax Breakdown
                </h3>

                <div className="space-y-2 text-xs divide-y divide-[#232336]">
                  <div className="flex justify-between py-1.5 text-[#D1D1DB]">
                    <span>Package Name</span>
                    <strong className="text-white font-semibold">{selectedPackage.name}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 text-[#D1D1DB]">
                    <span>Communication Channel</span>
                    <strong className="text-white font-semibold">{selectedPackage.channel}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 text-[#D1D1DB]">
                    <span>Credits to be Added</span>
                    <strong className="text-[#7B35E8] font-bold">
                      {selectedPackage.credits.toLocaleString()} Credits
                    </strong>
                  </div>
                  <div className="flex justify-between py-1.5 text-[#D1D1DB]">
                    <span>Base Amount</span>
                    <span className="font-mono text-white">₹{selectedPackage.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-[#D1D1DB]">
                    <span>GST Rate ({selectedPackage.gstPercentage}%)</span>
                    <span className="font-mono text-white">
                      ₹{selectedPackage.gstAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 text-sm font-bold">
                    <span className="text-white">Total Payable Amount</span>
                    <span className="font-mono text-emerald-400 text-base">
                      ₹{selectedPackage.finalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#161622] border border-[#2A2A40] rounded-xl flex items-start gap-2.5 text-xs text-[#9E9E9E]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  All payments are processed securely in <strong>Test Mode</strong>. Credits are
                  allocated immediately upon payment verification to your isolated vendor ledger.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT CHECKOUT (RAZORPAY TEST SIMULATOR) */}
          {flowStep === 'checkout' && orderData && (
            <div className="space-y-5 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-[#7B35E8]/10 text-[#7B35E8] mx-auto flex items-center justify-center">
                <CreditCard className="w-7 h-7" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25 uppercase">
                  Razorpay Sandbox • Test Mode
                </span>
                <h3 className="text-lg font-bold text-white mt-2">
                  Complete Payment of ₹{orderData.totalAmount.toFixed(2)}
                </h3>
                <p className="text-xs text-[#9E9E9E] mt-1 font-mono">
                  Order ID: {orderData.orderId}
                </p>
              </div>

              {/* Simulator Card */}
              <div className="p-5 bg-[#161622] border border-[#2A2A40] rounded-xl max-w-md mx-auto space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-[#232336] pb-2 text-xs">
                  <span className="text-[#9E9E9E]">Payment Gateway</span>
                  <span className="font-semibold text-white">Razorpay Test Simulator</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#232336] pb-2 text-xs">
                  <span className="text-[#9E9E9E]">Channel & Credits</span>
                  <span className="font-semibold text-white">
                    {orderData.credits.toLocaleString()} {orderData.channel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-white">Amount Due</span>
                  <span className="text-emerald-400 font-mono text-sm">
                    ₹{orderData.totalAmount.toFixed(2)}
                  </span>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSimulatePayment(true)}
                    disabled={paymentProcessing}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    {paymentProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Verifying Payment Signature...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Simulate Successful Payment (Test)
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulatePayment(false)}
                    disabled={paymentProcessing}
                    className="w-full py-2 bg-[#1A1A2E] hover:bg-[#232336] text-[#9E9E9E] hover:text-white rounded-xl text-xs font-medium transition-colors"
                  >
                    Simulate Cancelled / Failed Payment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS RECEIPT */}
          {flowStep === 'success' && paymentSuccessData && (
            <div className="space-y-5 text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Credits Added Successfully!</h3>
                <p className="text-xs text-[#9E9E9E] mt-1">{paymentSuccessData.message}</p>
              </div>

              <div className="p-4 bg-[#1A1A2E]/60 border border-[#2A2A40] rounded-xl max-w-md mx-auto text-xs divide-y divide-[#232336] text-left">
                <div className="flex justify-between py-1.5 text-[#D1D1DB]">
                  <span>Channel</span>
                  <strong className="text-white">{paymentSuccessData.purchase.channel}</strong>
                </div>
                <div className="flex justify-between py-1.5 text-[#D1D1DB]">
                  <span>Credits Added</span>
                  <strong className="text-emerald-400 font-bold">
                    +{paymentSuccessData.purchase.credits.toLocaleString()}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5 text-[#D1D1DB]">
                  <span>New Available Balance</span>
                  <strong className="text-white font-mono">
                    {paymentSuccessData.wallet.availableCredits.toLocaleString()} Credits
                  </strong>
                </div>
                <div className="flex justify-between py-1.5 text-[#D1D1DB]">
                  <span>Transaction ID</span>
                  <code className="text-[#9E9E9E] font-mono">
                    {paymentSuccessData.transaction.id.slice(0, 12)}...
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1A1A2E] bg-[#0E0E17] flex justify-between items-center">
          {flowStep === 'select' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white rounded-xl text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToSummary}
                disabled={!selectedPackage}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#7B35E8] hover:bg-[#6824D3] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7B35E8]/20 transition-all"
              >
                Continue to Review
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {flowStep === 'summary' && (
            <>
              <button
                type="button"
                onClick={() => setFlowStep('select')}
                className="px-4 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white rounded-xl text-xs font-medium transition-colors"
              >
                Back to Packages
              </button>
              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={paymentProcessing}
                className="flex items-center gap-2 px-5 py-2 bg-[#7B35E8] hover:bg-[#6824D3] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7B35E8]/20 transition-all"
              >
                {paymentProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  <>
                    Proceed to Payment
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}

          {flowStep === 'checkout' && (
            <div className="w-full flex justify-start">
              <button
                type="button"
                onClick={() => setFlowStep('summary')}
                className="px-4 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white rounded-xl text-xs font-medium transition-colors"
              >
                Back to Order Summary
              </button>
            </div>
          )}

          {flowStep === 'success' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-[#7B35E8] hover:bg-[#6824D3] text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

