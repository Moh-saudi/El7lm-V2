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
import { createPortalClient, portalAuthenticatedFetch } from '@/lib/tournament-portal/auth';
import { useTranslation } from '@/lib/i18n';

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

const STATUS_TAG: Record<string, string> = {
  draft: 'default', open: 'success', closed: 'error',
  ongoing: 'processing', completed: 'purple', cancelled: 'default',
};
export default function TournamentSetupPage() {
  const { getTranslations } = useTranslation();
  const copy = getTranslations<any>('tournamentSetup');
  const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
    draft:{next:'open',label:copy.statusActions[0],color:'#16a34a'}, open:{next:'closed',label:copy.statusActions[1],color:'#ea580c'},
    closed:{next:'ongoing',label:copy.statusActions[2],color:'#2563eb'}, ongoing:{next:'completed',label:copy.statusActions[3],color:'#7c3aed'},
  };
  const TYPE_OPTIONS = ['knockout','league','groups_knockout'].map((value,index)=>({value,label:copy.types[index]}));
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
      toast.success(copy.savedCategories);
    } catch (e: any) { toast.error(copy.saveFailed.replace('{error}',e.message)); }
    setSaving(false);
  };

  const advanceStatus = async () => {
    if (!tournament || !STATUS_FLOW[tournament.status]) return;
    setStatusLoading(true);
    const next = STATUS_FLOW[tournament.status].next;
    const { error } = await supabase.from('tournament_new').update({ status: next }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(copy.statusChanged.replace('{status}',copy.statuses[next]||next)); setTournament((p: any) => ({ ...p, status: next })); }
    setStatusLoading(false);
  };

  // Load venues + referees
  useEffect(() => {
    if (!id) return;
    portalAuthenticatedFetch(`/api/tournament-portal/venues?tournament_id=${id}`).then(r=>r.json()).then(d=>setVenues(d.venues||[]));
    portalAuthenticatedFetch(`/api/tournament-portal/referees?tournament_id=${id}`).then(r=>r.json()).then(d=>setReferees(d.referees||[]));
  }, [id]);

  const addVenue = async () => {
    if (!newVenue.name.trim()) { toast.error(copy.venueRequired); return; }
    setAddingVenue(true);
    const res = await portalAuthenticatedFetch('/api/tournament-portal/venues', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tournament_id:id, ...newVenue, capacity: newVenue.capacity ? +newVenue.capacity : null }) });
    const d = await res.json();
    if (!res.ok) toast.error(d.error);
    else { setVenues(p=>[...p, d.venue]); setNewVenue({ name:'', country:'', city:'', address:'', capacity:'' }); toast.success(copy.added); }
    setAddingVenue(false);
  };

  const deleteVenue = async (vid: string) => {
    await portalAuthenticatedFetch(`/api/tournament-portal/venues?id=${vid}&tournament_id=${id}`, { method:'DELETE' });
    setVenues(p=>p.filter(v=>v.id!==vid));
    toast.success(copy.deleted);
  };

  const addReferee = async () => {
    if (!newRef.name.trim()) { toast.error(copy.refereeRequired); return; }
    setAddingRef(true);
    const res = await portalAuthenticatedFetch('/api/tournament-portal/referees', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tournament_id:id, ...newRef }) });
    const d = await res.json();
    if (!res.ok) toast.error(d.error);
    else { setReferees(p=>[...p, d.referee]); setNewRef({ name:'', phone:'', level:'' }); toast.success(copy.added); }
    setAddingRef(false);
  };

  const deleteReferee = async (rid: string) => {
    await portalAuthenticatedFetch(`/api/tournament-portal/referees?id=${rid}&tournament_id=${id}`, { method:'DELETE' });
    setReferees(p=>p.filter(r=>r.id!==rid));
    toast.success(copy.deleted);
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
        <Text strong>{cat.name || copy.newCategory}</Text>
        <Tag style={{ fontSize: 11, marginInlineStart: 'auto' }}>{TYPE_OPTIONS.find(t => t.value === cat.type)?.label}</Tag>
      </Space>
    ),
    extra: (
      <Popconfirm title={copy.deleteCategory} onConfirm={(e) => { e?.stopPropagation(); removeCategory(idx); }}
        okText={copy.delete} cancelText={copy.cancel} okButtonProps={{ danger: true }}>
        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
      </Popconfirm>
    ),
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>{copy.categoryName}</Text>
            <Input value={cat.name} onChange={(e) => updateCat(idx, 'name', e.target.value)} placeholder={copy.categoryPlaceholder} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>{copy.competition}</Text>
            <Select value={cat.type} onChange={(v) => updateCat(idx, 'type', v)} options={TYPE_OPTIONS} style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { k: 'age_min',   label: copy.categoryFields[0], placeholder: '14' },
            { k: 'age_max',   label: copy.categoryFields[1], placeholder: '17' },
            { k: 'max_teams', label: copy.categoryFields[2], placeholder: '16' },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>{label}</Text>
              <Input type="number" value={(cat as any)[k]} onChange={(e) => updateCat(idx, k as any, e.target.value)} placeholder={placeholder} />
            </div>
          ))}
        </div>
        {cat.type === 'groups_knockout' && (
          <div style={{ borderTop: `1px solid ${token.colorSplit}`, paddingTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>{copy.groupSettings}</Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { k: 'group_count',     label: copy.groupFields[0], placeholder: '4' },
                { k: 'teams_per_group', label: copy.groupFields[1], placeholder: '4' },
                { k: 'advance_count',   label: copy.groupFields[2], placeholder: '2' },
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
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>{copy.currentStatus}</Text>
              <Space style={{ marginTop: 4 }}>
                <Tag color={STATUS_TAG[tournament.status] || 'default'} style={{ fontSize: 13 }}>
                  {copy.statuses[tournament.status] || tournament.status}
                </Tag>
                {nextAction && <Text type="secondary" style={{ fontSize: 12 }}>← {copy.nextStep.replace('{status}',copy.statuses[nextAction.next]||nextAction.next)}</Text>}
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
              <Text style={{ color: token.colorSuccess, fontWeight: 600 }}>{copy.tournamentComplete}</Text>
            </Space>
          )}
        </div>
      </Card>

      {/* Categories */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Text strong style={{ fontSize: 15, display: 'block' }}>{copy.categories}</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>{copy.categoriesHelp}</Text>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={addCategory}
              style={{ background: token.colorPrimary, border: 'none' }}>
              {copy.addCategory}
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
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 6 }}>{copy.noCategories}</Text>
            <Text type="secondary" style={{ fontSize: 13 }}>{copy.noCategoriesHelp}</Text>
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
                {saving ? copy.saving : copy.saveCategories}
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
              <Text strong style={{ fontSize:15, display:'block' }}>📍 {copy.venues}</Text>
              <Text type="secondary" style={{ fontSize:13 }}>{copy.venuesHelp}</Text>
            </div>
          </div>
        }
        styles={{ header:{ padding:'16px 20px' }, body:{ padding:'16px 20px' } }}
      >
        {/* Add form */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14, padding:'12px 14px', background:token.colorFillTertiary, borderRadius:token.borderRadius }}>
          <Input size="small" placeholder={copy.venueName} style={{ width:150 }} value={newVenue.name} onChange={e=>setNewVenue(p=>({...p,name:e.target.value}))} />
          <Input size="small" placeholder={copy.country} style={{ width:100 }} value={newVenue.country} onChange={e=>setNewVenue(p=>({...p,country:e.target.value}))} />
          <Input size="small" placeholder={copy.city} style={{ width:100 }} value={newVenue.city} onChange={e=>setNewVenue(p=>({...p,city:e.target.value}))} />
          <Input size="small" placeholder={copy.address} style={{ width:160 }} value={newVenue.address} onChange={e=>setNewVenue(p=>({...p,address:e.target.value}))} />
          <Input size="small" placeholder={copy.capacity} style={{ width:80 }} type="number" value={newVenue.capacity} onChange={e=>setNewVenue(p=>({...p,capacity:e.target.value}))} />
          <Button size="small" type="primary" icon={<PlusOutlined />} loading={addingVenue} onClick={addVenue} style={{ fontWeight:700 }}>{copy.add}</Button>
        </div>

        {venues.length === 0
          ? <Text type="secondary" style={{ fontSize:13 }}>{copy.noVenues}</Text>
          : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {venues.map(v=>(
                <div key={v.id} style={{ display:'flex', alignItems:'center', gap:10, background:token.colorFillTertiary, borderRadius:token.borderRadius, padding:'9px 14px' }}>
                  <div style={{ flex:1 }}>
                    <Text strong style={{ fontSize:14 }}>{v.name}</Text>
                    <Text type="secondary" style={{ fontSize:12, marginInlineStart:8 }}>
                      {[v.country, v.city, v.address].filter(Boolean).join(' · ')}
                      {v.capacity && ` · ${copy.capacityValue.replace('{count}',v.capacity.toLocaleString())}`}
                    </Text>
                  </div>
                  <Popconfirm title={copy.deleteVenue} onConfirm={()=>deleteVenue(v.id)} okText={copy.delete} cancelText={copy.no} okButtonProps={{danger:true}}>
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
              <Text strong style={{ fontSize:15, display:'block' }}>👤 {copy.referees}</Text>
              <Text type="secondary" style={{ fontSize:13 }}>{copy.refereesHelp}</Text>
            </div>
          </div>
        }
        styles={{ header:{ padding:'16px 20px' }, body:{ padding:'16px 20px' } }}
      >
        {/* Add form */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14, padding:'12px 14px', background:token.colorFillTertiary, borderRadius:token.borderRadius }}>
          <Input size="small" placeholder={copy.refereeName} style={{ width:160 }} value={newRef.name} onChange={e=>setNewRef(p=>({...p,name:e.target.value}))} />
          <Input size="small" placeholder={copy.phone} style={{ width:130 }} value={newRef.phone} onChange={e=>setNewRef(p=>({...p,phone:e.target.value}))} dir="ltr" />
          <Select size="small" placeholder={copy.level} style={{ width:130 }} value={newRef.level||undefined} onChange={v=>setNewRef(p=>({...p,level:v}))}
            options={['beginner','intermediate','professional','international'].map((value,index)=>({ value, label:copy.levels[index] }))} allowClear />
          <Button size="small" type="primary" icon={<PlusOutlined />} loading={addingRef} onClick={addReferee} style={{ fontWeight:700 }}>{copy.add}</Button>
        </div>

        {referees.length === 0
          ? <Text type="secondary" style={{ fontSize:13 }}>{copy.noReferees}</Text>
          : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {referees.map(r=>(
                <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, background:token.colorFillTertiary, borderRadius:token.borderRadius, padding:'9px 14px' }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:'rgba(59,130,246,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>👤</div>
                  <div style={{ flex:1 }}>
                    <Text strong style={{ fontSize:14 }}>{r.name}</Text>
                    {r.level && <Text type="secondary" style={{ fontSize:12, marginInlineStart:8 }}>{r.level}</Text>}
                    {r.phone && <Text type="secondary" style={{ fontSize:12, marginInlineStart:8, fontFamily:'monospace' }}>{r.phone}</Text>}
                  </div>
                  <Popconfirm title={copy.deleteReferee} onConfirm={()=>deleteReferee(r.id)} okText={copy.delete} cancelText={copy.no} okButtonProps={{danger:true}}>
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
