'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card, Collapse, Button, Input, Select, Popconfirm,
  Tag, Typography, Space, Spin, theme,
} from 'antd';
import {
  PlusOutlined, SaveOutlined, DeleteOutlined, ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { toast } from 'sonner';
import { createPortalClient } from '@/lib/tournament-portal/auth';

const { Text } = Typography;
const { useToken } = theme;

type Category = {
  id?: string; name: string; age_min: string; age_max: string;
  max_teams: string; type: string; group_count: string;
  teams_per_group: string; advance_count: string; sort_order: number;
};

const EMPTY_CAT = (): Category => ({
  name: '', age_min: '', age_max: '', max_teams: '', type: 'knockout',
  group_count: '', teams_per_group: '', advance_count: '', sort_order: 0,
});

const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
  draft:   { next: 'open',      label: 'فتح باب التسجيل', color: '#16a34a' },
  open:    { next: 'closed',    label: 'إغلاق التسجيل',    color: '#ea580c' },
  closed:  { next: 'ongoing',   label: 'بدء البطولة',       color: '#2563eb' },
  ongoing: { next: 'completed', label: 'إنهاء البطولة',     color: '#7c3aed' },
};

const STATUS_TAG: Record<string, string> = {
  draft: 'default', open: 'success', closed: 'error',
  ongoing: 'processing', completed: 'purple', cancelled: 'default',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'مسودة', open: 'مفتوح', closed: 'مغلق',
  ongoing: 'جارٍ', completed: 'منتهي', cancelled: 'ملغي',
};

const TYPE_OPTIONS = [
  { value: 'knockout',        label: 'كأس (إقصائي)'  },
  { value: 'league',          label: 'دوري'           },
  { value: 'groups_knockout', label: 'مجموعات + إقصاء'},
];

