
const fs = require('fs');
const path = require('path');

const filePath = 'd:\\el7lm-backup\\src\\app\\dashboard\\admin\\invoices\\page.tsx';
const targetLine = 1675; // This is the line </div> after </Card>

const newContentPart = `
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center px-4 py-8 z-50 overflow-y-auto"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-3xl w-full p-8 border border-white/20 my-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">{selected.invoiceNumber}</h2>
                    <div className="mt-1">{statusDisplay(selected.status)}</div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">المصدر: {selected.source}</p>
                </div>
                <button
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                  onClick={() => setSelected(null)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Client Info Card */}
                <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <Wallet2 className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg">بيانات العميل</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500 text-sm">الاسم</span>
                      <span className="font-semibold text-gray-900 text-left">{selected.customerName}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500 text-sm">البريد الإلكتروني</span>
                      <span className="font-medium text-gray-900 text-left break-all">{selected.customerEmail || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">رقم الهاتف</span>
                      <span className="font-medium text-gray-900 text-left" dir="ltr">{selected.customerPhone || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Info Card */}
                <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg">تفاصيل الدفع</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                       <span className="text-gray-500 text-sm">المبلغ</span>
                       <span className="font-bold text-emerald-600 text-lg">{formatCurrency(selected.amount, selected.currency)}</span>
                    </div>
                     <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500 text-sm">طريقة الدفع</span>
                        <span>{paymentDisplay(selected)}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-gray-500 text-sm">تاريخ الإنشاء</span>
                        <span className="font-medium text-gray-700">{formatDate(selected.createdAt)}</span>
                     </div>
                  </div>
                </div>

                {/* Package Info Card */}
                {(selected.planName || selected.packageDuration) && (
                  <div className="bg-purple-50/50 rounded-xl p-5 border border-purple-100 shadow-sm md:col-span-2">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-purple-900 text-lg">تفاصيل الباقة والاشتراك</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {selected.planName && (
                        <div className="flex items-center gap-2">
                           <span className="text-purple-700 font-medium">الخدمة/الباقة:</span>
                           <span className="font-bold text-purple-900">{selected.planName}</span>
                        </div>
                      )}
                      {selected.packageDuration && (
                        <div className="flex items-center gap-2">
                           <span className="text-purple-700 font-medium">المدة:</span>
                           <span className="font-bold text-purple-900">{selected.packageDuration}</span>
                        </div>
                      )}
                      {selected.expiryDate && (
                         <div className="flex items-center gap-2 md:col-span-2">
                            <span className="text-purple-700 font-medium">تاريخ الانتهاء:</span>
                            <span className={`font-bold ${
    selected.expiryDate < new Date() ? 'text-red-600' : 'text-purple-900'
} `}>
                              {formatDate(selected.expiryDate)}
                              {selected.expiryDate < new Date() && ' (منتهي)'}
                            </span>
                         </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Technical Info */}
                <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
                    <button 
                      onClick={(e) => {
                          const details = e.currentTarget.nextElementSibling;
                          details?.classList.toggle('hidden');
                      }}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors w-full text-right"
                    >
                        <Info className="w-4 h-4" />
                        عرض التفاصيل التقنية والمرجعيات
                    </button>
                    <div className="hidden grid md:grid-cols-2 gap-4 text-xs text-gray-600 bg-gray-50 p-4 rounded-lg mt-2 transition-all">
                        <p><span className="font-semibold block text-gray-800">Order ID:</span> {selected.reference.orderId || '—'}</p>
                        <p><span className="font-semibold block text-gray-800">Merchant Ref:</span> {selected.reference.merchantReferenceId || '—'}</p>
                        <p><span className="font-semibold block text-gray-800">Transaction ID:</span> {selected.reference.transactionId || '—'}</p>
                        <p><span className="font-semibold block text-gray-800">Payment ID:</span> {selected.reference.paymentId || '—'}</p>
                        {selected.notes && (
                           <div className="md:col-span-2 mt-2 pt-2 border-t border-gray-200">
                              <span className="font-semibold block text-gray-800">ملاحظات داخلية:</span>
                              <p className="mt-1 whitespace-pre-wrap">{selected.notes}</p>
                           </div>
                        )}
                    </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-gray-100 justify-end">
                  <Button
                    onClick={() => handlePreviewInvoice(selected)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <FileText className="w-4 h-4 ml-2" />
                    معاينة الفاتورة
                  </Button>
                  <Button
                    onClick={() => handlePrintInvoice(selected)}
                    className="bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Printer className="w-4 h-4 ml-2" />
                    طباعة
                  </Button>
                  
                  <div className="w-px h-8 bg-gray-300 mx-1 hidden sm:block"></div>

                  <Button variant="outline" onClick={() => handleSendEmail(selected)} className="hover:bg-gray-50">
                    <Mail className="w-4 h-4 ml-2 text-gray-600" />
                    إرسال بريد
                  </Button>
                  <Button variant="outline" onClick={() => handleSendWhatsApp(selected)} className="hover:bg-gray-50">
                    <MessageCircle className="w-4 h-4 ml-2 text-green-600" />
                    واتساب
                  </Button>
                  
                  {selected.receiptUrl && (
                     <a
                        href={selected.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                     >
                        <Receipt className="w-4 h-4" />
                        الإيصال
                     </a>
                  )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMessagePreview && selectedRecordForWhatsApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-8 z-50"
            dir="rtl"
            onClick={() => {
              if (!sendingWhatsAppId) {
                setShowMessagePreview(false);
                setSelectedRecordForWhatsApp(null);
                setPreviewMessage('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#f0f2f5] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col h-[600px] border border-gray-200"
            >
              {/* Header */}
              <div className="bg-[#008069] text-white p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">معاينة الرسالة</h2>
                    <p className="text-xs text-white/80">
                      إلى: {selectedRecordForWhatsApp.customerName || 'غير محدد'} ({formatPhoneForApi(selectedRecordForWhatsApp.customerPhone) || '—'})
                    </p>
                  </div>
                </div>
                <button
                  className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                  onClick={() => {
                     if (!sendingWhatsAppId) {
                        setShowMessagePreview(false);
                        setSelectedRecordForWhatsApp(null);
                        setPreviewMessage('');
                     }
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Area (Simulation) */}
              <div className="flex-1 p-4 overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                <div className="flex flex-col gap-2">
                   <div className="self-center bg-[#e1f3fb] text-gray-800 text-xs px-3 py-1 rounded-lg shadow-sm mb-4">
                      {formatDate(new Date())}
                   </div>

                   <div className="self-end bg-[#d9fdd3] text-gray-900 status-paid p-3 rounded-lg rounded-tl-none shadow-sm max-w-[90%] text-sm whitespace-pre-wrap relative">
                      {previewMessage}
                      <span className="text-[10px] text-gray-500 block text-left mt-1 flex items-center justify-end gap-1">
                         <span>12:00 م</span>
                         <span className="text-blue-500">✓✓</span>
                      </span>
                   </div>
                </div>
              </div>

              {/* Editor & Actions */}
              <div className="bg-white p-3 border-t border-gray-200">
                <label className="block text-xs font-semibold text-gray-500 mb-2 px-1">
                   تعديل نص الرسالة:
                </label>
                <textarea
                  value={previewMessage}
                  onChange={(e) => setPreviewMessage(e.target.value)}
                  className="w-full h-32 p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00a884] focus:border-[#00a884] resize-none text-sm"
                  placeholder="اكتب رسالتك هنا..."
                />
                
                <div className="flex items-center justify-between mt-3 gap-2">
                   <div className="flex gap-2">
                      <Button
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const originalMessage = buildWhatsAppMessage(selectedRecordForWhatsApp);
                          setPreviewMessage(originalMessage);
                          toast.success('تم استعادة الرسالة الأصلية');
                        }}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                         <RotateCcw className="w-3.5 h-3.5 mr-1" />
                         استعادة الأصل
                      </Button>
                   </div>
                   
                   <div className="flex gap-2">
                      <Button
                         variant="ghost"
                         onClick={() => {
                            if (!sendingWhatsAppId) {
                               setShowMessagePreview(false);
                               setSelectedRecordForWhatsApp(null);
                               setPreviewMessage('');
                            }
                         }}
                         disabled={!!sendingWhatsAppId}
                         className="text-gray-600 hover:bg-gray-100"
                      >
                         إلغاء
                      </Button>
                      <Button
                         onClick={sendWhatsAppApiConfirmed}
                         disabled={!previewMessage.trim() || sendingWhatsAppId === selectedRecordForWhatsApp.id}
                         className="bg-[#00a884] hover:bg-[#008f6f] text-white px-6 shadow-md"
                      >
                         {sendingWhatsAppId === selectedRecordForWhatsApp.id ? (
                            <>
                               <Loader2 className="w-4 h-4 animate-spin ml-2" />
                               جاري الإرسال
                            </>
                         ) : (
                            <>
                               إرسال
                               <Send className="w-4 h-4 mr-2" />
                            </>
                         )}
                      </Button>
                   </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInvoicePreview && previewInvoiceRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center px-4 py-8 z-50"
            dir="rtl"
            onClick={() => {
              setShowInvoicePreview(false);
              setPreviewInvoiceRecord(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden border border-white/20"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">معاينة الفاتورة</h2>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      رقم الفاتورة: 
                      <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded ml-1">{previewInvoiceRecord.invoiceNumber}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handlePrintFromPreview}
                    className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة الآن
                  </Button>
                  <button
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                    onClick={() => {
                      setShowInvoicePreview(false);
                      setPreviewInvoiceRecord(null);
                    }}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Invoice Content */}
              <div className="flex-1 overflow-hidden bg-gray-100/50 p-4 sm:p-8 flex items-center justify-center">
                <div className="w-full h-full bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
                  <iframe
                    srcDoc={generateInvoiceHTML(previewInvoiceRecord)}
                    className="w-full h-full border-0"
                    title={`معاينة فاتورة ${ previewInvoiceRecord.invoiceNumber } `}
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white text-sm">
                <div className="flex gap-4 text-gray-500">
                   <div className="flex items-center gap-1">
                     <span className="font-medium">المصدر:</span> {previewInvoiceRecord.source}
                   </div>
                   <div className="hidden sm:flex items-center gap-1">
                     <span className="font-medium">التاريخ:</span> {formatDate(previewInvoiceRecord.createdAt)}
                   </div>
                </div>
                
                <div className="flex items-center gap-2">
                   <Button variant="outline" size="sm" onClick={() => setShowInvoicePreview(false)}>
                      إغلاق
                   </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
`;

try {
    let content = fs.readFileSync(filePath, 'utf8');
    let lines = content.split('\\n');

    // Keep lines up to targetLine. Note that lines array is 0-indexed, so index 1674 matches line 1675.
    // Verify line content just in case
    if (!lines[targetLine - 1].includes('</div>')) {
        console.log('WARNING: Line ' + targetLine + ' content is: ' + lines[targetLine - 1]);
    }

    let truncatedLines = lines.slice(0, targetLine);
    let newContent = truncatedLines.join('\\n') + newContentPart;

    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Successfully fixed file structure.');
} catch (err) {
    console.error('Error:', err);
}
