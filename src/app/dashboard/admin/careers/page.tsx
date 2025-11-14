'use client';

import React, { useEffect, useState } from 'react';

export default function CareersAdminPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/careers/applications');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed');
        setItems(json.items || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
          <div className="p-6" dir="rtl">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">طلبات التوظيف</h1>
        {loading && <p>جاري التحميل...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && (
          <>
            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">لا توجد طلبات توظيف حالياً</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    إجمالي الطلبات: <span className="font-semibold">{items.length}</span>
                  </div>
                  {items.length > 0 && items[0]?.collection && (
                    <div className="text-xs text-gray-500">
                      البيانات من: <span className="font-mono">{items[0].collection}</span>
                    </div>
                  )}
                </div>
                <table className="min-w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="py-3 px-4 font-semibold">الوظيفة/الوظائف</th>
                      <th className="py-3 px-4 font-semibold">الاسم</th>
                      <th className="py-3 px-4 font-semibold">البريد</th>
                      <th className="py-3 px-4 font-semibold">الهاتف</th>
                      <th className="py-3 px-4 font-semibold">الدولة</th>
                      <th className="py-3 px-4 font-semibold">المحافظة</th>
                      <th className="py-3 px-4 font-semibold">الخبرات</th>
                      <th className="py-3 px-4 font-semibold">لينكدإن</th>
                      <th className="py-3 px-4 font-semibold">فيسبوك</th>
                      <th className="py-3 px-4 font-semibold">تاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          {Array.isArray(it.roles) && it.roles.length > 0 
                            ? it.roles.join('، ') 
                            : (it.role || '-')}
                        </td>
                        <td className="py-3 px-4 font-medium">{it.fullName}</td>
                        <td className="py-3 px-4">
                          <a href={`mailto:${it.email}`} className="text-blue-600 hover:underline">
                            {it.email}
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <a href={`tel:${it.phone}`} className="text-blue-600 hover:underline">
                            {it.phone}
                          </a>
                        </td>
                        <td className="py-3 px-4">{it.country || '-'}</td>
                        <td className="py-3 px-4">{it.governorate || '-'}</td>
                        <td className="py-3 px-4 max-w-md truncate" title={it.experience || ''}>
                          {it.experience || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {it.linkedin ? (
                            <a 
                              className="text-blue-600 hover:underline" 
                              href={it.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              رابط
                            </a>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {it.facebook ? (
                            <a 
                              className="text-blue-600 hover:underline" 
                              href={it.facebook} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              رابط
                            </a>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {it.createdAt 
                            ? (it.createdAt instanceof Date 
                                ? it.createdAt.toLocaleString('ar-EG')
                                : it.createdAt?.seconds 
                                  ? new Date(it.createdAt.seconds * 1000).toLocaleString('ar-EG')
                                  : new Date(it.createdAt).toLocaleString('ar-EG'))
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