export default function TournamentSetupPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();

  const [tournament,     setTournament]     = useState<any>(null);
  const [categories,     setCategories]     = useState<Category[]>([]);
  const [saving,         setSaving]         = useState(false);
  const [statusLoading,  setStatusLoading]  = useState(false);
  const [activeKeys,     setActiveKeys]     = useState<string[]>(['0']);

  // Venues
  const [venues,      setVenues]      = useState<any[]>([]);
  const [newVenue,    setNewVenue]    = useState({ name:'', country:'', city:'', address:'', capacity:'' });
  const [addingVenue, setAddingVenue] = useState(false);

  // Referees
  const [referees,      setReferees]      = useState<any[]>([]);
  const [newRef,        setNewRef]        = useState({ name:'', phone:'', level:'' });
  const [addingRef,     setAddingRef]     = useState(false);

  const supabase = createPortalClient();

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from('tournament_new').select('*').eq('id', id).single();
      setTournament(t);
      const { data: cats } = await supabase.from('tournament_categories').select('*').eq('tournament_id', id).order('sort_order');
      if (cats?.length) {
        setCategories(cats.map((c: any) => ({
          id: c.id, name: c.name || '', age_min: c.age_min?.toString() || '',
          age_max: c.age_max?.toString() || '', max_teams: c.max_teams?.toString() || '',
          type: c.type || 'knockout', group_count: c.group_count?.toString() || '',
          teams_per_group: c.teams_per_group?.toString() || '',
          advance_count: c.advance_count?.toString() || '', sort_order: c.sort_order || 0,
        })));
      }
    })();
  }, [id]);

  const updateCat = (idx: number, k: keyof Category, v: any) =>
    setCategories((prev) => prev.map((c, i) => i === idx ? { ...c, [k]: v } : c));

  const addCategory = () => {
    const newIdx = categories.length;
    setCategories((prev) => [...prev, { ...EMPTY_CAT(), sort_order: newIdx }]);
    setActiveKeys([String(newIdx)]);
  };

  const removeCategory = async (idx: number) => {
    const cat = categories[idx];
    if (cat.id) await supabase.from('tournament_categories').delete().eq('id', cat.id);
    setCategories((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveCategories = async () => {
    setSaving(true);
    try {
      for (const cat of categories) {
        if (!cat.name.trim()) continue;
        const payload = {
          tournament_id: id, name: cat.name,
          age_min: cat.age_min ? +cat.age_min : null, age_max: cat.age_max ? +cat.age_max : null,
          max_teams: cat.max_teams ? +cat.max_teams : null, type: cat.type,
          group_count: cat.group_count ? +cat.group_count : null,
          teams_per_group: cat.teams_per_group ? +cat.teams_per_group : null,
          advance_count: cat.advance_count ? +cat.advance_count : null,
          sort_order: cat.sort_order,
        };
        if (cat.id) {
          await supabase.from('tournament_categories').update(payload).eq('id', cat.id);
        } else {
          const { data } = await supabase.from('tournament_categories').insert(payload).select('id').single();
          if (data) cat.id = data.id;
        }
      }
      toast.success('تم حفظ الفئات بنجاح');
    } catch (e: any) { toast.error('فشل الحفظ: ' + e.message); }
    setSaving(false);
  };

  const advanceStatus = async () => {
    if (!tournament || !STATUS_FLOW[tournament.status]) return;
    setStatusLoading(true);
    const next = STATUS_FLOW[tournament.status].next;
    const { error } = await supabase.from('tournament_new').update({ status: next }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(`تم تغيير الحالة إلى: ${next}`); setTournament((p: any) => ({ ...p, status: next })); }
    setStatusLoading(false);
  };

  // Load venues + referees
  useEffect(() => {
    if (!id) return;
    fetch(`/api/tournament-portal/venues?tournament_id=${id}`).then(r=>r.json()).then(d=>setVenues(d.venues||[]));
    fetch(`/api/tournament-portal/referees?tournament_id=${id}`).then(r=>r.json()).then(d=>setReferees(d.referees||[]));
  }, [id]);

  const addVenue = async () => {
    if (!newVenue.name.trim()) { toast.error('اسم الملعب مطلوب'); return; }
    setAddingVenue(true);
    const res = await fetch('/api/tournament-portal/venues', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tournament_id:id, ...newVenue, capacity: newVenue.capacity ? +newVenue.capacity : null }) });
    const d = await res.json();
    if (!res.ok) toast.error(d.error);
    else { setVenues(p=>[...p, d.venue]); setNewVenue({ name:'', country:'', city:'', address:'', capacity:'' }); toast.success('تمت الإضافة'); }
    setAddingVenue(false);
  };

  const deleteVenue = async (vid: string) => {
    await fetch(`/api/tournament-portal/venues?id=${vid}`, { method:'DELETE' });
    setVenues(p=>p.filter(v=>v.id!==vid));
    toast.success('تم الحذف');
  };

  const addReferee = async () => {
    if (!newRef.name.trim()) { toast.error('اسم الحكم مطلوب'); return; }
    setAddingRef(true);
    const res = await fetch('/api/tournament-portal/referees', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tournament_id:id, ...newRef }) });
    const d = await res.json();
    if (!res.ok) toast.error(d.error);
    else { setReferees(p=>[...p, d.referee]); setNewRef({ name:'', phone:'', level:'' }); toast.success('تمت الإضافة'); }
    setAddingRef(false);
  };

  const deleteReferee = async (rid: string) => {
    await fetch(`/api/tournament-portal/referees?id=${rid}`, { method:'DELETE' });
    setReferees(p=>p.filter(r=>r.id!==rid));
    toast.success('تم الحذف');
  };

  if (!tournament) return (
    <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
  );

  const nextAction = STATUS_FLOW[tournament.status];

  const collapseItems = categories.map((cat, idx) => ({
    key: String(idx),
    label: (
      <Space>
        <div style={{ width: 28, height: 28, background: token.colorWarningBg, borderRadius: token.borderRadius, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: token.colorWarning }}>
          {idx + 1}
        </div>
        <Text strong>{cat.name || 'فئة جديدة'}</Text>
        <Tag style={{ fontSize: 11, marginRight: 'auto' }}>{TYPE_OPTIONS.find(t => t.value === cat.type)?.label}</Tag>
      </Space>
    ),
    extra: (
      <Popconfirm title="حذف الفئة" onConfirm={(e) => { e?.stopPropagation(); removeCategory(idx); }}
        okText="حذف" cancelText="إلغاء" okButtonProps={{ danger: true }}>
        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
      </Popconfirm>
    ),
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>اسم الفئة *</Text>
            <Input value={cat.name} onChange={(e) => updateCat(idx, 'name', e.target.value)} placeholder="الكبار / U17 / U14..." />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>نظام المنافسة</Text>
            <Select value={cat.type} onChange={(v) => updateCat(idx, 'type', v)} options={TYPE_OPTIONS} style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { k: 'age_min',   label: 'العمر الأدنى',      placeholder: '14' },
            { k: 'age_max',   label: 'العمر الأقصى',      placeholder: '17' },
            { k: 'max_teams', label: 'الحد الأقصى للفرق', placeholder: '16' },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>{label}</Text>
              <Input type="number" value={(cat as any)[k]} onChange={(e) => updateCat(idx, k as any, e.target.value)} placeholder={placeholder} />
            </div>
          ))}
        </div>
        {cat.type === 'groups_knockout' && (
          <div style={{ borderTop: `1px solid ${token.colorSplit}`, paddingTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>إعدادات المجموعات</Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { k: 'group_count',     label: 'عدد المجموعات',          placeholder: '4' },
                { k: 'teams_per_group', label: 'فرق في كل مجموعة',       placeholder: '4' },
                { k: 'advance_count',   label: 'المتأهلون من كل مجموعة', placeholder: '2' },
              ].map(({ k, label, placeholder }) => (
                <div key={k}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>{label}</Text>
                  <Input type="number" value={(cat as any)[k]} onChange={(e) => updateCat(idx, k as any, e.target.value)} placeholder={placeholder} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ),
  }));

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Status card */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <Space size={12}>
            <div style={{ width: 40, height: 40, borderRadius: token.borderRadius, background: token.colorWarningBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ThunderboltOutlined style={{ color: token.colorWarning, fontSize: 18 }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>حالة البطولة الحالية</Text>
              <Space style={{ marginTop: 4 }}>
                <Tag color={STATUS_TAG[tournament.status] || 'default'} style={{ fontSize: 13 }}>
                  {STATUS_LABEL[tournament.status] || tournament.status}
                </Tag>
                {nextAction && <Text type="secondary" style={{ fontSize: 12 }}>← الخطوة التالية: {nextAction.next}</Text>}
              </Space>
            </div>
          </Space>
          {nextAction ? (
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={statusLoading}
              onClick={advanceStatus}
              style={{ background: nextAction.color, border: 'none', fontWeight: 700 }}
            >
              {nextAction.label}
            </Button>
          ) : (
            <Space style={{ color: token.colorSuccess }}>
              <CheckCircleOutlined style={{ fontSize: 18 }} />
              <Text style={{ color: token.colorSuccess, fontWeight: 600 }}>البطولة اكتملت</Text>
            </Space>
          )}
        </div>
      </Card>

      {/* Categories */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Text strong style={{ fontSize: 15, display: 'block' }}>الفئات العمرية</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>حدد الفئات المختلفة داخل البطولة</Text>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={addCategory}
              style={{ background: token.colorPrimary, border: 'none' }}>
              إضافة فئة
            </Button>
          </div>
        }
        styles={{ header: { padding: '16px 20px' }, body: { padding: categories.length ? 0 : '48px 24px' } }}
      >
        {categories.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: token.colorFillTertiary, borderRadius: token.borderRadiusLG, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlusOutlined style={{ fontSize: 24, color: token.colorTextTertiary }} />
            </div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 6 }}>لم تُضف أي فئات بعد</Text>
            <Text type="secondary" style={{ fontSize: 13 }}>أضف فئة عمرية لتنظيم المنافسة</Text>
          </div>
        ) : (
          <>
            <Collapse
              activeKey={activeKeys}
              onChange={(keys) => setActiveKeys(typeof keys === 'string' ? [keys] : keys)}
              items={collapseItems}
              style={{ border: 'none', borderRadius: 0 }}
            />
            <div style={{ padding: '14px 20px', borderTop: `1px solid ${token.colorSplit}` }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={saveCategories}
                style={{ fontWeight: 700 }}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ الفئات'}
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* ── Venues ── */}
      <Card
        title={
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <Text strong style={{ fontSize:15, display:'block' }}>📍 الملاعب</Text>
              <Text type="secondary" style={{ fontSize:13 }}>أضف ملاعب تُستخدم في المباريات</Text>
            </div>
          </div>
        }
        styles={{ header:{ padding:'16px 20px' }, body:{ padding:'16px 20px' } }}
      >
        {/* Add form */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14, padding:'12px 14px', background:token.colorFillTertiary, borderRadius:token.borderRadius }}>
          <Input size="small" placeholder="اسم الملعب *" style={{ width:150 }} value={newVenue.name} onChange={e=>setNewVenue(p=>({...p,name:e.target.value}))} />
          <Input size="small" placeholder="الدولة" style={{ width:100 }} value={newVenue.country} onChange={e=>setNewVenue(p=>({...p,country:e.target.value}))} />
          <Input size="small" placeholder="المدينة" style={{ width:100 }} value={newVenue.city} onChange={e=>setNewVenue(p=>({...p,city:e.target.value}))} />
          <Input size="small" placeholder="العنوان التفصيلي" style={{ width:160 }} value={newVenue.address} onChange={e=>setNewVenue(p=>({...p,address:e.target.value}))} />
          <Input size="small" placeholder="السعة" style={{ width:80 }} type="number" value={newVenue.capacity} onChange={e=>setNewVenue(p=>({...p,capacity:e.target.value}))} />
          <Button size="small" type="primary" icon={<PlusOutlined />} loading={addingVenue} onClick={addVenue} style={{ fontWeight:700 }}>إضافة</Button>
        </div>

        {venues.length === 0
          ? <Text type="secondary" style={{ fontSize:13 }}>لا توجد ملاعب مضافة بعد</Text>
          : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {venues.map(v=>(
                <div key={v.id} style={{ display:'flex', alignItems:'center', gap:10, background:token.colorFillTertiary, borderRadius:token.borderRadius, padding:'9px 14px' }}>
                  <div style={{ flex:1 }}>
                    <Text strong style={{ fontSize:14 }}>{v.name}</Text>
                    <Text type="secondary" style={{ fontSize:12, marginRight:8 }}>
                      {[v.country, v.city, v.address].filter(Boolean).join(' · ')}
                      {v.capacity && ` · سعة ${v.capacity.toLocaleString()}`}
                    </Text>
                  </div>
                  <Popconfirm title="حذف الملعب؟" onConfirm={()=>deleteVenue(v.id)} okText="حذف" cancelText="لا" okButtonProps={{danger:true}}>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              ))}
            </div>
        }
      </Card>

      {/* ── Referees ── */}
      <Card
        title={
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <Text strong style={{ fontSize:15, display:'block' }}>👤 الحكام</Text>
              <Text type="secondary" style={{ fontSize:13 }}>أضف حكاماً لتعيينهم على المباريات</Text>
            </div>
          </div>
        }
        styles={{ header:{ padding:'16px 20px' }, body:{ padding:'16px 20px' } }}
      >
        {/* Add form */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14, padding:'12px 14px', background:token.colorFillTertiary, borderRadius:token.borderRadius }}>
          <Input size="small" placeholder="اسم الحكم *" style={{ width:160 }} value={newRef.name} onChange={e=>setNewRef(p=>({...p,name:e.target.value}))} />
          <Input size="small" placeholder="رقم الجوال" style={{ width:130 }} value={newRef.phone} onChange={e=>setNewRef(p=>({...p,phone:e.target.value}))} dir="ltr" />
          <Select size="small" placeholder="المستوى" style={{ width:130 }} value={newRef.level||undefined} onChange={v=>setNewRef(p=>({...p,level:v}))}
            options={['مبتدئ','متوسط','محترف','دولي'].map(l=>({ value:l, label:l }))} allowClear />
          <Button size="small" type="primary" icon={<PlusOutlined />} loading={addingRef} onClick={addReferee} style={{ fontWeight:700 }}>إضافة</Button>
        </div>

        {referees.length === 0
          ? <Text type="secondary" style={{ fontSize:13 }}>لا يوجد حكام مضافون بعد</Text>
          : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {referees.map(r=>(
                <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, background:token.colorFillTertiary, borderRadius:token.borderRadius, padding:'9px 14px' }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:'rgba(59,130,246,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>👤</div>
                  <div style={{ flex:1 }}>
                    <Text strong style={{ fontSize:14 }}>{r.name}</Text>
                    {r.level && <Text type="secondary" style={{ fontSize:12, marginRight:8 }}>{r.level}</Text>}
                    {r.phone && <Text type="secondary" style={{ fontSize:12, marginRight:8, fontFamily:'monospace' }}>{r.phone}</Text>}
                  </div>
                  <Popconfirm title="حذف الحكم؟" onConfirm={()=>deleteReferee(r.id)} okText="حذف" cancelText="لا" okButtonProps={{danger:true}}>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  );
}
