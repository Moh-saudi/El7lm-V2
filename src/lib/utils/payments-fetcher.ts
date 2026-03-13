import { collection, getDocs, orderBy, query, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { applyPaymentPrivacy } from './privacy-utils';
import { fixReceiptUrl } from './cloudflare-r2-utils';

/**
 * جلب المدفوعات من Firestore بطريقة محسّنة
 * - تقليل عدد المجموعات المستخدمة
 * - دعم Pagination
 * - إخفاء البيانات الحساسة
 */
export async function fetchPaymentsOptimized(options: {
    showFullData?: boolean;
    maxResults?: number;
    onProgress?: (current: number, total: number) => void;
}) {
    const { showFullData = false, maxResults = 100, onProgress } = options;

    // ✅ المجموعات التي تحتوي على معاملات مالية مع تحديد حقل الترتيب لكل منها
    const essentialCollections = [
        { name: 'bulkPayments', sortField: 'createdAt' },
        { name: 'geidea_payments', sortField: 'createdAt' },
        { name: 'payments', sortField: 'createdAt' },
        { name: 'wallet', sortField: 'createdAt' },
        { name: 'instapay', sortField: 'createdAt' },
        { name: 'vodafone_cash', sortField: 'createdAt' },
        { name: 'tournament_payments', sortField: 'createdAt' },
        { name: 'payment_results', sortField: 'createdAt' },
        { name: 'invoices', sortField: 'created_at' }, // الفواتير تستخدم غالباً created_at
        { name: 'bulk_payments', sortField: 'createdAt' },
        { name: 'receipts', sortField: 'createdAt' },
        { name: 'proofs', sortField: 'createdAt' }
    ];

    let allPayments: any[] = [];
    const totalCollections = essentialCollections.length;
    let completedCollections = 0;

    const fetchPromises = essentialCollections.map(async (colConfig) => {
        const collectionName = colConfig.name;
        const sortField = colConfig.sortField;
        const paymentsFromCol: any[] = [];

        try {
            console.log(`📥 جاري جلب البيانات من ${collectionName} (ترتيب حسب ${sortField})...`);

            const collectionRef = collection(db, collectionName);
            const q = query(
                collectionRef,
                orderBy(sortField, 'desc'),
                firestoreLimit(maxResults)
            );

            const querySnapshot = await getDocs(q);

            querySnapshot.docs.forEach(doc => {
                const data = doc.data();

                // البحث عن معرف اللاعب
                const playerId = findPlayerId(data);

                // البحث عن بيانات اللاعب
                const { playerName, playerPhone, playerEmail } = extractPlayerInfo(data, collectionName);

                // البحث عن رابط الصورة ومعالجته باستخدام الأداة الموحدة
                let receiptUrl = fixReceiptUrl(
                    data.receiptImage || data.receiptUrl || data.receipt_url ||
                    data.image || data.photo || data.picture || data.url ||
                    data.screenshot || data.fileUrl || data.cloudflare_url || data.r2_url
                );

                const payment = {
                    id: doc.id,
                    collection: collectionName,
                    playerId: playerId || 'unknown',
                    playerName,
                    playerPhone,
                    playerEmail,
                    amount: Number(data.amount) || Number(data.totalAmount) || 0,
                    currency: data.currency || 'EGP',
                    status: data.status || 'pending',
                    paymentMethod: data.paymentMethod || data.payment_method || collectionName,
                    createdAt: data.createdAt || data.created_at || new Date(),
                    receiptImage: receiptUrl,
                    transactionId: data.transactionId || data.transaction_id,
                    // بيانات إضافية مهمة للعميل
                    packageType: data.packageType || data.package_type || data.packageName || data.package_description,
                    packageDescription: data.package_description || data.description || data.notes,
                    userId: data.userId || data.user_id,
                    accountType: data.accountType || data.account_type || data.userRole || data.type,
                    country: data.country || data.selectedCountry || data.location,
                    referralCode: data.referralCode || data.partnerCode,
                    subscriptionEnd: data.subscription_end || data.expiryDate || data.expiresAt,
                    notes: data.notes || data.comment || data.admin_notes,
                    ...data
                };

                // ✅ تطبيق الخصوصية
                const maskedPayment = applyPaymentPrivacy(payment, showFullData);
                paymentsFromCol.push(maskedPayment);
            });

            console.log(`✅ تم جلب ${querySnapshot.docs.length} مدفوعة من ${collectionName}`);

        } catch (error: any) {
            console.warn(`⚠️ خطأ في جلب البيانات من ${collectionName}:`, error.message);
            // نستمر في الجلب من المجموعات الأخرى
        } finally {
            completedCollections++;
            // تحديث التقدم
            if (onProgress) {
                onProgress(completedCollections, totalCollections);
            }
        }
        
        return paymentsFromCol;
    });

    const results = await Promise.all(fetchPromises);
    allPayments = results.flat();

    // فرز جميع المدفوعات حسب تاريخ الإنشاء من الأحدث للأقدم
    allPayments.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt).getTime() || 0;
        const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt).getTime() || 0;
        return timeB - timeA;
    });

    console.log(`📊 إجمالي المدفوعات المجلوبة: ${allPayments.length}`);
    return allPayments;
}

