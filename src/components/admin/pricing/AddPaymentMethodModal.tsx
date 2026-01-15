import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, CreditCard, Banknote, Smartphone, Globe } from 'lucide-react';

interface PaymentProvider {
    id: string;
    name: string;
    type: 'card' | 'wallet' | 'bank_transfer' | 'other';
    icon: string;
    description: string;
}

const COMMON_PROVIDERS: PaymentProvider[] = [
    // Global / Cards
    { id: 'stripe', name: 'Stripe', type: 'card', icon: '💳', description: 'Global Card Payments' },
    { id: 'paypal', name: 'PayPal', type: 'wallet', icon: '💙', description: 'Global Wallet' },

    // Egypt
    { id: 'vodafone_cash', name: 'Vodafone Cash', type: 'wallet', icon: '📱', description: 'Egypt Mobile Wallet' },
    { id: 'instapay', name: 'InstaPay', type: 'wallet', icon: '⚡', description: 'Egypt Instant Transfer' },
    { id: 'fawry', name: 'Fawry', type: 'other', icon: '🟡', description: 'Egypt Cash Payment' },

    // Gulf
    { id: 'stc_pay', name: 'STC Pay', type: 'wallet', icon: '🟣', description: 'Saudi Arabia Wallet' },
    { id: 'urpay', name: 'UrPay', type: 'wallet', icon: '📱', description: 'Saudi Arabia Wallet' },
    { id: 'skipcash', name: 'SkipCash', type: 'card', icon: '💳', description: 'Qatar Payment Gateway' },
    { id: 'fawran', name: 'Fawran', type: 'wallet', icon: '⚡', description: 'Qatar Instant Transfer' },

    // Iraq / Levant
    { id: 'zain_cash', name: 'Zain Cash', type: 'wallet', icon: '⚫', description: 'Iraq/Jordan Wallet' },
    { id: 'asia_hawala', name: 'Asia Hawala', type: 'wallet', icon: '🔴', description: 'Iraq Wallet' },
    { id: 'qi_card', name: 'Qi Card', type: 'card', icon: '💳', description: 'Iraq National Card' },

    // Generic
    { id: 'bank_transfer', name: 'Bank Transfer', type: 'bank_transfer', icon: '🏦', description: 'Direct Bank Transfer' },
    { id: 'cash', name: 'Cash / Office', type: 'other', icon: '💵', description: 'Cash at Office' },
];

interface AddPaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (method: any) => void;
}

export default function AddPaymentMethodModal({ isOpen, onClose, onAdd }: AddPaymentMethodModalProps) {
    const [search, setSearch] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
    const [customName, setCustomName] = useState('');
    const [customType, setCustomType] = useState('wallet');

    const filteredProviders = COMMON_PROVIDERS.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
    );

    const handleConfirm = () => {
        if (selectedProvider) {
            onAdd({
                id: selectedProvider.id === 'bank_transfer' ? `bank_${Date.now()}` : selectedProvider.id, // Allow multiple banks
                name: selectedProvider.name,
                type: selectedProvider.type,
                enabled: true,
                isDefault: false,
                accountNumber: '',
                icon: selectedProvider.icon
            });
        } else if (customName) {
            onAdd({
                id: `custom_${Date.now()}`,
                name: customName,
                type: customType,
                enabled: true,
                isDefault: false,
                accountNumber: '',
                icon: customType === 'wallet' ? '📱' : customType === 'bank_transfer' ? '🏦' : '💳'
            });
        }
        onClose();
        setSearch('');
        setSelectedProvider(null);
        setCustomName('');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="text-xl font-bold text-gray-900">إضافة وسيلة دفع</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Search */}
                        <div className="relative mb-6">
                            <Search className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="ابحث عن مزود خدمة (Fawry, Vodafone, Stripe...)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        {/* List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto mb-6 pr-2">
                            {filteredProviders.map(provider => (
                                <div
                                    key={provider.id}
                                    onClick={() => {
                                        setSelectedProvider(provider);
                                        setCustomName('');
                                    }}
                                    className={`
                                        p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-all
                                        ${selectedProvider?.id === provider.id
                                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl shadow-sm border border-gray-100">
                                        {provider.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 text-sm">{provider.name}</h4>
                                        <p className="text-xs text-gray-500">{provider.description}</p>
                                    </div>
                                    {selectedProvider?.id === provider.id && (
                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Custom Option */}
                            <div
                                onClick={() => {
                                    setSelectedProvider(null);
                                    // Focus on custom input managed below
                                }}
                                className={`
                                    p-4 rounded-xl border cursor-pointer border-dashed flex flex-col gap-3 transition-all
                                    ${!selectedProvider && customName ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                                        ✨
                                    </div>
                                    <span className="font-bold text-gray-700">أخرى (مخصص)</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="اكتب اسم طريقة الدفع.."
                                    value={customName}
                                    onChange={(e) => {
                                        setCustomName(e.target.value);
                                        setSelectedProvider(null);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                />
                                <div className="flex gap-2">
                                    <select
                                        value={customType}
                                        onChange={(e) => setCustomType(e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                                    >
                                        <option value="wallet">محفظة إلكترونية</option>
                                        <option value="bank_transfer">تحويل بنكي</option>
                                        <option value="other">أخرى</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!selectedProvider && !customName}
                                className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-200"
                            >
                                إضافة
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
