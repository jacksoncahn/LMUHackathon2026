import { useState, useEffect } from 'react'
import { submitUserLocation, fetchUserLocations, voteOnLocation } from '../services/databaseInteraction'

const RADIUS_METERS = 1609.34

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function Petition({ lat, lng, address }) {
  const [type, setType] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null) // 'success' | 'error' | null
  const [petitions, setPetitions] = useState([])
  const [votedIds, setVotedIds] = useState(new Set())

  useEffect(() => {
    if (lat == null || lng == null) return
    fetchUserLocations().then((all) => {
      const nearby = all.filter(
        (p) => haversineDistance(lat, lng, p.lat, p.lng) <= RADIUS_METERS
      )
      setPetitions(nearby)
    })
  }, [lat, lng])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!type.trim()) return
    setSubmitting(true)
    setStatus(null)
    try {
      const id = await submitUserLocation({ address, type, lat, lng })
      setPetitions((prev) => [...prev, { id, address, type, lat, lng, votes: 0 }])
      setType('')
      setStatus('success')
    } catch {
      setStatus('error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVote(id) {
    if (votedIds.has(id)) return
    await voteOnLocation(id)
    setVotedIds((prev) => new Set(prev).add(id))
    setPetitions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, votes: (p.votes || 0) + 1 } : p))
    )
  }

  return (
    <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginTop: 4 }}>
      {/* ── Nearby petitions ── */}
      {petitions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: '0.85rem' }}>
            Community petitions nearby ({petitions.length})
          </strong>
          {petitions.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 8, fontSize: '0.82rem',
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>{p.type}</span>
                <span style={{ color: '#666', marginLeft: 6 }}>{p.address}</span>
              </div>
              {/* <button
                onClick={() => handleVote(p.id)}
                disabled={votedIds.has(p.id)}
                style={{
                  marginLeft: 8, padding: '2px 8px', borderRadius: 4, border: '1px solid #2563eb',
                  background: votedIds.has(p.id) ? '#eff6ff' : 'white',
                  color: '#2563eb', cursor: votedIds.has(p.id) ? 'default' : 'pointer',
                  fontSize: '0.78rem', whiteSpace: 'nowrap',
                }}
              >
                👍 {p.votes || 0}
              </button> */}
            </div>
          ))}
        </div>
      )}

      {/* ── Submit new petition ── */}
      <strong style={{ fontSize: '0.85rem' }}>Start a petition</strong>
      {status === 'success' ? (
        <p style={{ color: 'green', fontSize: '0.82rem', margin: '6px 0 0' }}>
          Petition submitted!
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Store type…"
            required
            style={{
              flex: 1, padding: '6px 8px', borderRadius: 6,
              border: '1px solid #ddd', fontSize: '0.82rem',
            }}
          />
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: '#2563eb', color: 'white', border: 'none',
              borderRadius: 6, padding: '6px 10px', cursor: 'pointer',
              fontSize: '0.82rem', opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? '…' : 'Add'}
          </button>
        </form>
      )}
      {status === 'error' && (
        <p style={{ color: '#dc2626', fontSize: '0.82rem', margin: '4px 0 0' }}>
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  )
}
