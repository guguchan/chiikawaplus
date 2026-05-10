import { useEffect } from 'react'

interface Props {
  src: string
  caption?: string | null
  onClose: () => void
}

export default function PhotoViewer({ src, caption, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{ alignItems: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 720, width: '100%',
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-pop)',
          animation: 'pop 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        <img
          src={src}
          alt="照片"
          style={{ width: '100%', display: 'block', maxHeight: '70dvh', objectFit: 'contain', background: '#1a1208' }}
        />
        {caption && (
          <div style={{ padding: '14px 20px', color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.6 }}>
            {caption}
          </div>
        )}
        <div style={{ padding: '0 20px 16px', textAlign: 'right' }}>
          <button className="btn-ghost" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  )
}
