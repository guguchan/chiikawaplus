import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Doll, DollCharacter } from '../types'
import DollForm from './DollForm'
import PhotoViewer from './PhotoViewer'

interface Props {
  dolls: Doll[]
  characters: DollCharacter[]
  onRefresh: () => void
  onRefreshChars: () => void
  onToast: (text: string, type?: 'success' | 'error') => void
}

export default function DollsTab({ dolls, characters, onRefresh, onRefreshChars, onToast }: Props) {
  const [charFilter, setCharFilter] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editDoll, setEditDoll] = useState<Doll | null>(null)
  const [viewPhoto, setViewPhoto] = useState<{ src: string; caption?: string } | null>(null)
  const [dollImages, setDollImages] = useState<Map<number, string>>(new Map())

  useEffect(() => {
    const missingIds = dolls.filter(d => !dollImages.has(d.id)).map(d => d.id)
    if (!missingIds.length) return
    supabase.from('dolls').select('id, photo_base64')
      .in('id', missingIds)
      .then(({ data, error }) => {
        if (error) {
          // Mark IDs with sentinel to prevent infinite retry storm
          setDollImages(prev => {
            const next = new Map(prev)
            for (const id of missingIds) if (!next.has(id)) next.set(id, '')
            return next
          })
          return
        }
        if (!data) return
        setDollImages(prev => {
          const next = new Map(prev)
          for (const id of missingIds) if (!next.has(id)) next.set(id, '')
          for (const row of data) if (row.photo_base64) next.set(row.id, row.photo_base64)
          return next
        })
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dolls])

  const filtered = dolls.filter(d => {
    const matchChar = charFilter === null || d.character_id === charFilter
    const q = search.toLowerCase()
    const charName = d.doll_characters?.name ?? ''
    const matchSearch = !q || (d.notes ?? '').toLowerCase().includes(q) || charName.toLowerCase().includes(q)
    return matchChar && matchSearch
  })

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '16px 0 14px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <button className={`chip ${charFilter === null ? 'active' : ''}`} onClick={() => setCharFilter(null)}>全部</button>
          {characters.map(c => (
            <button key={c.id} className={`chip ${charFilter === c.id ? 'active' : ''}`} onClick={() => setCharFilter(c.id)}>
              {c.name}
              <span style={{ fontSize: 11, opacity: 0.7 }}>
                {' '}{dolls.filter(d => d.character_id === c.id).length}
              </span>
            </button>
          ))}
        </div>
        <input
          className="field-input"
          style={{ width: 180, flexShrink: 0 }}
          placeholder="搜尋備註…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn-primary" onClick={() => { setEditDoll(null); setShowForm(true) }}>＋ 新增娃娃</button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12, animation: 'drift 3s ease-in-out infinite' }}>🐾</div>
          <div>還沒有娃娃，快來新增第一隻！</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(d => {
            const char = d.doll_characters
            const photo = dollImages.get(d.id)
            return (
              <div key={d.id} style={{
                background: 'var(--card)',
                border: '1px solid var(--line-soft)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-soft)',
                transition: 'box-shadow 0.2s, transform 0.2s',
                cursor: 'pointer',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-pop)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-soft)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
              >
                {/* Photo */}
                <div
                  style={{ aspectRatio: '1/1', position: 'relative', background: '#1a1208', overflow: 'hidden' }}
                  onClick={() => photo && setViewPhoto({ src: photo, caption: d.notes ?? undefined })}
                >
                  {photo ? (
                    <img src={photo} alt="娃娃照片" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, var(--peach-soft), var(--cream-deep))',
                    }}>
                      <div style={{
                        width: 60, height: 60, borderRadius: '50%',
                        border: '2px dashed var(--line)', opacity: 0.5,
                      }} />
                    </div>
                  )}
                  {/* Character chip */}
                  {char && (
                    <span style={{
                      position: 'absolute', top: 8, left: 8,
                      background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)',
                      borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                      color: 'var(--peach)',
                    }}>
                      {char.name}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '10px 12px' }}>
                  {d.notes && (
                    <div style={{
                      fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      marginBottom: 6,
                    }}>
                      {d.notes}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {d.acquired_date && (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{d.acquired_date}</span>
                    )}
                    <button
                      style={{ fontSize: 11, color: 'var(--peach)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', minHeight: 44, padding: '0 4px' }}
                      onClick={() => { setEditDoll(d); setShowForm(true) }}
                    >
                      編輯 ›
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <DollForm
          doll={editDoll}
          characters={characters}
          onClose={() => { setShowForm(false); setEditDoll(null) }}
          onSaved={onRefresh}
          onRefreshChars={onRefreshChars}
          onToast={onToast}
        />
      )}
      {viewPhoto && <PhotoViewer src={viewPhoto.src} caption={viewPhoto.caption} onClose={() => setViewPhoto(null)} />}
    </div>
  )
}
