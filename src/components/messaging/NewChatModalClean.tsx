// NewChatModal Component - Clean Version
const NewChatModalClean: React.FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onStartChat: (user: any) => void;
}> = ({ isOpen, onOpenChange, onStartChat }) => {
    const { user } = useAuth();
    const [queryText, setQueryText] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Debounced Search
    useEffect(() => {
        if (!isOpen) {
            setQueryText('');
            setResults([]);
            return;
        }

        if (!queryText.trim() || queryText.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        const delayDebounce = setTimeout(async () => {
            try {
                const normalized = queryText.trim().toLowerCase();
                const combinedResults: any[] = [];
                const distinctIds = new Set<string>();

                // Search in all collections
                const collections = [
                    { ref: collection(db, 'users'), type: 'user' },
                    { ref: collection(db, 'players'), type: 'player' },
                    { ref: collection(db, 'clubs'), type: 'club' }
                ];

                for (const { ref: colRef, type } of collections) {
                    const q = query(colRef, limit(20));
                    const snapshot = await getDocs(q);

                    snapshot.forEach(doc => {
                        if (doc.id === user?.uid) return;
                        const data = doc.data();
                        const name = (data.displayName || data.name || data.full_name || data.club_name || '').toLowerCase();
                        const email = (data.email || '').toLowerCase();

                        if (name.includes(normalized) || email.includes(normalized)) {
                            if (!distinctIds.has(doc.id)) {
                                distinctIds.add(doc.id);
                                combinedResults.push({
                                    id: doc.id,
                                    name: data.displayName || data.name || data.full_name || data.club_name || 'مستخدم',
                                    avatar: data.photoURL || data.avatar || data.logo || '',
                                    type,
                                    email: data.email || ''
                                });
                            }
                        }
                    });
                }

                setResults(combinedResults);
            } catch (error) {
                console.error('Search Error:', error);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [queryText, isOpen, user]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 overflow-hidden shadow-2xl sm:max-w-3xl gap-0 [&>button]:hidden">
                <DialogTitle className="sr-only">بدء محادثة جديدة</DialogTitle>
                <DialogDescription className="sr-only">ابحث عن مستخدم لبدء محادثة</DialogDescription>

                {/* Header */}
                <div className="p-5 border-b bg-white" dir="rtl">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                            <input
                                type="text"
                                placeholder="ابحث عن مستخدم، لاعب أو نادي..."
                                value={queryText}
                                onChange={(e) => setQueryText(e.target.value)}
                                className="h-14 w-full rounded-full bg-gray-100 px-12 py-4 text-lg font-medium outline-none placeholder:text-gray-400 text-right border-0 focus:ring-2 focus:ring-blue-500 transition-all"
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="p-3 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                        >
                            <Plus className="h-5 w-5 rotate-45 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-[500px] overflow-y-auto p-5" dir="rtl">
                    {loading ? (
                        <div className="flex flex-col items-center gap-4 py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                            <p className="text-gray-500 text-base font-medium">جاري البحث...</p>
                        </div>
                    ) : results.length === 0 && queryText ? (
                        <div className="flex flex-col items-center gap-4 py-20">
                            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center">
                                <Search className="h-10 w-10 text-gray-300" />
                            </div>
                            <p className="text-gray-500 text-base">لا توجد نتائج</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex flex-col items-center gap-4 py-20">
                            <UserPlus className="h-16 w-16 text-gray-300" />
                            <p className="text-gray-400 text-base">ابدأ البحث عن مستخدم</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {results.map((res) => (
                                <button
                                    key={res.id}
                                    onClick={() => {
                                        onStartChat(res);
                                        onOpenChange(false);
                                    }}
                                    className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-all text-right group"
                                >
                                    <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-white shadow-md ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all">
                                        <AvatarImage src={res.avatar} className="object-cover" />
                                        <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                                            {res.name?.[0]?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0 text-right">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                                {res.name}
                                            </h3>
                                            {res.type !== 'user' && (
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${res.type === 'club' ? 'bg-orange-100 text-orange-700' :
                                                        res.type === 'player' ? 'bg-emerald-100 text-emerald-700' :
                                                            'bg-gray-100'
                                                    }`}>
                                                    {res.type === 'player' ? '👤 لاعب' : res.type === 'club' ? '⚽ نادي' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 truncate">{res.email}</p>
                                    </div>

                                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="h-11 w-11 rounded-full bg-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <UserPlus className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {results.length > 0 && (
                    <div className="px-5 py-4 border-t bg-gray-50/50" dir="rtl">
                        <p className="text-sm font-medium text-gray-600">
                            تم العثور على {results.length} نتيجة
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
