'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { InputNumber, Select, Tag, Typography, Tooltip, Empty } from 'antd';
import {
  SwapOutlined, SaveOutlined, PlusOutlined, DeleteOutlined,
  CloseOutlined, TeamOutlined, TrophyOutlined,
  ThunderboltOutlined, CheckCircleOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { toast } from 'sonner';
import { createPortalClient, portalAuthenticatedFetch } from '@/lib/tournament-portal/auth';
import { usePortalTheme } from '../../_components/PortalShell';
import { useTranslation } from '@/lib/i18n';

const { Text } = Typography;

type Team     = { id: string; name: string; logo_url: string | null; seed: number | null; group_id: string | null; category_id: string | null };
type Group    = { id: string; name: string; teams: Team[] };
type Category = { id: string; name: string; type: string; group_count: number | null; teams_per_group: number | null };

// ── Team Avatar ───────────────────────────────────────────────────────────────
function TeamAvatar({ team, size = 32 }: { team: Team; size?: number }) {
  if (team.logo_url) return (
    <img src={team.logo_url} alt={team.name}
      style={{ width: size, height: size, borderRadius: size / 3, objectFit: 'cover', flexShrink: 0 }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 3, flexShrink: 0,
      background: 'linear-gradient(135deg, #d97706, #ea580c)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.38,
    }}>
      {team.name.charAt(0)}
    </div>
  );
}

