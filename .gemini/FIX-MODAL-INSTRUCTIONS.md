## 🔧 إصلاح زر "عرض التفاصيل"

### المشكلة:
زر "عرض التفاصيل" لا يعمل لأن الـ Modal غير موجود في الصفحة.

### الحل:

**افتح الملف:** `d:\el7lm-backup\src\app\dashboard\admin\payments-v2\page.tsx`

**ابحث عن السطر 514** (قبل النهاية مباشرة):
```tsx
        </div>
    );
}
```

**استبدله بـ:**
```tsx
            {/* Modal التفاصيل */}
            {showDetailsModal && selectedPayment && (
                <PaymentDetailsModal
                    payment={selectedPayment}
                    showFullData={showFullData}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedPayment(null);
                    }}
                    onApprove={async (payment) => {
                        try {
                            await updatePaymentStatus(payment, 'completed', true);
                            await fetchPayments(false);
                            setShowDetailsModal(false);
                        } catch (error) {
                            console.error('خطأ في الموافقة:', error);
                        }
                    }}
                    onReject={async (payment) => {
                        try {
                            await updatePaymentStatus(payment, 'cancelled', false);
                            await fetchPayments(false);
                            setShowDetailsModal(false);
                        } catch (error) {
                            console.error('خطأ في الرفض:', error);
                        }
                    }}
                    onActivateSubscription={async (payment) => {
                        try {
                            await activateSubscription(payment);
                            toast.success('✅ تم تفعيل الاشتراك بنجاح');
                            await fetchPayments(false);
                            setShowDetailsModal(false);
                        } catch (error: any) {
                            console.error('خطأ في تفعيل الاشتراك:', error);
                            toast.error(error.message || 'فشل في تفعيل الاشتراك');
                        }
                    }}
                />
            )}
        </div>
    );
}
```

### أو بطريقة أسهل:

**أضف هذا الكود بعد السطر 513** (بعد `</div>` الأخير قبل `</div>` الختامي):

```tsx
{/* Modal التفاصيل */}
{showDetailsModal && selectedPayment && (
    <PaymentDetailsModal
        payment={selectedPayment}
        showFullData={showFullData}
        onClose={() => {
            setShowDetailsModal(false);
            setSelectedPayment(null);
        }}
        onApprove={async (payment) => {
            try {
                await updatePaymentStatus(payment, 'completed', true);
                await fetchPayments(false);
                setShowDetailsModal(false);
            } catch (error) {
                console.error('خطأ:', error);
            }
        }}
        onReject={async (payment) => {
            try {
                await updatePaymentStatus(payment, 'cancelled', false);
                await fetchPayments(false);
                setShowDetailsModal(false);
            } catch (error) {
                console.error('خطأ:', error);
            }
        }}
        onActivateSubscription={async (payment) => {
            try {
                await activateSubscription(payment);
                toast.success('✅ تم تفعيل الاشتراك');
                await fetchPayments(false);
                setShowDetailsModal(false);
            } catch (error: any) {
                toast.error('فشل في التفعيل');
            }
        }}
    />
)}
```

**احفظ الملف** (Ctrl+S)

**جرب الآن!** 🚀
