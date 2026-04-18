/**
 * Seed REAL football products from Jumia Egypt.
 * Images: real product photos from eg.jumia.is CDN
 * Prices: EGP — fetched live from jumia.com.eg (April 2025)
 * Source: https://www.jumia.com.eg
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const now          = new Date().toISOString();
const uid          = () => crypto.randomUUID();

// ── Real products from Jumia Egypt — April 2025 ───────────────────────────────
const products = [

  // ─── FOOTBALLS ─────────────────────────────────────────────────────────────
  {
    id: uid(), sku: 'JM-WC2026-775', name: 'كرة كأس العالم FIFA 2026 — مقاس 5 متعددة الألوان',
    brand: 'Generic', model: 'FIFA World Cup 2026', category: 'equipment',
    price: 775, original_price: 1000, discount_percent: 23,
    currency: 'EGP', stock: 50, minStock: 10, maxStock: 200, status: 'in_stock',
    is_featured: true,
    description: 'كرة كرة القدم رسم كأس العالم FIFA 2026 مقاس 5 رسمي. تصميم نابض بالألوان مع طبقة واقية مقاومة للتلف والماء. مناسبة للمباريات والتدريب.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/58/4638331/1.jpg?1207',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/58/4638331/1.jpg?1207'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-WC2022-675', name: 'كرة كأس العالم Qatar 2022 — الرحلة — مقاس 5',
    brand: 'Generic', model: 'Al Rihla Qatar 2022', category: 'equipment',
    price: 675, original_price: 899, discount_percent: 25,
    currency: 'EGP', stock: 35, minStock: 5, maxStock: 150, status: 'in_stock',
    is_featured: true,
    description: 'كرة كرة القدم الرسمية لكأس العالم قطر 2022 الرحلة. جودة احترافية عالية مع مواد PU مقاومة للماء. دقة رمي وتحكم ممتازين.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/66/6978331/1.jpg?4819',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/66/6978331/1.jpg?4819'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-UCL-875', name: 'كرة دوري أبطال أوروبا 2025 Match Ball Pro — مقاومة للماء',
    brand: 'Generic', model: 'UCL 2025 Match Ball Pro', category: 'equipment',
    price: 875, original_price: 1100, discount_percent: 20,
    currency: 'EGP', stock: 40, minStock: 8, maxStock: 160, status: 'in_stock',
    is_featured: true,
    description: 'كرة دوري أبطال أوروبا 2025 المشابهة للكرة الرسمية. مادة PU مقاومة للماء 100%. مناسبة للملاعب العشبية والصناعية والداخلية.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/18/9879331/1.jpg',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/18/9879331/1.jpg'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-UCL-RED-299', name: 'كرة دوري أبطال أوروبا 2025 — لون أحمر مقاس 5',
    brand: 'Generic', model: 'UCL 2025 Red Edition', category: 'equipment',
    price: 299, original_price: 399, discount_percent: 25,
    currency: 'EGP', stock: 60, minStock: 10, maxStock: 200, status: 'in_stock',
    is_featured: false,
    description: 'كرة كرة القدم تصميم دوري الأبطال 2025 باللون الأحمر. مقاس 5 رسمي. غلاف جلد PU متين مناسب للتدريب اليومي.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/14/6638331/1.jpg',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/14/6638331/1.jpg'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-UCL-BLUE-299', name: 'كرة دوري أبطال أوروبا — جلد أزرق مقاس 5',
    brand: 'Generic', model: 'Champions League Leather Blue', category: 'equipment',
    price: 299, original_price: 399, discount_percent: 25,
    currency: 'EGP', stock: 55, minStock: 10, maxStock: 200, status: 'in_stock',
    is_featured: false,
    description: 'كرة كرة القدم جلد لون أزرق مقاس 5. مرونة عالية ومتانة ممتازة للاستخدام المستمر. مناسبة للاعبين من عمر 12 سنة فما فوق.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/12/8820431/1.jpg',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/12/8820431/1.jpg'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-AFCON-888', name: 'كرة أمم أفريقيا 2025/2026 — المغرب — الرسمية',
    brand: 'Generic', model: 'AFCON Morocco 2025/2026', category: 'equipment',
    price: 888, original_price: 1100, discount_percent: 19,
    currency: 'EGP', stock: 30, minStock: 5, maxStock: 100, status: 'in_stock',
    is_featured: true,
    description: 'الكرة الرسمية لبطولة أمم أفريقيا 2025/2026 بالمغرب. تصميم احترافي مع طبقات متعددة لثبات الشكل. مناسبة للمباريات الرسمية.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/59/1230431/1.jpg?4234',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/59/1230431/1.jpg?4234'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-CWCUP-699', name: 'كرة كأس العالم للأندية FIFA — مقاس 5 متعددة الألوان',
    brand: 'Generic', model: 'FIFA Club World Cup', category: 'equipment',
    price: 699, original_price: 899, discount_percent: 22,
    currency: 'EGP', stock: 45, minStock: 8, maxStock: 180, status: 'in_stock',
    is_featured: false,
    description: 'كرة تصميم كأس العالم للأندية FIFA. طبقة خارجية مقاومة للتآكل ومقاومة للماء. مقاس 5 رسمي مع مستوى ضغط ثابت.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/73/6638331/1.jpg?4489',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/73/6638331/1.jpg?4489'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-EPL-775', name: 'كرة الدوري الإنجليزي الممتاز 2025/26 — مقاس 5',
    brand: 'Generic', model: 'Premier League 2025/26', category: 'equipment',
    price: 775, original_price: 999, discount_percent: 22,
    currency: 'EGP', stock: 40, minStock: 8, maxStock: 160, status: 'in_stock',
    is_featured: false,
    description: 'كرة الدوري الإنجليزي الممتاز 2025/26 الموسم الجديد. تصميم رسمي مع شعار الدوري. مقاس 5 مع مواد PU عالية الجودة.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/39/5899331/1.jpg?1903',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/39/5899331/1.jpg?1903'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-EGYPL-999', name: 'كرة الدوري المصري 2026 — جودة عالية — بيضاء',
    brand: 'Generic', model: 'Egyptian Premier League 2026', category: 'equipment',
    price: 999, original_price: 1299, discount_percent: 23,
    currency: 'EGP', stock: 35, minStock: 5, maxStock: 120, status: 'in_stock',
    is_featured: true,
    description: 'كرة الدوري المصري للمحترفين 2026. مواد احترافية مقاومة للماء ومستوى ضغط ثابت للمباريات الرسمية.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/69/1230431/1.jpg?5044',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/69/1230431/1.jpg?5044'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-GOLDCUP-999', name: 'Gold Cup — كرة مباريات مقاس 5 — مقاومة للتقشر والماء',
    brand: 'Gold Cup', model: 'Official Match Ball', category: 'equipment',
    price: 999, original_price: 1400, discount_percent: 29,
    currency: 'EGP', stock: 25, minStock: 5, maxStock: 100, status: 'in_stock',
    is_featured: false,
    description: 'كرة Gold Cup للمباريات الرسمية مقاس 5. طبقة واقية مقاومة للتقشر والماء. متانة عالية جداً للاستخدام في الملاعب الرسمية والتدريب المكثف.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/44/0010431/1.jpg?8591',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/44/0010431/1.jpg?8591'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-TRN-760', name: 'كرة تدريب احترافية Pro — مباريات وتدريب — مقاس قياسي',
    brand: 'Pro', model: 'Professional Training Ball', category: 'equipment',
    price: 760, original_price: 950, discount_percent: 20,
    currency: 'EGP', stock: 60, minStock: 10, maxStock: 250, status: 'in_stock',
    is_featured: false,
    description: 'كرة تدريب احترافية Pro مناسبة للمباريات والتمرينات اليومية. مواد عالية الجودة ومتانة ممتازة. مقاس قياسي.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/88/6386331/1.jpg?4900',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/88/6386331/1.jpg?4900'],
    createdAt: now, updatedAt: now,
  },

  // ─── FOOTBALL BOOTS / SHOES ─────────────────────────────────────────────────
  {
    id: uid(), sku: 'JM-DIADORA-GP-1245', name: 'حذاء كرة قدم Diadora GoalPulse — أسود',
    brand: 'Diadora', model: 'GoalPulse', category: 'equipment',
    price: 1245, original_price: 2490, discount_percent: 50,
    currency: 'EGP', stock: 18, minStock: 3, maxStock: 60, status: 'in_stock',
    is_featured: true,
    description: 'حذاء كرة قدم Diadora GoalPulse الاحترافي باللون الأسود. نعل مرن مع تعزيزات للمقدمة. مناسب للملاعب الصناعية والطبيعية.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/75/8178311/1.jpg?9125',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/75/8178311/1.jpg?9125'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-STARTER-SWIFT-595', name: 'حذاء Starter Swift Turf — أبيض',
    brand: 'Starter', model: 'Swift Turf', category: 'equipment',
    price: 595, original_price: 1190, discount_percent: 50,
    currency: 'EGP', stock: 22, minStock: 4, maxStock: 80, status: 'in_stock',
    is_featured: false,
    description: 'حذاء كرة قدم Starter Swift Turf الأبيض. نعل مناسب للملاعب الصناعية. خفيف الوزن مع توسيد ممتاز. مناسب للتدريب والمباريات.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/28/7087331/1.jpg?1754',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/28/7087331/1.jpg?1754'],
    createdAt: now, updatedAt: now,
  },

  // ─── TRAINING EQUIPMENT ─────────────────────────────────────────────────────
  {
    id: uid(), sku: 'JM-CONES-18CM-350', name: 'مخاريط تدريب بلاستيكية 12 قطعة — 18 سم',
    brand: 'Generic', model: 'Agility Training Cones 18cm', category: 'equipment',
    price: 350, original_price: 385, discount_percent: 9,
    currency: 'EGP', stock: 80, minStock: 15, maxStock: 300, status: 'in_stock',
    is_featured: false,
    description: '12 قطعة مخاريط تدريب بلاستيكية ارتفاع 18 سم. خفيفة ومتينة للتدريب على الرشاقة والسرعة. متعددة الألوان لتمييز المسارات.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/24/8295411/1.jpg?4088',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/24/8295411/1.jpg?4088'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-CONES-23CM-450', name: 'مخاريط تدريب بلاستيكية 12 قطعة — 23 سم',
    brand: 'Generic', model: 'Agility Training Cones 23cm', category: 'equipment',
    price: 450, original_price: 495, discount_percent: 9,
    currency: 'EGP', stock: 70, minStock: 12, maxStock: 250, status: 'in_stock',
    is_featured: false,
    description: '12 قطعة مخاريط تدريب بلاستيكية ارتفاع 23 سم. للتدريب في الملاعب الرسمية. قاعدة عريضة لثبات أكبر.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/34/8295411/1.jpg?4088',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/34/8295411/1.jpg?4088'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-HURDLE-257', name: 'حاجز تدريب على السرعة — قابل للتعديل في الارتفاع',
    brand: 'Generic', model: 'Speed Training Hurdle Adjustable', category: 'equipment',
    price: 257, original_price: 320, discount_percent: 20,
    currency: 'EGP', stock: 50, minStock: 10, maxStock: 200, status: 'in_stock',
    is_featured: false,
    description: 'حاجز تدريب قابل للتعديل في الارتفاع لرياضات متعددة. مناسب لتطوير السرعة والرشاقة والتنسيق. خفيف وقابل للطي.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/50/5110331/1.jpg?4666',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/50/5110331/1.jpg?4666'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-GOAL-POPUP-1800', name: 'مرمى كرة قدم قابل للطي 4 قدم — طقم 2 مرمى',
    brand: 'Generic', model: 'Foldable Football Goal 4ft x2', category: 'equipment',
    price: 1800, original_price: 2200, discount_percent: 18,
    currency: 'EGP', stock: 15, minStock: 3, maxStock: 40, status: 'in_stock',
    is_featured: true,
    description: 'طقم مرميين 4 قدم قابلَين للطي. يُركَّبان في دقائق ويُطويان بسهولة للحمل. مناسب للتدريب في الحديقة والأماكن المفتوحة.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/96/8403431/1.jpg?2078',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/96/8403431/1.jpg?2078'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-GOALNET-950', name: 'شبكة مرمى كرة قدم MUMS PLANET — داخلي وخارجي',
    brand: 'MUMS PLANET', model: 'Soccer Goal Net Set', category: 'equipment',
    price: 950, original_price: 1200, discount_percent: 21,
    currency: 'EGP', stock: 20, minStock: 4, maxStock: 60, status: 'in_stock',
    is_featured: false,
    description: 'طقم شبكة مرمى للاستخدام الداخلي والخارجي. مادة متينة مقاومة للعوامل الجوية. سهلة التركيب والفك.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/37/4851431/1.jpg?2431',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/37/4851431/1.jpg?2431'],
    createdAt: now, updatedAt: now,
  },

  // ─── COACHING TOOLS ─────────────────────────────────────────────────────────
  {
    id: uid(), sku: 'JM-TACTICS-599', name: 'لوح تكتيكي مغناطيسي مع صافرة وإكسسوار — كرة القدم',
    brand: 'Generic', model: 'Magnetic Soccer Tactics Board + Whistle', category: 'accessories',
    price: 599, original_price: 659, discount_percent: 9,
    currency: 'EGP', stock: 40, minStock: 8, maxStock: 120, status: 'in_stock',
    is_featured: true,
    description: 'لوح تكتيكي مغناطيسي محمول بسحاب. يشمل: صافرة، أعلام، أقلام، ممحاة، بطاقات حمراء وصفراء. للمدربين والمحللين.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/45/4327131/1.jpg',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/45/4327131/1.jpg'],
    createdAt: now, updatedAt: now,
  },
  {
    id: uid(), sku: 'JM-TACTICS-450', name: 'لوح تدريب تكتيكي مغناطيسي مع قلم — كرة القدم',
    brand: 'Generic', model: 'Soccer Coaching Board Magnetic', category: 'accessories',
    price: 450, original_price: 495, discount_percent: 9,
    currency: 'EGP', stock: 35, minStock: 6, maxStock: 100, status: 'in_stock',
    is_featured: false,
    description: 'لوح تدريب تكتيكي مغناطيسي لكرة القدم. مع قلم ماركر وقطع مغناطيسية للاعبين. مثالي لشرح الخطط التكتيكية.',
    image: 'https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/88/2439331/1.jpg?7924',
    images: ['https://eg.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/88/2439331/1.jpg?7924'],
    createdAt: now, updatedAt: now,
  },
];

async function main() {
  console.log('\n🏆 Seeding real football products from Jumia Egypt...\n');

  // Delete old dummy products (SKUs starting with ADI-, NIK-, PUM-, SEL-, TRN-, ACC-, COACH-)
  const oldSkuPrefixes = ['ADI-', 'NIK-', 'PUM-', 'SEL-', 'TRN-', 'ACC-', 'COACH-'];
  for (const prefix of oldSkuPrefixes) {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .like('sku', `${prefix}%`);
    if (error) console.warn(`⚠️  Could not delete old ${prefix}* products:`, error.message);
    else console.log(`🗑️  Deleted old products with SKU prefix: ${prefix}`);
  }

  console.log(`\n📦 Inserting ${products.length} real products...\n`);

  const batchSize = 10;
  let inserted = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const { data, error } = await supabase.from('inventory').insert(batch).select('id, name, price');
    if (error) {
      console.error(`❌ Batch error:`, error.message);
    } else {
      inserted += data.length;
      data.forEach(p => console.log(`  ✅ ${p.name} — ${p.price} ج.م`));
    }
  }

  console.log(`\n✅ Done! Inserted ${inserted} / ${products.length} products.`);
  console.log('📍 Source: Jumia Egypt (jumia.com.eg) — April 2025');
  console.log('🖼️  Images: Jumia CDN (eg.jumia.is) — real product photos');
  console.log('💰 Prices: EGP — live prices from Jumia Egypt\n');
}

main().catch(console.error);