export default function DrawPage() {
  const { getTranslations } = useTranslation();
  const copy = getTranslations<any>('tournamentDraw');
  const { id }      = useParams<{ id: string }>();
  const { isDark }  = usePortalTheme();

  const [categories,       setCategories]       = useState<Category[]>([]);
  const [selectedCat,      setSelectedCat]      = useState('');
  const [allTeams,         setAllTeams]         = useState<Team[]>([]);
  const [groups,           setGroups]           = useState<Group[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [customGroupCount, setCustomGroupCount] = useState(4);
  const [creatingGroups,   setCreatingGroups]   = useState(false);
  const [selectedTeam,     setSelectedTeam]     = useState<{ team: Team; fromGroupId: string | null } | null>(null);

  const supabase = createPortalClient();

  // ── Colors ─────────────────────────────────────────────────────────────────
  const bg       = isDark ? '#0f172a' : '#ffffff';
  const bgSoft   = isDark ? '#1e293b' : '#f8fafc';
  const border   = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const borderDash = isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db';
  const text     = isDark ? '#e2e8f0' : '#0f172a';
  const textSec  = isDark ? '#64748b' : '#6b7280';
  const groupHdr = isDark ? '#1e293b' : '#1e293b';

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from('tournament_categories').select('id,name,type,group_count,teams_per_group').eq('tournament_id', id);
      setCategories(cats || []);
      if (cats?.length) { setSelectedCat(cats[0].id); if (cats[0].group_count) setCustomGroupCount(cats[0].group_count); }
      setLoading(false);
    })();
  }, [id]);

  const loadTeamsAndGroups = async (catId: string) => {
    let q = supabase.from('tournament_teams').select('id,name,logo_url,seed,group_id,category_id').eq('tournament_id', id).eq('status', 'approved');
    if (catId !== 'all') q = (q as any).or(`category_id.eq.${catId},category_id.is.null`);
    const [teamsRes, groupsRes] = await Promise.all([q, supabase.from('tournament_groups').select('id,name').eq('tournament_id', id).eq('category_id', catId === 'all' ? '' : catId).order('sort_order')]);
    const teams = (teamsRes.data || []).map((t: any) => ({ ...t, category_id: t.category_id ?? (catId !== 'all' ? catId : null) }));
    setAllTeams(teams);
    setGroups((groupsRes.data || []).map((g: any) => ({ id: g.id, name: g.name, teams: teams.filter((t: any) => t.group_id === g.id) })));
    setSelectedTeam(null);
  };

  useEffect(() => { if (selectedCat) loadTeamsAndGroups(selectedCat); }, [selectedCat]);

  const currentCat  = categories.find((c) => c.id === selectedCat);
  const assignedIds = new Set(groups.flatMap((g) => g.teams.map((t) => t.id)));
  const unassigned  = allTeams.filter((t) => !assignedIds.has(t.id));
  const isDrawn     = groups.some((g) => g.teams.length > 0);
  const isDone      = unassigned.length === 0 && groups.length > 0 && isDrawn;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const createGroups = async () => {
    if (customGroupCount < 2) { toast.error(copy.minGroups); return; }
    setCreatingGroups(true);
    const res = await portalAuthenticatedFetch('/api/tournament-portal/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tournament_id: id, category_id: selectedCat, count: customGroupCount }) });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else { setGroups((data.groups || []).map((g: any) => ({ ...g, teams: [] }))); toast.success(copy.groupsCreated.replace('{count}', customGroupCount)); }
    setCreatingGroups(false);
  };

  const deleteGroup = async (groupId: string) => {
    const res = await portalAuthenticatedFetch(`/api/tournament-portal/groups?id=${groupId}&tournament_id=${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); toast.error(d.error); return; }
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setSelectedTeam(null);
  };

  const selectTeam = (team: Team, fromGroupId: string | null) => {
    if (selectedTeam?.team.id === team.id) { setSelectedTeam(null); return; }
    setSelectedTeam({ team, fromGroupId });
  };

  const moveSelectedToGroup = (toGroupId: string) => {
    if (!selectedTeam) return;
    const { team, fromGroupId } = selectedTeam;
    if (fromGroupId === toGroupId) { setSelectedTeam(null); return; }
    setGroups((prev) => prev.map((g) => {
      if (g.id === fromGroupId) return { ...g, teams: g.teams.filter((t) => t.id !== team.id) };
      if (g.id === toGroupId)   return { ...g, teams: [...g.teams, { ...team, group_id: toGroupId }] };
      return g;
    }));
    setSelectedTeam(null);
    toast.success(copy.moved.replace('{team}', team.name));
  };

  const removeFromGroup = (team: Team, groupId: string) => {
    if (selectedTeam?.team.id === team.id) setSelectedTeam(null);
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, teams: g.teams.filter((t) => t.id !== team.id) } : g));
  };

  const swapWithTeam = (targetTeam: Team, targetGroupId: string) => {
    if (!selectedTeam) return;
    const { team: src, fromGroupId: srcGid } = selectedTeam;
    if (src.id === targetTeam.id) { setSelectedTeam(null); return; }
    setGroups((prev) => prev.map((g) => {
      if (g.id === srcGid) return { ...g, teams: g.teams.map((t) => t.id === src.id ? { ...targetTeam, group_id: g.id } : t) };
      if (g.id === targetGroupId) return { ...g, teams: g.teams.map((t) => t.id === targetTeam.id ? { ...src, group_id: g.id } : t) };
      return g;
    }));
    setSelectedTeam(null);
    toast.success(copy.swapped.replace('{first}',src.name).replace('{second}',targetTeam.name));
  };

  const addUnassignedToGroup = (team: Team, toGroupId: string) => {
    setGroups((prev) => prev.map((g) => g.id === toGroupId ? { ...g, teams: [...g.teams, { ...team, group_id: toGroupId }] } : g));
  };

  const performDraw = () => {
    if (groups.length === 0) { toast.error(copy.createGroupsFirst); return; }
    if (allTeams.length === 0) { toast.error(copy.noAcceptedTeams); return; }
    const seeded   = [...allTeams.filter((t) => t.seed)].sort((a, b) => (a.seed || 99) - (b.seed || 99));
    const unseeded = [...allTeams.filter((t) => !t.seed)].sort(() => Math.random() - 0.5);
    const dist: Group[] = groups.map((g) => ({ ...g, teams: [] }));
    seeded.forEach((team, i) => { if (dist[i % groups.length]) dist[i % groups.length].teams.push(team); });
    let gi = 0;
    for (const team of unseeded) {
      const max = currentCat?.teams_per_group || 999;
      let att = 0;
      while (dist[gi].teams.length >= max && att < groups.length) { gi = (gi + 1) % groups.length; att++; }
      dist[gi].teams.push(team); gi = (gi + 1) % groups.length;
    }
    setGroups(dist); setSelectedTeam(null);
    toast.success(copy.drawReady);
  };

  const saveDraw = async () => {
    setSaving(true);
    const res = await portalAuthenticatedFetch('/api/tournament-portal/save-draw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tournament_id:id, category_id: selectedCat !== 'all' ? selectedCat : null, groups: groups.map((g) => ({ id: g.id, teams: g.teams.map((t) => ({ id: t.id, category_id: t.category_id })) })) }) });
    const data = await res.json();
    if (!res.ok) toast.error(data.error);
    else toast.success(copy.saved);
    setSaving(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${isDark ? '#1e293b' : '#e5e7eb'}`, borderTopColor: '#d97706', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <Text style={{ color: textSec }}>{copy.loading}</Text>
      </div>
    </div>
  );

  // ── Steps progress ────────────────────────────────────────────────────────
  const step1Done = groups.length > 0;
  const step2Done = isDrawn && unassigned.length === 0;
  const step3Done = false;

  const STEPS = [
    { n: 1, label: copy.steps[0], done: step1Done },
    { n: 2, label: copy.steps[1], done: step2Done },
    { n: 3, label: copy.steps[2], done: step3Done },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ══ Category tabs ══ */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map((c) => (
            <button key={c.id}
              onClick={() => { setSelectedCat(c.id); if (c.group_count) setCustomGroupCount(c.group_count); }}
              style={{
                padding: '7px 18px', borderRadius: 24, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${selectedCat === c.id ? '#d97706' : border}`,
                background: selectedCat === c.id ? '#d97706' : bg,
                color: selectedCat === c.id ? '#fff' : textSec,
                transition: 'all 0.15s',
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* ══ Steps progress ══ */}
      <div style={{
        background: bg, border: `1px solid ${border}`,
        borderRadius: 16, padding: '18px 24px',
        display: 'flex', alignItems: 'center', gap: 0,
        transition: 'all 0.3s',
      }}>
        {STEPS.map((s, i) => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: s.done ? '#16a34a' : (i === (step1Done ? (step2Done ? 2 : 1) : 0) ? '#d97706' : bgSoft),
                border: `2px solid ${s.done ? '#16a34a' : (i === (step1Done ? (step2Done ? 2 : 1) : 0) ? '#d97706' : border)}`,
                color: s.done || i === (step1Done ? (step2Done ? 2 : 1) : 0) ? '#fff' : textSec,
                fontWeight: 800, fontSize: 15,
                transition: 'all 0.3s',
                boxShadow: s.done ? '0 0 0 4px rgba(22,163,74,0.15)' : (i === (step1Done ? (step2Done ? 2 : 1) : 0) ? '0 0 0 4px rgba(217,119,6,0.15)' : 'none'),
              }}>
                {s.done ? <CheckCircleOutlined style={{ fontSize: 16 }} /> : s.n}
              </div>
              <div>
                <Text style={{ fontSize: 13, fontWeight: 600, color: s.done ? '#16a34a' : text, display: 'block', transition: 'color 0.3s' }}>
                  {s.label}
                </Text>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: '0 12px', borderRadius: 2, background: s.done ? '#16a34a' : border, transition: 'background 0.3s' }} />
            )}
          </div>
        ))}
      </div>

      {/* ══ Control bar ══ */}
      <div style={{
        background: bg, border: `1px solid ${border}`,
        borderRadius: 16, padding: '16px 20px',
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16,
        transition: 'all 0.3s',
      }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TeamOutlined style={{ color: '#6366f1', fontSize: 16 }} />
            </div>
            <div>
              <Text style={{ color: text, fontWeight: 700, fontSize: 18, lineHeight: 1, display: 'block' }}>{allTeams.length}</Text>
              <Text style={{ color: textSec, fontSize: 12 }}>{copy.team}</Text>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: isDark ? 'rgba(217,119,6,0.15)' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrophyOutlined style={{ color: '#d97706', fontSize: 16 }} />
            </div>
            <div>
              <Text style={{ color: text, fontWeight: 700, fontSize: 18, lineHeight: 1, display: 'block' }}>{groups.length}</Text>
              <Text style={{ color: textSec, fontSize: 12 }}>{copy.group}</Text>
            </div>
          </div>

          {unassigned.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <InfoCircleOutlined style={{ color: '#ef4444', fontSize: 16 }} />
              </div>
              <div>
                <Text style={{ color: '#ef4444', fontWeight: 700, fontSize: 18, lineHeight: 1, display: 'block' }}>{unassigned.length}</Text>
                <Text style={{ color: textSec, fontSize: 12 }}>{copy.unassigned}</Text>
              </div>
            </div>
          )}

          {isDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: isDark ? 'rgba(22,163,74,0.15)' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 16 }} />
              </div>
              <div>
                <Text style={{ color: '#16a34a', fontWeight: 700, fontSize: 14, lineHeight: 1, display: 'block' }}>{copy.complete}</Text>
                <Text style={{ color: textSec, fontSize: 12 }}>{copy.readyToSave}</Text>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Create groups inline */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: bgSoft, border: `1px solid ${border}`,
            borderRadius: 10, padding: '6px 12px',
          }}>
            <Text style={{ color: textSec, fontSize: 13 }}>{copy.groups}</Text>
            <InputNumber
              min={2} max={16} value={customGroupCount}
              onChange={(v) => setCustomGroupCount(v || 4)}
              size="small"
              style={{ width: 64, background: 'transparent' }}
            />
            <button
              onClick={createGroups}
              disabled={creatingGroups}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                background: '#2563eb', border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 600, opacity: creatingGroups ? 0.6 : 1,
                transition: 'all 0.15s',
              }}
            >
              <PlusOutlined />
              {groups.length > 0 ? copy.recreate : copy.create}
            </button>
          </div>

          <button
            onClick={performDraw}
            disabled={groups.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 18px', borderRadius: 10, cursor: groups.length === 0 ? 'not-allowed' : 'pointer',
              background: groups.length === 0 ? bgSoft : '#4f46e5',
              border: `1px solid ${groups.length === 0 ? border : '#4f46e5'}`,
              color: groups.length === 0 ? textSec : '#fff',
              fontSize: 14, fontWeight: 700, transition: 'all 0.15s',
              opacity: groups.length === 0 ? 0.5 : 1,
            }}
          >
            <ThunderboltOutlined style={{ fontSize: 15 }} />
            {isDrawn ? copy.redraw : copy.randomDraw}
          </button>

          {isDrawn && (
            <button
              onClick={saveDraw}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 20px', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
                background: isDone ? '#16a34a' : '#d97706',
                border: 'none', color: '#fff',
                fontSize: 14, fontWeight: 700, transition: 'all 0.15s',
                boxShadow: isDone ? '0 4px 16px rgba(22,163,74,0.3)' : '0 4px 16px rgba(217,119,6,0.25)',
                opacity: saving ? 0.7 : 1,
              }}
            >
              <SaveOutlined style={{ fontSize: 15 }} />
              {saving ? copy.saving : copy.save}
            </button>
          )}
        </div>
      </div>

      {/* ══ No teams warning ══ */}
      {allTeams.length === 0 && (
        <div style={{
          background: isDark ? 'rgba(217,119,6,0.08)' : '#fffbeb',
          border: `1px solid ${isDark ? 'rgba(217,119,6,0.2)' : '#fde68a'}`,
          borderRadius: 14, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <InfoCircleOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <div>
            <Text style={{ color: isDark ? '#fbbf24' : '#92400e', fontWeight: 700, fontSize: 14, display: 'block' }}>
              {copy.noTeamsTitle}
            </Text>
            <Text style={{ color: isDark ? '#d97706' : '#b45309', fontSize: 13 }}>
              {copy.noTeamsHelp}
            </Text>
          </div>
        </div>
      )}

      {/* ══ Selected team floating banner ══ */}
      {selectedTeam && (
        <div style={{
          background: isDark ? '#1e1b4b' : '#eef2ff',
          border: `2px solid ${isDark ? '#4f46e5' : '#6366f1'}`,
          borderRadius: 14, padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 4px 20px rgba(99,102,241,0.2)',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.1)',
            border: '1px solid #6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SwapOutlined style={{ color: '#6366f1', fontSize: 18 }} />
          </div>
          <TeamAvatar team={selectedTeam.team} size={36} />
          <div style={{ flex: 1 }}>
            <Text style={{ color: isDark ? '#e0e7ff' : '#312e81', fontWeight: 700, fontSize: 15, display: 'block' }}>
              {selectedTeam.team.name}
            </Text>
            <Text style={{ color: isDark ? '#818cf8' : '#6366f1', fontSize: 13 }}>
              {selectedTeam.fromGroupId ? copy.selectedFromGroup : copy.clickGroup}
            </Text>
          </div>
          <button
            onClick={() => setSelectedTeam(null)}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2',
              border: isDark ? '1px solid rgba(239,68,68,0.25)' : '1px solid #fecaca',
              color: '#ef4444', cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <CloseOutlined />
          </button>
        </div>
      )}

      {/* ══ Unassigned teams pool ══ */}
      {unassigned.length > 0 && (
        <div style={{
          background: bg,
          border: `2px dashed ${borderDash}`,
          borderRadius: 16, padding: '16px 18px',
          transition: 'all 0.3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TeamOutlined style={{ color: '#ef4444', fontSize: 14 }} />
            </div>
            <Text style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>
              {copy.unassignedTeams}
            </Text>
            <div style={{ background: '#ef4444', color: '#fff', borderRadius: 20, padding: '1px 10px', fontSize: 12, fontWeight: 700 }}>
              {unassigned.length}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {unassigned.map((team) => {
              const isSelected = selectedTeam?.team.id === team.id;
              return (
                <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    onClick={() => selectTeam(team, null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 12px',
                      background: isSelected ? (isDark ? '#1e1b4b' : '#eef2ff') : bgSoft,
                      border: `1.5px solid ${isSelected ? '#6366f1' : border}`,
                      borderRadius: 10, cursor: 'pointer',
                      boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    <TeamAvatar team={team} size={26} />
                    <Text style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#6366f1' : text, maxWidth: 100, transition: 'color 0.15s' }} ellipsis>
                      {team.name}
                    </Text>
                    {team.seed && (
                      <div style={{ background: '#d97706', color: '#fff', borderRadius: 6, padding: '1px 6px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {copy.seed.replace('{number}',team.seed)}
                      </div>
                    )}
                  </div>

                  {groups.length > 0 && (
                    <Select
                      size="small"
                      placeholder={copy.move}
                      style={{ width: 100 }}
                      value={undefined}
                      onChange={(gid) => addUnassignedToGroup(team, gid)}
                      options={groups.map((g) => ({ value: g.id, label: g.name }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ Groups grid ══ */}
      {groups.length === 0 ? (
        allTeams.length > 0 && (
          <div style={{
            background: bg, border: `2px dashed ${borderDash}`,
            borderRadius: 16, padding: '48px 24px', textAlign: 'center',
            transition: 'all 0.3s',
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: isDark ? 'rgba(217,119,6,0.15)' : '#fef3c7', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrophyOutlined style={{ fontSize: 30, color: '#d97706' }} />
            </div>
            <Text style={{ color: text, fontWeight: 700, fontSize: 16, display: 'block', marginBottom: 8 }}>
              {copy.noGroups}
            </Text>
            <Text style={{ color: textSec, fontSize: 14 }}>
              {copy.noGroupsHelp}
            </Text>
          </div>
        )
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
        }}>
          {groups.map((group) => {
            const isTarget   = !!(selectedTeam && selectedTeam.fromGroupId !== group.id);
            const isSource   = selectedTeam?.fromGroupId === group.id;
            const borderColor = isTarget ? '#6366f1' : isSource ? '#a5b4fc' : border;
            const glowColor   = isTarget ? 'rgba(99,102,241,0.25)' : 'none';

            return (
              <div
                key={group.id}
                onClick={() => isTarget && moveSelectedToGroup(group.id)}
                style={{
                  background: bg,
                  border: `2px solid ${borderColor}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  cursor: isTarget ? 'pointer' : 'default',
                  boxShadow: isTarget ? `0 0 0 4px ${glowColor}, 0 8px 24px rgba(99,102,241,0.15)` : isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'all 0.2s',
                  transform: isTarget ? 'translateY(-2px)' : 'none',
                }}
              >
                {/* Group header */}
                <div style={{
                  background: isTarget
                    ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                    : isSource
                      ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                      : groupHdr,
                  padding: '12px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 0.2s',
                }}>
                  <div>
                    <Text style={{ color: '#fff', fontWeight: 800, fontSize: 15, display: 'block', lineHeight: 1.2 }}>
                      {group.name}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                      {group.teams.length} {copy.team}
                      {isTarget && <span style={{ color: '#c7d2fe', marginInlineStart: 6 }}>{copy.clickMoveHere}</span>}
                    </Text>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                    style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    <DeleteOutlined />
                  </button>
                </div>

                {/* Teams list */}
                <div onClick={(e) => e.stopPropagation()}>
                  {group.teams.length === 0 ? (
                    <div
                      onClick={() => selectedTeam && moveSelectedToGroup(group.id)}
                      style={{
                        padding: '28px 16px', textAlign: 'center',
                        color: selectedTeam ? '#6366f1' : textSec,
                        fontSize: 13, cursor: selectedTeam ? 'pointer' : 'default',
                        transition: 'color 0.15s',
                      }}
                    >
                      {selectedTeam ? copy.clickToMove : copy.emptyGroup}
                    </div>
                  ) : (
                    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {group.teams.map((team, i) => {
                        const isSelected = selectedTeam?.team.id === team.id;
                        const canSwap    = !!selectedTeam && !isSelected && !!selectedTeam.fromGroupId;

                        return (
                          <div
                            key={team.id}
                            onClick={() => selectedTeam && !isSelected ? swapWithTeam(team, group.id) : selectTeam(team, group.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '7px 10px', borderRadius: 9,
                              background: isSelected
                                ? (isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff')
                                : canSwap
                                  ? (isDark ? 'rgba(217,119,6,0.1)' : '#fffbeb')
                                  : (isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb'),
                              border: `1px solid ${isSelected ? '#818cf8' : canSwap ? '#fcd34d' : border}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {/* Rank */}
                            <div style={{
                              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                              background: isSelected ? '#6366f1' : (isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb'),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: isSelected ? '#fff' : textSec,
                              fontSize: 11, fontWeight: 800,
                            }}>
                              {i + 1}
                            </div>

                            <TeamAvatar team={team} size={28} />

                            <Text style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#6366f1' : text, flex: 1, transition: 'color 0.15s' }} ellipsis>
                              {team.name}
                            </Text>

                            {team.seed && (
                              <div style={{ background: '#d97706', color: '#fff', borderRadius: 5, padding: '1px 6px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                {team.seed}
                              </div>
                            )}

                            {canSwap && (
                              <SwapOutlined style={{ color: '#d97706', fontSize: 12, flexShrink: 0 }} />
                            )}

                            {/* Remove button */}
                            <div
                              onClick={(e) => { e.stopPropagation(); removeFromGroup(team, group.id); }}
                              style={{
                                width: 20, height: 20, borderRadius: 5,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: isDark ? 'rgba(255,255,255,0.2)' : '#d1d5db',
                                cursor: 'pointer', flexShrink: 0, fontSize: 10,
                                transition: 'all 0.15s',
                              }}
                            >
                              <CloseOutlined />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ Legend ══ */}
      {groups.length > 0 && allTeams.length > 0 && (
        <div style={{
          background: bgSoft, border: `1px solid ${border}`,
          borderRadius: 12, padding: '12px 18px',
          display: 'flex', gap: 20, flexWrap: 'wrap',
          transition: 'all 0.3s',
        }}>
          {[
            { color: '#6366f1', bg: isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff', label: copy.legend[0] },
            { color: '#d97706', bg: isDark ? 'rgba(217,119,6,0.15)' : '#fffbeb', label: copy.legend[1] },
            { color: textSec, bg: bgSoft, label: copy.legend[2] },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: item.bg, border: `1.5px solid ${item.color}`, flexShrink: 0 }} />
              <Text style={{ color: textSec, fontSize: 12 }}>{item.label}</Text>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
