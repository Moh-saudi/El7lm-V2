import { supabase } from '@/lib/supabase/config';
import { applyPaymentPrivacy } from './privacy-utils';
import { fixReceiptUrl } from './cloudflare-r2-utils';

/**
 * جلب المدفوعات من Supabase بطريقة محسّنة
 */
export async function fetchPaymentsOptimized(options: {
    showFullData?: boolean;
    maxResults?: number;
    onProgress?: (current: number, total: number) => void;
}) {
    const { showFullData = false, maxResults = 100, onProgress } = options;

    const essentialTables = [
        { name: 'bulkPayments', sortField: 'createdAt' },
        { name: 'geidea_payments', sortField: 'createdAt' },
        { name: 'payments', sortField: 'createdAt' },
        { name: 'wallet', sortField: 'createdAt' },
        { name: 'instapay', sortField: 'createdAt' },
        { name: 'vodafone_cash', sortField: 'createdAt' },
        { name: 'tournament_payments', sortField: 'createdAt' },
        { name: 'payment_results', sortField: 'createdAt' },
        { name: 'invoices', sortField: 'created_at' },
        { name: 'bulk_payments', sortField: 'createdAt' },
        { name: 'receipts', sortField: 'createdAt' },
        { name: 'proofs', sortField: 'createdAt' },
    ];

    let allPayments: Record<string, unknown>[] = [];
    const totalTables = essentialTables.length;
    let completedTables = 0;

    const fetchPromises = essentialTables.map(async (tableConfig) => {
        const tableName = tableConfig.name;
        const sortField = tableConfig.sortField;
        const paymentsFromTable: Record<string, unknown>[] = [];

        try {
            console.log(`📥 جاري جلب البيانات من ${tableName}...`);

            const { data } = await supabase
                .from(tableName)
                .select('*')
                .order(sortField, { ascending: false })
                .limit(maxResults);

            (data ?? []).forEach((row: Record<string, unknown>) => {
                const playerId = findPlayerId(row);
                const { playerName, playerPhone, playerEmail } = extractPlayerInfo(row, tableName);

                const receiptUrl = fixReceiptUrl(
                    String(row.receiptImage || row.receiptUrl || row.receipt_url ||
                    row.image || row.photo || row.picture || row.url ||
                    row.screenshot || row.fileUrl || row.cloudflare_url || row.r2_url || '')
                );

                const payment: Record<string, unknown> = {
                    ...row,
                    id: row.id,
                    collection: tableName,
                    playerId: playerId || 'unknown',
                    playerName,
                    playerPhone,
                    playerEmail,
                    amount: Number(row.amount) || Number(row.totalAmount) || 0,
                    currency: row.currency || 'EGP',
                    status: row.status || 'pending',
                    paymentMethod: row.paymentMethod || row.payment_method || tableName,
                    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
                    receiptImage: receiptUrl,
                    transactionId: row.transactionId || row.transaction_id,
                    packageType: row.packageType || row.package_type || row.packageName || row.package_description,
                    packageDescription: row.package_description || row.description || row.notes,
                    userId: row.userId || row.user_id,
                    accountType: row.accountType || row.account_type || row.userRole || row.type,
                    country: row.country || row.selectedCountry || row.location,
                    referralCode: row.referralCode || row.partnerCode,
                    subscriptionEnd: row.subscription_end || row.expiryDate || row.expiresAt,
                    notes: row.notes || row.comment || row.admin_notes,
                };

                const maskedPayment = applyPaymentPrivacy(payment, showFullData);
                paymentsFromTable.push(maskedPayment);
            });

            console.log(`✅ تم جلب ${(data ?? []).length} مدفوعة من ${tableName}`);
        } catch (error: unknown) {
            console.warn(`⚠️ خطأ في جلب البيانات من ${tableName}:`, error instanceof Error ? error.message : error);
        } finally {
            completedTables++;
            if (onProgress) onProgress(completedTables, totalTables);
        }

        return paymentsFromTable;
    });

    const results = await Promise.all(fetchPromises);
    allPayments = results.flat();

    allPayments.sort((a, b) => {
        const timeA = new Date(String(a.createdAt || 0)).getTime();
        const timeB = new Date(String(b.createdAt || 0)).getTime();
        return timeB - timeA;
    });

    console.log(`📊 إجمالي المدفوعات المجلوبة: ${allPayments.length}`);
    return allPayments;
}

function findPlayerId(data: Record<string, unknown>): string | null {
    const playerIdFields = ['playerId', 'userId', 'customerId', 'user_id', 'player_id', 'customer_id', 'player', 'user', 'customer', 'accountId', 'account_id'];
    for (const field of playerIdFields) {
        if (data[field] && String(data[field]).trim() !== '') return String(data[field]).trim();
    }
    return null;
}

function extractPlayerInfo(data: Record<string, unknown>, tableName: string) {
    let playerName = 'غير محدد';
    let playerPhone = 'غير محدد';
    let playerEmail = 'غير محدد';

    if (tableName === 'bulkPayments' || tableName === 'bulk_payments') {
        if (data.players && Array.isArray(data.players) && data.players.length > 0) {
            const players = data.players as Record<string, unknown>[];
            if (players.length === 1) {
                if (players[0].name) playerName = String(players[0].name).trim();
                if (players[0].phone) playerPhone = String(players[0].phone);
            } else {
                const names = players.map(p => String(p.name || p.playerName || '')).filter(n => n.trim()).map(n => n.trim());
                if (names.length > 0) playerName = names.length <= 3 ? names.join(' - ') : `${names[0]} و ${names.length - 1} لاعب آخر`;
            }
        }
    }

    for (const field of ['full_name', 'name', 'playerName', 'customerName', 'userName', 'displayName']) {
        if (data[field] && typeof data[field] === 'string' && String(data[field]).trim()) {
            const found = String(data[field]).trim();
            if (found !== 'player' && found !== 'user' && found.length > 2) { playerName = found; break; }
        }
    }

    for (const field of ['phone', 'playerPhone', 'customerPhone', 'phoneNumber', 'phone_number', 'whatsapp', 'mobile', 'user_phone', 'tel']) {
        if (data[field] && String(data[field]).trim()) { playerPhone = String(data[field]).trim(); break; }
    }

    for (const field of ['email', 'playerEmail', 'customerEmail', 'userEmail', 'user_email', 'clientEmail', 'senderEmail']) {
        const val = data[field];
        if (val && typeof val === 'string' && val.includes('@')) { playerEmail = val.trim(); break; }
    }

    return { playerName, playerPhone, playerEmail };
}
