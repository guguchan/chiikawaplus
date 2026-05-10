import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { BadgeTheme, BadgeCharacter } from '../types'
import BadgeForm from './BadgeForm'

interface Props {
  badges: BadgeTheme[]
  characters: BadgeCharacter[]
  onRefresh: () => void
  onRefreshChars: () => void
  onToast: (text: string, type?: 'success' | 'error') => void
}

const REGIONS = ['全部區域', '關東', '關西', '北海道．東北', '中部', '九州．沖繩', '中國．四國', '其他']

export default function BadgesTab({ badges, characters, onRefresh, onRefreshChars, onToast }: Props) {
  const [regionFilter, setRegionFilter] = useState('全部區域')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editBadge, setEditBadge] = useState<BadgeTheme | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [images, setImages] = useState<Map<number, string>>(new Map())
  // P3: local ownership overrides for instant UI feedback (optimistic update)
  const [ownershipOverrides, setOwnershipOverrides] = useState<Map<string, boolean>>(new Map())

  useEffect(() => {
    const missingIds = badges.filter(b => !images.has(b.id)).map(b => b.id)
    if (!missingIds.length) return
    supabase.from('badge_themes').select('id, image_base64')
      .in('id', missingIds)
      .then(({ data, error }) => {
        if (error) {
          // Mark all missing IDs with a sentinel so we don't retry on every render
          setImages(prev => {
            const next = new Map(prev)
            for (const id of missingIds) if (!next.has(id)) next.set(id, '')
            return next
          })
          return
        }
        if (!data) return
        setImages(prev => {
          const next = new Map(prev)
          // Mark fetched IDs (even if no image) to prevent infinite retries
          for (const id of missingIds) if (!next.has(id)) next.set(id, '')
          for (const row of data) if (row.image_base64) next.set(row.id, row.image_base64)
          return next
        })
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges])

  const filtered = badges.filter(b => {
    const matchRegion = regionFilter === '全部區域' || b.region === regionFilter
    const q = search.toLowerCase()
    const matchSearch = !q || [b.theme_name, b.location_name, b.japanese_name ?? ''].some(s => s.toLowerCase().includes(q))
    return matchRegion && matchSearch
  })

  function getOwned(badgeId: number, charId: number, fallback: boolean) {
    const key = `${badgeId}-${charId}`
    return ownershipOverrides.has(key) ? ownershipOverrides.get(key)! : fallback
  }

  async function toggleOwnership(badgeId: number, charId: number, current: boolean) {
    const key = `${badgeId}-${charId}`
    if (togglingId === key) return
    const next = !current
    // Optimistic update — instant UI response
    setOwnershipOverrides(prev => new Map(prev).set(key, next))
    setTogglingId(key)
    try {
      const { error } = await supabase.from('badge_ownership').upsert({
        badge_theme_id: badgeId,
        character_id: charId,
        owned: next,
      })
      if (error) throw error
      // Success: override stays, no full reload needed
    } catch (e: unknown) {
      // Revert optimistic update on error
      setOwnershipOverrides(prev => {
        const m = new Map(prev)
        m.delete(key)
        return m
      })
      onToast(`更新失敗：${e instanceof Error ? e.message : '未知錯誤'}`, 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const ownedCounts = characters.map(c => ({
    name: c.name,
    count: badges.filter(b => {
      const key = `${b.id}-${c.id}`
      if (ownershipOverrides.has(key)) return ownershipOverrides.get(key)!
      return b.badge_ownership?.some(o => o.character_id === c.id && o.owned)
    }).length,
  }))

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
        padding: '16px 0 12px',
      }}>
        <select
          className="field-input"
          style={{ width: 160, flexShrink: 0 }}
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
        >
          {REGIONS.map(r => <option key={r}>{r}</option>)}
        </select>
        <input
          className="field-input"
          style={{ flex: 1, minWidth: 160, maxWidth: 280 }}
          placeholder="搜尋主題、地名、日文名…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-primary" onClick={() => { setEditBadge(null); setShowForm(true) }}>
            ＋ 新增主題
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap',
        padding: '8px 12px', background: 'var(--cream-deep)',
        borderRadius: 'var(--radius-sm)', marginBottom: 12,
        fontSize: 13, color: 'var(--ink-soft)',
      }}>
        <span>顯示 <strong style={{ color: 'var(--ink)' }}>{filtered.length}</strong> / {badges.length} 款</span>
        {ownedCounts.map(o => (
          <span key={o.name}>{o.name}：<strong style={{ color: 'var(--peach)' }}>{o.count}</strong> / {badges.length}</span>
        ))}
      </div>

      {/* Table (desktop) */}
      <div className="badge-table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--cream-deep)', borderBottom: '2px solid var(--line)' }}>
              {characters.map(c => (
                <th key={c.id} style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {c.name}
                </th>
              ))}
              <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13 }}>附圖</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13 }}>地區／地名</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13 }}>主題名稱</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13 }}>所屬區域</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13 }}>日文原名</th>
              <th style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={characters.length + 5} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>無符合條件的鐵牌</td></tr>
            )}
            {filtered.map((b, i) => (
              <tr key={b.id} style={{ background: i % 2 === 0 ? 'var(--card)' : 'var(--surface)', borderBottom: '1px solid var(--line-soft)' }}>
                {/* Ownership circles */}
                {characters.map(c => {
                  const rawOwned = b.badge_ownership?.find(x => x.character_id === c.id)?.owned ?? false
                  const owned = getOwned(b.id, c.id, rawOwned)
                  const key = `${b.id}-${c.id}`
                  return (
                    <td key={c.id} style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleOwnership(b.id, c.id, owned)}
                        disabled={togglingId === key}
                        style={{
                          width: 30, height: 30, borderRadius: '50%',
                          border: owned ? 'none' : '2px dashed var(--line)',
                          background: owned ? 'var(--peach)' : 'transparent',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                          opacity: togglingId === key ? 0.5 : 1,
                          cursor: 'pointer',
                        }}
                        title={owned ? '已擁有，點擊取消' : '未擁有，點擊標記'}
                      >
                        {owned && <span style={{ color: '#fff', fontSize: 14, lineHeight: 1 }}>✓</span>}
                      </button>
                    </td>
                  )
                })}
                {/* 附圖 */}
                <td style={{ padding: '8px 12px' }}>
                  {(() => {
                    const img = images.get(b.id)
                    if (img) return <img src={img} alt="附圖" style={{ width: 'auto', height: 160, objectFit: 'contain', borderRadius: 4, display: 'block' }} />
                    if (images.has(b.id)) return <div style={{ width: 120, height: 160, background: 'var(--cream-deep)', border: '1px dashed var(--line)', borderRadius: 4 }} />
                    return (
                      <div style={{ width: 120, height: 160, background: 'var(--cream-deep)', border: '1px dashed var(--line)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      </div>
                    )
                  })()}
                </td>
                {/* 地區 */}
                <td style={{ padding: '10px 12px', color: 'var(--ink-soft)' }}>{b.location_name}</td>
                {/* 主題名稱 */}
                <td style={{ padding: '10px 12px', color: 'var(--peach)', fontWeight: 600 }}>{b.theme_name}</td>
                {/* 所屬區域 */}
                <td style={{ padding: '10px 12px', color: 'var(--ink-soft)', fontSize: 13 }}>{b.region}</td>
                {/* 日文 */}
                <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>{b.japanese_name ?? '—'}</td>
                {/* 編輯 */}
                <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                  <button
                    className="btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => { setEditBadge(b); setShowForm(true) }}
                  >
                    編輯
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="badge-cards">
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>無符合條件的鐵牌</div>
        )}
        {filtered.map(b => (
          <div key={b.id} style={{
            background: 'var(--card)', border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius-sm)', marginBottom: 10,
            display: 'flex', alignItems: 'stretch', overflow: 'hidden',
          }}>
            {/* 左：內容區 */}
            <div style={{ flex: 1, minWidth: 0, padding: 14 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <button className="btn-ghost" style={{ fontSize: 12, padding: '3px 8px', flexShrink: 0 }} onClick={() => { setEditBadge(b); setShowForm(true) }}>編輯</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--peach)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.theme_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{b.location_name} · {b.region}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {characters.map(c => {
                const rawOwned = b.badge_ownership?.find(x => x.character_id === c.id)?.owned ?? false
                const owned = getOwned(b.id, c.id, rawOwned)
                const key = `${b.id}-${c.id}`
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleOwnership(b.id, c.id, owned)}
                    disabled={togglingId === key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 20,
                      border: owned ? 'none' : '1.5px dashed var(--line)',
                      background: owned ? 'var(--peach)' : 'transparent',
                      color: owned ? '#fff' : 'var(--muted)',
                      fontSize: 13, cursor: 'pointer',
                      minHeight: 44,  /* WCAG 2.5.5 touch target minimum */
                    }}
                  >
                    {owned && '✓ '}{c.name}
                  </button>
                )
              })}
              </div>
            </div>
            {/* 右：圖片（撐滿整列高度） */}
            <div style={{ width: 120, flexShrink: 0, background: 'var(--cream-deep)', borderLeft: '1px dashed var(--line)' }}>
              {(() => {
                const img = images.get(b.id)
                return img
                  ? <img src={img} alt="附圖" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                  : null
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showForm && (
        <BadgeForm
          badge={editBadge}
          characters={characters}
          onClose={() => { setShowForm(false); setEditBadge(null) }}
          onSaved={onRefresh}
          onRefreshChars={onRefreshChars}
          onToast={onToast}
        />
      )}

      <style>{`
        .badge-table-wrap { display: block; overflow-x: auto; }
        .badge-cards { display: none; }
        @media (max-width: 767px) {
          .badge-table-wrap { display: none; }
          .badge-cards { display: block; }
        }
      `}</style>
    </div>
  )
}
