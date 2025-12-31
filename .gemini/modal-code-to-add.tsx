// أضف هذا الكود قبل السطر الأخير في payments-v2/page.tsx
// قبل السطر:    );
// }

{/* Modal التفاصيل */ }
{
    showDetailsModal && selectedPayment && (
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
    )
}
