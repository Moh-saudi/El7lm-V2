<div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans text-slate-900" dir="rtl">
    <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    الفواتير والمدفوعات
                </h1>
                <p className="text-slate-500 mt-1">
                    إدارة شاملة لجميع العمليات المالية والفواتير
                </p>
            </div>
            <div className="flex gap-3">
                <Button variant="outline" onClick={load} disabled={loading} className="gap-2 bg-white hover:bg-slate-50 border-slate-200">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                    تحديث البيانات
                </Button>
                <Link href="/dashboard/admin/payments" className="inline-flex items-center rounded-lg border bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all hover:shadow-indigo-500/30">
                    الانتقال لصفحة المدفوعات
                </Link>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Invoices */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <FileText className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">الإجمالي</span>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-slate-800">{stats.count}</p>
                        <p className="text-sm text-slate-500 mt-1">فاتورة مسجلة</p>
                    </div>
                </Card>
            </motion.div>

            {/* Total Amount */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <Wallet2 className="w-6 h-6" />
                        </div>
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">تم التحصيل</Badge>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-slate-800">{formatCurrency(stats.totalAmount)}</p>
                        <p className="text-sm text-slate-500 mt-1">إجمالي الإيرادات</p>
                    </div>
                </Card>
            </motion.div>

            {/* Average */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl">
                            <Banknote className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-slate-800">{formatCurrency(stats.averageAmount)}</p>
                        <p className="text-sm text-slate-500 mt-1">متوسط قيمة الفاتورة</p>
                    </div>
                </Card>
            </motion.div>

            {/* Unique Clients */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl">
                            <Share2 className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-slate-800">{stats.uniqueClients}</p>
                        <p className="text-sm text-slate-500 mt-1">عميل فريد</p>
                    </div>
                </Card>
            </motion.div>
        </div>

        {/* Filters & Content */}
        <Card className="border-0 shadow-xl shadow-indigo-500/5 overflow-hidden bg-white/80 backdrop-blur-xl ring-1 ring-slate-200">
            {/* Filters Toolbar */}
            <div className="p-5 border-b border-slate-100 bg-white/50 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[280px]">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="بحث سريع..."
                            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all duration-200 placeholder:text-slate-400"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="pl-4 pr-9 py-2.5 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <option value="all">كل الحالات</option>
                                <option value="paid">مدفوع</option>
                                <option value="pending">قيد المراجعة</option>
                                <option value="overdue">متأخر</option>
                                <option value="cancelled">ملغي</option>
                            </select>
                        </div>

                        <div className="relative">
                            <select
                                value={filters.method}
                                onChange={(e) => handleFilterChange('method', e.target.value)}
                                className="px-4 py-2.5 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <option value="all">كل الطرق</option>
                                {methodOptions.map((method) => (
                                    <option key={method} value={method}>
                                        {METHOD_DETAILS[method]?.label || method}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="relative">
                            <select
                                value={filters.source}
                                onChange={(e) => handleFilterChange('source', e.target.value)}
                                className="px-4 py-2.5 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <option value="all">كل المصادر</option>
                                {sourceOptions.map((source) => (
                                    <option key={source} value={source}>
                                        {source}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mr-auto bg-slate-50 p-1 rounded-xl ring-1 ring-slate-200">
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                            className="bg-transparent border-0 text-sm p-1.5 focus:ring-0 text-slate-600"
                        />
                        <span className="text-slate-300">|</span>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                            className="bg-transparent border-0 text-sm p-1.5 focus:ring-0 text-slate-600"
                        />
                    </div>
                </div>
            </div>

            {/* Table (Desktop) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead className="bg-slate-50/80 text-slate-500 sticky top-0 backdrop-blur-sm z-10">
                        <tr>
                            <th className="px-4 py-4 font-semibold w-[60px]">#</th>
                            <th className="px-4 py-4 font-semibold">الفاتورة</th>
                            <th className="px-4 py-4 font-semibold">العميل</th>
                            <th className="px-4 py-4 font-semibold">التفاصيل</th>
                            <th className="px-4 py-4 font-semibold">المبلغ</th>
                            <th className="px-4 py-4 font-semibold">التاريخ</th>
                            <th className="px-4 py-4 font-semibold">الحالة</th>
                            <th className="px-4 py-4 font-semibold text-leftpl-6">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        <AnimatePresence>
                            {filtered.map((record, index) => (
                                <motion.tr
                                    key={`${record.source}-${record.id}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="hover:bg-slate-50/80 transition-colors group"
                                >
                                    <td className="px-4 py-4 text-slate-400 font-mono text-xs">{index + 1}</td>
                                    <td className="px-4 py-4">
                                        <div className="font-semibold text-slate-900">{record.invoiceNumber}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{record.source}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="font-medium text-slate-800">{record.customerName}</div>
                                        <div className="text-xs text-slate-500 mt-0.5 font-mono">{record.customerPhone}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="max-w-[180px]">
                                            <div className="text-slate-700 truncate" title={record.planName}>{record.planName || '—'}</div>
                                            {record.packageDuration && record.packageDuration !== 'غير محدد' && (
                                                <div className="text-xs text-purple-600 font-medium mt-0.5">{record.packageDuration}</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="font-bold text-slate-800">{formatCurrency(record.amount, record.currency)}</div>
                                        <div className="text-xs mt-0.5">{paymentDisplay(record)}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="text-slate-600">{formatDate(record.createdAt)}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        {statusDisplay(record.status)}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="w-8 h-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                onClick={() => setSelected(record)}
                                                title="تفاصيل"
                                            >
                                                <Info className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="w-8 h-8 text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                                                onClick={() => handlePreviewInvoice(record)}
                                                title="معاينة"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="w-8 h-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                onClick={() => handleSendWhatsApp(record)}
                                                title="واتساب"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-3">
                                        <Search className="w-12 h-12 opacity-20" />
                                        <p>لا توجد فواتير مطابقة للبحث</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile List View */}
            <div className="md:hidden divide-y divide-slate-100">
                <AnimatePresence>
                    {filtered.map((record, index) => (
                        <motion.div
                            key={`mobile-${record.source}-${record.id}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-4 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900">{record.invoiceNumber}</span>
                                        {statusDisplay(record.status)}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">{record.customerName}</p>
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-slate-900">{formatCurrency(record.amount, record.currency)}</span>
                                    <span className="text-xs text-slate-400">{formatDate(record.createdAt)}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 pl-1">
                                <div className="flex gap-1">
                                    {paymentDisplay(record)}
                                    {record.packageDuration && record.packageDuration !== 'غير محدد' && (
                                        <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 text-[10px] px-2">
                                            {record.packageDuration}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setSelected(record)} className="h-8 w-8 p-0 rounded-full bg-slate-100 text-slate-600">
                                        <Info className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleSendWhatsApp(record)} className="h-8 w-8 p-0 rounded-full bg-emerald-100 text-emerald-600">
                                        <MessageCircle className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </Card>
    </div>

    {/* Modals - Kept mostly same but with styled container */}
    {selected && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center px-4 py-8 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 max-w-3xl w-full p-6 space-y-6 relative overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{selected.invoiceNumber}</h2>
                        <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            {selected.source}
                        </p>
                    </div>
                    <button
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                        onClick={() => setSelected(null)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                            بيانات العميل
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">الاسم</span>
                                <span className="font-medium text-slate-900">{selected.customerName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">البريد</span>
                                <span className="font-medium text-slate-900">{selected.customerEmail || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">الهاتف</span>
                                <span className="font-medium text-slate-900 font-mono" dir="ltr">{selected.customerPhone || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                            تفاصيل الدفع
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">المبلغ</span>
                                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{formatCurrency(selected.amount, selected.currency)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">الطريقة</span>
                                <span>{METHOD_DETAILS[selected.paymentMethod]?.label || selected.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">الحالة</span>
                                <span>{STATUS_LABELS[selected.status]?.label || selected.status}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">تاريخ الإنشاء</span>
                                <span className="text-slate-700">{formatDate(selected.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {selected.notes && (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <h4 className="text-amber-800 font-medium text-sm mb-2">ملاحظات</h4>
                        <p className="text-amber-900/80 text-sm whitespace-pre-wrap">{selected.notes}</p>
                    </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                        onClick={() => handlePreviewInvoice(selected)}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
                    >
                        <FileText className="w-4 h-4" />
                        معاينة الفاتورة
                    </Button>
                    <Button
                        variant="outline"
                        className="inline-flex items-center gap-2"
                        onClick={() => handleSendWhatsApp(selected)}
                    >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        إرسال واتساب
                    </Button>
                    {selected.receiptUrl && (
                        <a
                            href={selected.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 text-slate-700"
                        >
                            <Receipt className="w-4 h-4" />
                            عرض الإيصال
                        </a>
                    )}
                </div>
            </div>
        </div>
    )}

    {/* Modal معاينة وتعديل رسالة الواتساب */}
    {
        showMessagePreview && selectedRecordForWhatsApp && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center px-4 py-8 z-50">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 relative">
                    <button
                        className="absolute left-4 top-4 text-gray-500 hover:text-gray-700"
                        onClick={() => {
                            setShowMessagePreview(false);
                            setSelectedRecordForWhatsApp(null);
                            setPreviewMessage('');
                        }}
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">معاينة رسالة الواتساب</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            يمكنك مراجعة وتعديل الرسالة قبل الإرسال
                        </p>
                    </div>

                    <div className="space-y-2 p-4 bg-slate-50 rounded-xl">
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">المستلم</span>
                            <span className="text-sm font-medium">{selectedRecordForWhatsApp.customerName || 'غير محدد'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">رقم الهاتف</span>
                            <span className="text-sm font-mono dir-ltr">{formatPhoneForApi(selectedRecordForWhatsApp.customerPhone)}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            محتوى الرسالة:
                        </label>
                        <textarea
                            value={previewMessage}
                            onChange={(e) => setPreviewMessage(e.target.value)}
                            className="w-full min-h-[300px] p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y font-sans text-sm bg-slate-50 focus:bg-white transition-colors"
                            placeholder="أدخل نص الرسالة..."
                            dir="rtl"
                        />
                        <p className="text-xs text-gray-400">
                            عدد الأحرف: {previewMessage.length}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-4 border-t">
                        <Button
                            onClick={sendWhatsAppApiConfirmed}
                            disabled={!previewMessage.trim() || sendingWhatsAppId === selectedRecordForWhatsApp.id}
                            className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700 text-white"
                        >
                            {sendingWhatsAppId === selectedRecordForWhatsApp.id ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    جاري الإرسال...
                                </>
                            ) : (
                                <>
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    إرسال الرسالة
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowMessagePreview(false);
                                setSelectedRecordForWhatsApp(null);
                                setPreviewMessage('');
                            }}
                            className="flex-1 min-w-[120px]"
                        >
                            إلغاء
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    {/* Modal معاينة الفاتورة */}
    {
        showInvoicePreview && previewInvoiceRecord && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center px-4 py-8 z-50">
                <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col ring-1 ring-slate-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">معاينة الفاتورة</h2>
                            <p className="text-sm text-slate-500 mt-1">
                                رقم الفاتورة: {previewInvoiceRecord.invoiceNumber}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                                onClick={() => {
                                    setShowInvoicePreview(false);
                                    setPreviewInvoiceRecord(null);
                                }}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Invoice Content */}
                    <div className="flex-1 overflow-hidden bg-slate-100 p-4 md:p-8 flex justify-center">
                        <div className="w-full h-full bg-white shadow-lg rounded-lg overflow-hidden max-w-[800px]">
                            <iframe
                                srcDoc={generateInvoiceHTML(previewInvoiceRecord)}
                                className="w-full h-full border-0"
                                title={`معاينة فاتورة ${previewInvoiceRecord.invoiceNumber}`}
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-white">
                        <div className="text-sm text-slate-500">
                            <span className="font-medium text-slate-900">{previewInvoiceRecord.source}</span>
                            <span className="mx-2">•</span>
                            {STATUS_LABELS[previewInvoiceRecord.status]?.label || previewInvoiceRecord.status}
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowInvoicePreview(false);
                                    setPreviewInvoiceRecord(null);
                                }}
                            >
                                إغلاق
                            </Button>
                            <Button
                                onClick={handlePrintFromPreview}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                طباعة PDF
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
</div >
