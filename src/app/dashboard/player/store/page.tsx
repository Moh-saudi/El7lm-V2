'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { referralService } from '@/lib/referral/referral-service';
import { SportsProduct, PurchaseOrder, POINTS_CONVERSION } from '@/types/referral';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Star,
  Heart,
  Eye,
  Filter,
  Search,
  ShoppingBag,
  CreditCard,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// بيانات المنتجات الرياضية
const SPORTS_PRODUCTS: SportsProduct[] = [
  {
    id: '1',
    name: 'كرة قدم احترافية',
    description: 'كرة قدم عالية الجودة مناسبة للتدريب واللعب الاحترافي',
    category: 'equipment',
    price: 25,
    pointsPrice: 250000,
    image: '/images/products/soccer-ball.jpg',
    stock: 50,
    isAvailable: true,
    createdAt: new Date()
  },
  {
    id: '2',
    name: 'حذاء كرة قدم ريال مدريد',
    description: 'حذاء رياضي رسمي لريال مدريد مع تكنولوجيا متقدمة',
    category: 'equipment',
    price: 120,
    pointsPrice: 1200000,
    image: '/images/products/real-madrid-shoes.jpg',
    stock: 20,
    isAvailable: true,
    createdAt: new Date()
  },
  {
    id: '3',
    name: 'قميص برشلونة رسمي',
    description: 'قميص رسمي لبرشلونة موسم 2024 مع طباعة اسم اللاعب',
    category: 'clothing',
    price: 80,
    pointsPrice: 800000,
    image: '/images/products/barcelona-jersey.jpg',
    stock: 30,
    isAvailable: true,
    createdAt: new Date()
  },
  {
    id: '4',
    name: 'ساعة رياضية ذكية',
    description: 'ساعة ذكية لتتبع الأداء الرياضي مع GPS',
    category: 'accessories',
    price: 200,
    pointsPrice: 2000000,
    image: '/images/products/smartwatch.jpg',
    stock: 15,
    isAvailable: true,
    createdAt: new Date()
  },
  {
    id: '5',
    name: 'بروتين مصل اللبن',
    description: 'بروتين عالي الجودة لبناء العضلات والتعافي',
    category: 'nutrition',
    price: 45,
    pointsPrice: 450000,
    image: '/images/products/protein.jpg',
    stock: 100,
    isAvailable: true,
    createdAt: new Date()
  },
  {
    id: '6',
    name: 'قفازات حارس المرمى',
    description: 'قفازات احترافية لحارس المرمى مع حماية ممتازة',
    category: 'equipment',
    price: 35,
    pointsPrice: 350000,
    image: '/images/products/goalkeeper-gloves.jpg',
    stock: 25,
    isAvailable: true,
    createdAt: new Date()
  }
];

interface PlayerRewards {
  playerId: string;
  totalPoints: number;
  availablePoints: number;
  totalEarnings: number;
  referralCount: number;
  badges: any[];
  lastUpdated: any;
}

