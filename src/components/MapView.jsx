import { useState, useEffect, useRef, Fragment } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from '@react-google-maps/api'
import Papa from 'papaparse'
import snapCsvUrl from '../assets/snap_la.csv?url'

const MAP_CENTER = { lat: 34.0522, lng: -118.2437 }
const MAP_OPTIONS = { disableDefaultUI: false, clickableIcons: false }
const containerStyle = { width: '100%', height: '100vh' }
const RADIUS_METERS = 1609.34 // 1 mile

// ── Haversine distance in meters ────────────────────────────────────────────
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

// ── StoreCircle class ────────────────────────────────────────────────────────
class StoreCircle {
  constructor(loc) {
    this.loc = loc
    this.lat = parseFloat(loc.Latitude)
    this.lng = parseFloat(loc.Longitude)
    this.score = parseFloat(loc['Base Score'])
    this.radius = RADIUS_METERS
  }

  contains(lat, lng) {
    return haversineDistance(this.lat, this.lng, lat, lng) <= this.radius
  }
}

// ── Color helpers ────────────────────────────────────────────────────────────
function scoreColor(score) {
  const s = parseFloat(score)
  if (s >= 4) return 'green'
  if (s >= 2.5) return 'orange'
  return 'red'
}

function circleColor(score) {
  const s = Math.min(Math.max(parseFloat(score), 4), 5)
  const hue = Math.round(210 - (s - 4) * 90)
  return `hsl(${hue}, 70%, 45%)`
}

// ── Component ────────────────────────────────────────────────────────────────
export default function MapView() {
  const [locations, setLocations] = useState([])
  const [storeCircles, setStoreCircles] = useState([])
  const [selected, setSelected] = useState(null)

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchPin, setSearchPin] = useState(null)   // { lat, lng }
  const [results, setResults] = useState(null)        // null = no search yet, [] = searched

  const mapRef = useRef(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_MAPS_API_KEY,
  })

  useEffect(() => {
    Papa.parse(snapCsvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const valid = data.filter(
          (row) => row.Latitude && row.Longitude && !isNaN(parseFloat(row.Latitude))
        )
        setLocations(valid)
        setStoreCircles(valid.map((loc) => new StoreCircle(loc)))
      },
    })
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    if (!query.trim() || !isLoaded) return

    setSearching(true)
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: query }, (geocodeResults, status) => {
      setSearching(false)
      if (status !== 'OK' || !geocodeResults.length) {
        setResults([])
        setSearchPin(null)
        return
      }

      const { lat, lng } = geocodeResults[0].geometry.location
      const point = { lat: lat(), lng: lng() }
      setSearchPin(point)
      mapRef.current?.panTo(point)
      mapRef.current?.setZoom(13)

      const matches = storeCircles
        .filter((sc) => sc.score >= 4 && sc.contains(point.lat, point.lng))
        .map((sc) => sc.loc)

      setResults(matches)
    })
  }

  if (loadError) return <div>Error loading map</div>
  if (!isLoaded) return <div style={{ padding: '2rem' }}>Loading map…</div>

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* ── Search bar overlay ── */}
      <form
        onSubmit={handleSearch}
        style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, display: 'flex', gap: 6, background: 'white',
          borderRadius: 8, padding: '6px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          width: 'min(480px, 90vw)',
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your address…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.9rem' }}
        />
        <button
          type="submit"
          disabled={searching}
          style={{
            background: '#2563eb', color: 'white', border: 'none',
            borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          {searching ? '…' : 'Search'}
        </button>
      </form>

      {/* ── Results panel ── */}
      {results !== null && (
        <div style={{
          position: 'absolute', top: 64, right: 12, zIndex: 10,
          background: 'white', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          width: 300, maxHeight: 'calc(100vh - 90px)', overflowY: 'auto', padding: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: '0.95rem' }}>
              {results.length
                ? `${results.length} store${results.length > 1 ? 's' : ''} within 1 mile`
                : 'No qualifying stores nearby'}
            </strong>
            <button
              onClick={() => { setResults(null); setSearchPin(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#888' }}
            >✕</button>
          </div>

          {results.length === 0 && (
            <p style={{ fontSize: '0.82rem', color: '#666', margin: 0 }}>
              There are no SNAP-authorized stores with a score of 4 or higher within
              1 mile of this address. Try searching a nearby area.
            </p>
          )}

          {results.map((loc) => (
            <div
              key={loc['Record ID']}
              onClick={() => {
                setSelected(loc)
                mapRef.current?.panTo({ lat: parseFloat(loc.Latitude), lng: parseFloat(loc.Longitude) })
              }}
              style={{
                borderTop: '1px solid #eee', paddingTop: 8, marginTop: 8,
                cursor: 'pointer', borderRadius: 4,
              }}
            >
              <strong style={{ fontSize: '0.88rem' }}>{loc['Store Name'].trim()}</strong>
              <p style={{ margin: '2px 0', fontSize: '0.78rem', color: '#555' }}>{loc['Store Type']}</p>
              <p style={{ margin: '2px 0', fontSize: '0.78rem' }}>
                {loc['Street Number']} {loc['Street Name'].trim()}, {loc['City']}, {loc['State']} {loc['Zip Code']}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', fontWeight: 'bold', color: scoreColor(loc['Base Score']) }}>
                Score: {loc['Base Score']} / 5
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Map ── */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={MAP_CENTER}
        zoom={11}
        options={MAP_OPTIONS}
        onLoad={(map) => { mapRef.current = map }}
      >
        {locations.map((loc) => {
          const position = { lat: parseFloat(loc.Latitude), lng: parseFloat(loc.Longitude) }
          return (
            <Fragment key={loc['Record ID']}>
              <Marker position={position} onClick={() => setSelected(loc)} />
              {parseFloat(loc['Base Score']) >= 4 && (
                <Circle
                  center={position}
                  radius={RADIUS_METERS}
                  options={{
                    strokeColor: circleColor(loc['Base Score']),
                    strokeOpacity: 0.6,
                    strokeWeight: 1.5,
                    fillColor: circleColor(loc['Base Score']),
                    fillOpacity: 0.08,
                  }}
                />
              )}
            </Fragment>
          )
        })}

        {searchPin && (
          <Marker
            position={searchPin}
            icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#ef4444', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2 }}
          />
        )}

        {selected && (
          <InfoWindow
            position={{ lat: parseFloat(selected.Latitude), lng: parseFloat(selected.Longitude) }}
            onCloseClick={() => setSelected(null)}
          >
            <div style={{ maxWidth: 220, fontFamily: 'sans-serif' }}>
              <strong style={{ fontSize: '0.95rem' }}>{selected['Store Name'].trim()}</strong>
              <p style={{ margin: '4px 0', color: '#555', fontSize: '0.8rem' }}>{selected['Store Type']}</p>
              <p style={{ margin: '4px 0', fontSize: '0.8rem' }}>
                {selected['Street Number']} {selected['Street Name'].trim()},{' '}
                {selected['City']}, {selected['State']} {selected['Zip Code']}
              </p>
              <p style={{ margin: '6px 0 0', fontWeight: 'bold', color: scoreColor(selected['Base Score']) }}>
                Score: {selected['Base Score']} / 5
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}
