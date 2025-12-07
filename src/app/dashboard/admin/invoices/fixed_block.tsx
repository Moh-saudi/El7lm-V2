const [filters, setFilters] = useState({
    status: 'all',
    method: 'all',
    source: 'all',
    dateFrom: '',
    dateTo: '',
});
const [selected, setSelected] = useState<InvoiceRecord | null>(null);
const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);
const [showMessagePreview, setShowMessagePreview] = useState(false);
const [previewMessage, setPreviewMessage] = useState('');
const [selectedRecordForWhatsApp, setSelectedRecordForWhatsApp] = useState<InvoiceRecord | null>(null);
const [showInvoicePreview, setShowInvoicePreview] = useState(false);
const [previewInvoiceRecord, setPreviewInvoiceRecord] = useState<InvoiceRecord | null>(null);

/**
 * إثراء معلومات الباقة لسجلات جيديا من بيانات المستخدمين
 */
const enrichPackageInfoForInvoices = async (records: InvoiceRecord[]) => {
    // فقط لسجلات جيديا التي لا تحتوي على معلومات الباقة
    const geideaRecordsNeedingEnrichment = records.filter(
        (r) => r.source === 'geidea_payments' && !r.planName && r.customerEmail
    );

    if (geideaRecordsNeedingEnrichment.length === 0) {
        return;
    }

    console.log(`📦 [Invoices] Enriching ${geideaRecordsNeedingEnrichment.length} Geidea records with package info...`);

    // جلب معلومات المستخدمين بناءً على الإيميل
    const uniqueEmails = [...new Set(geideaRecordsNeedingEnrichment.map((r) => r.customerEmail).filter(Boolean))];

    const emailToPackageMap: Record<string, { planName: string; packageType: string; packageDuration: string }> = {};

    // استعلام مجمّع لتحسين الأداء
    for (const email of uniqueEmails) {
        if (!email) continue;

        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', email));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const userData = snapshot.docs[0].data();
                const packageType = userData.selectedPackage || userData.packageType || userData.package_type;
                const planName = userData.plan_name || packageType;

                if (packageType || planName) {
                    emailToPackageMap[email] = {
                        planName: planName || packageType || '',
                        packageType: packageType || '',
                        packageDuration: getPackageDurationLabel(planName, packageType),
                    };
                    console.log(`✅ [Invoices] Found package for ${email}: ${planName}`);
                }
            }
        } catch (error) {
            console.warn(`⚠️ [Invoices] Failed to fetch user data for ${email}:`, error);
        }
    }

    // تحديث السجلات بمعلومات الباقة
    geideaRecordsNeedingEnrichment.forEach((record) => {
        if (record.customerEmail && emailToPackageMap[record.customerEmail]) {
            const packageInfo = emailToPackageMap[record.customerEmail];
            record.planName = packageInfo.planName;
            record.packageDuration = packageInfo.packageDuration;
            // حساب expiryDate بناءً على الباقة
            record.expiryDate = calculateExpiryDate(
                { ...record.raw, packageType: packageInfo.packageType, plan_name: packageInfo.planName },
                record.createdAt
            );
        }
    });

    console.log(`✨ [Invoices] Enrichment complete!`);
};

const load = async () => {
    setLoading(true);
    try {
        const aggregated: InvoiceRecord[] = [];
        for (const cfg of COLLECTIONS) {
            try {
                const ref = collection(db, cfg.name);
                const snap = cfg.orderBy
                    ? await getDocs(query(ref, orderBy(cfg.orderBy, 'desc')))
                    : await getDocs(ref);
                snap.forEach((docSnap) =>
                    aggregated.push(normalizeRecord(cfg.name, docSnap.id, docSnap.data())),
                );
            } catch (error) {
                console.warn(`⚠️ Failed to load ${cfg.name}:`, error);
            }
        }

        // ✅ استبعاد الفواتير الخاصة بـ contact@fakhracademy.com
        const filteredRecords = aggregated.filter(
            (record) => record.customerEmail !== 'contact@fakhracademy.com'
        );

        filteredRecords.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        // ✨ إثراء معلومات الباقة لسجلات جيديا
        await enrichPackageInfoForInvoices(filteredRecords);

        setRecords(filteredRecords);
    } finally {
        setLoading(false);
    }
};

useEffect(() => {
    load();
}, []);

const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
        const text = [
            record.invoiceNumber,
            record.customerName,
            record.customerEmail,
            record.customerPhone,
            record.planName,
            record.reference.orderId,
            record.reference.transactionId,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        if (term && !text.includes(term)) return false;
        if (filters.status !== 'all' && record.status !== filters.status) return false;
        if (filters.method !== 'all' && record.paymentMethod !== filters.method) return false;
        if (filters.source !== 'all' && record.source !== filters.source) return false;

        if (filters.dateFrom) {
            const from = new Date(filters.dateFrom);
            if (record.createdAt < from) return false;
        }
        if (filters.dateTo) {
            const to = new Date(filters.dateTo);
            to.setHours(23, 59, 59, 999);
            if (record.createdAt > to) return false;
        }
        return true;
    });
}, [records, search, filters]);
