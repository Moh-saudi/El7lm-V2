'use client';

import { useState } from 'react';

export default function CheckAccountPage() {
  const [phone, setPhone] = useState('201278988086');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkPhone = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/debug/check-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '50px auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      direction: 'rtl'
    }}>
      <h1>🔍 فحص حالة الحساب</h1>
      <p>أدخل رقم الهاتف للتحقق من حالته في قاعدة البيانات</p>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="مثال: 201278988086"
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
        <button
          onClick={checkPhone}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {loading ? 'جاري الفحص...' : 'فحص الرقم'}
        </button>
      </div>
      
      {result && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          borderRadius: '4px',
          background: result.error ? '#f8d7da' : result.found ? '#fff3cd' : '#d4edda',
          border: `1px solid ${result.error ? '#f5c6cb' : result.found ? '#ffc107' : '#c3e6cb'}`,
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}>
          <h3>النتيجة:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
          
          {result.accounts && result.accounts.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4>تفاصيل الحسابات:</h4>
              {result.accounts.map((acc: any, i: number) => (
                <div key={i} style={{ 
                  marginTop: '10px', 
                  padding: '10px', 
                  background: '#f9f9f9',
                  borderRadius: '4px'
                }}>
                  <strong>الحساب {i + 1}:</strong><br/>
                  المجموعة: {acc.collection}<br/>
                  البريد: {acc.email}<br/>
                  isDeleted: <strong>{String(acc.isDeleted)}</strong> (نوع: {acc.isDeletedType})<br/>
                  isActive: <strong>{String(acc.isActive)}</strong> (نوع: {acc.isActiveType})<br/>
                  اسم: {acc.name || 'غير محدد'}<br/>
                  نوع الحساب: {acc.accountType || 'غير محدد'}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