export default function PlayerStorePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [playerRewards, setPlayerRewards] = useState<PlayerRewards | null>(null);
  const [products, setProducts] = useState<SportsProduct[]>(SPORTS_PRODUCTS);
  const [filteredProducts, setFilteredProducts] = useState<SportsProduct[]>(SPORTS_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<SportsProduct | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  useEffect(() => {
    if (user?.id) {
      loadPlayerData();
    }
  }, [user]);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, products]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      const rewards = await referralService.createOrUpdatePlayerRewards(user!.id);
      setPlayerRewards(rewards);
    } catch (error) {
      console.error('خطأ في تحميل بيانات اللاعب:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // فلترة حسب البحث
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // فلترة حسب الفئة
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  };

  const handlePurchase = (product: SportsProduct) => {
    setSelectedProduct(product);
    setPurchaseQuantity(1);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = async () => {
    if (!selectedProduct || !playerRewards) return;

    const totalPoints = selectedProduct.pointsPrice * purchaseQuantity;
    
    if (playerRewards.availablePoints < totalPoints) {
      toast.error('نقاطك غير كافية لشراء هذا المنتج');
      return;
    }

    try {
      // إنشاء طلب الشراء
      const purchaseOrder: Omit<PurchaseOrder, 'id'> = {
        playerId: user!.id,
        productId: selectedProduct.id,
        quantity: purchaseQuantity,
        totalPoints: totalPoints,
        status: 'pending',
        createdAt: new Date(),
        shippingAddress: {
          name: user?.user_metadata?.full_name || 'لاعب',
          phone: '',
          address: '',
          city: '',
          country: 'مصر'
        }
      };

      // هنا يمكن إضافة API call لحفظ طلب الشراء
      console.log('طلب شراء جديد:', purchaseOrder);

      // خصم النقاط من حساب اللاعب
      await referralService.addPointsToPlayer(
        user!.id,
        -totalPoints,
        `شراء ${selectedProduct.name}`
      );

      toast.success('تم شراء المنتج بنجاح! سيتم التواصل معك قريباً');
      setShowPurchaseModal(false);
      setSelectedProduct(null);
      
      // تحديث بيانات اللاعب
      await loadPlayerData();

    } catch (error) {
      console.error('خطأ في شراء المنتج:', error);
      toast.error('حدث خطأ في شراء المنتج');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'equipment':
        return '⚽';
      case 'clothing':
        return '👕';
      case 'accessories':
        return '⌚';
      case 'nutrition':
        return '💪';
      default:
        return '🛍️';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'equipment':
        return 'معدات رياضية';
      case 'clothing':
        return 'ملابس رياضية';
      case 'accessories':
        return 'إكسسوارات';
      case 'nutrition':
        return 'تغذية رياضية';
      default:
        return 'جميع المنتجات';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">متجر المنتجات الرياضية</h1>
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-blue-500" />
          <span className="text-lg font-semibold">متجر النقاط</span>
        </div>
      </div>

      {/* بطاقة النقاط */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">النقاط المتوفرة</p>
                <p className="text-3xl font-bold">{playerRewards?.availablePoints.toLocaleString()}</p>
                <p className="text-sm text-blue-100">
                  ≈ ${(playerRewards?.availablePoints || 0) / POINTS_CONVERSION.POINTS_PER_DOLLAR} 
                  ({((playerRewards?.availablePoints || 0) / POINTS_CONVERSION.POINTS_PER_DOLLAR * POINTS_CONVERSION.DOLLAR_TO_EGP).toFixed(2)} ج.م)
                </p>
              </div>
              <DollarSign className="w-12 h-12" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* البحث والفلترة */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row gap-4"
      >
        <div className="flex-1">
          <Input
            placeholder="البحث في المنتجات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
          >
            جميع المنتجات
          </Button>
          <Button
            variant={selectedCategory === 'equipment' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('equipment')}
          >
            ⚽ معدات
          </Button>
          <Button
            variant={selectedCategory === 'clothing' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('clothing')}
          >
            👕 ملابس
          </Button>
          <Button
            variant={selectedCategory === 'accessories' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('accessories')}
          >
            ⌚ إكسسوارات
          </Button>
          <Button
            variant={selectedCategory === 'nutrition' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('nutrition')}
          >
            💪 تغذية
          </Button>
        </div>
      </motion.div>

      {/* المنتجات */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {filteredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-4xl">{getCategoryIcon(product.category)}</span>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      المخزون: {product.stock}
                    </div>
                    <Badge variant={product.isAvailable ? 'default' : 'secondary'}>
                      {product.isAvailable ? 'متوفر' : 'غير متوفر'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">السعر:</span>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">${product.price}</div>
                        <div className="text-xs text-gray-500">
                          {product.pointsPrice.toLocaleString()} نقطة
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handlePurchase(product)}
                      disabled={!product.isAvailable || (playerRewards?.availablePoints || 0) < product.pointsPrice}
                      className="w-full"
                      size="sm"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      شراء بالنقاط
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* مودال الشراء */}
      {showPurchaseModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">تأكيد الشراء</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPurchaseModal(false)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">{getCategoryIcon(selectedProduct.category)}</span>
                </div>
                <div>
                  <h4 className="font-semibold">{selectedProduct.name}</h4>
                  <p className="text-sm text-gray-600">{selectedProduct.description}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>السعر للقطعة:</span>
                  <span className="font-semibold">{selectedProduct.pointsPrice.toLocaleString()} نقطة</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>الكمية:</span>
                  <Input
                    type="number"
                    min="1"
                    max={selectedProduct.stock}
                    value={purchaseQuantity}
                    onChange={(e) => setPurchaseQuantity(parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                </div>
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>الإجمالي:</span>
                  <span className="text-green-600">
                    {(selectedProduct.pointsPrice * purchaseQuantity).toLocaleString()} نقطة
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={confirmPurchase}
                  disabled={(playerRewards?.availablePoints || 0) < (selectedProduct.pointsPrice * purchaseQuantity)}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  تأكيد الشراء
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 