/**
 * البحث عن معرف اللاعب في الحقول المختلفة
 */
function findPlayerId(data: any): string | null {
    const playerIdFields = [
        'playerId', 'userId', 'customerId', 'user_id', 'player_id',
        'customer_id', 'player', 'user', 'customer', 'accountId', 'account_id'
    ];

    for (const field of playerIdFields) {
        if (data[field] && data[field].toString().trim() !== '') {
            return data[field].toString().trim();
        }
    }

    return null;
}

/**
 * استخراج معلومات اللاعب من البيانات
 */
function extractPlayerInfo(data: any, collectionName: string) {
    let playerName = 'غير محدد';
    let playerPhone = 'غير محدد';
    let playerEmail = 'غير محدد';

    // حالة خاصة لـ bulkPayments
    if (collectionName === 'bulkPayments' || collectionName === 'bulk_payments') {
        if (data.players && Array.isArray(data.players) && data.players.length > 0) {
            if (data.players.length === 1) {
                const player = data.players[0];
                if (player.name) {
                    playerName = player.name.trim();
                }
                if (player.phone) {
                    playerPhone = player.phone;
                }
            } else {
                // أكثر من لاعب
                const playerNames = data.players
                    .map((p: any) => p.name || p.playerName || '')
                    .filter((name: string) => name && name.trim())
                    .map((name: string) => name.trim());

                if (playerNames.length > 0) {
                    if (playerNames.length <= 3) {
                        playerName = playerNames.join(' - ');
                    } else {
                        playerName = `${playerNames[0]} و ${playerNames.length - 1} لاعب آخر`;
                    }
                }
            }
        }
    }

    // البحث في الحقول العادية
    const nameFields = ['full_name', 'name', 'playerName', 'customerName', 'userName', 'displayName'];
    for (const field of nameFields) {
        if (data[field] && typeof data[field] === 'string' && data[field].trim()) {
            const foundName = data[field].trim();
            if (foundName !== 'player' && foundName !== 'user' && foundName.length > 2) {
                playerName = foundName;
                break;
            }
        }
    }

    // البحث عن رقم الهاتف
    const phoneFields = [
        'phone', 'playerPhone', 'customerPhone', 'phoneNumber', 'phone_number',
        'whatsapp', 'mobile', 'user_phone', 'tel'
    ];
    for (const field of phoneFields) {
        if (data[field] && data[field].toString().trim()) {
            playerPhone = data[field].toString().trim();
            break;
        }
    }

    // البحث عن البريد الإلكتروني
    const emailFields = [
        'email', 'playerEmail', 'customerEmail', 'userEmail', 'user_email',
        'clientEmail', 'senderEmail'
    ];
    for (const field of emailFields) {
        const val = data[field];
        if (val && typeof val === 'string' && val.includes('@')) {
            playerEmail = val.trim();
            break;
        }
    }

    return { playerName, playerPhone, playerEmail };
}
