'use client';
import { useState } from 'react';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';

export default function ChangePasswordPage() {
  const { isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('clubChangePassword');
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !next || !confirm) {
      setMessage({ type: 'error', text: copy.allRequired });
      return;
    }
    if (next !== confirm) {
      setMessage({ type: 'error', text: copy.mismatch });
      return;
    }
    // هنا من المفترض تنفيذ منطق تغيير كلمة السر عبر API
    setMessage({ type: 'success', text: copy.success });
    setCurrent(''); setNext(''); setConfirm('');
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex justify-end mb-3"><LanguageSwitcher /></div>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5" />
        {copy.back}
      </button>
      <h1 className="text-2xl font-bold mb-8 text-primary flex items-center gap-2"><KeyRound size={24} /> {copy.title}</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-5">
        <div>
          <label className="block mb-2 font-medium">{copy.current}</label>
          <input type="password" className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-primary" value={current} onChange={e => setCurrent(e.target.value)} />
        </div>
        <div>
          <label className="block mb-2 font-medium">{copy.new}</label>
          <input type="password" className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-primary" value={next} onChange={e => setNext(e.target.value)} />
        </div>
        <div>
          <label className="block mb-2 font-medium">{copy.confirm}</label>
          <input type="password" className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-primary" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        <button type="submit" className="mt-2 py-2 rounded-lg bg-gradient-to-l from-blue-400 to-blue-600 text-white font-bold hover:opacity-90">{copy.save}</button>
        {message && (
          <div className={`mt-2 text-center rounded-lg py-2 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>
        )}
      </form>
    </div>
  );
} 
