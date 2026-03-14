import { useState, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import Papa from 'papaparse'
import snapCsvUrl from '../assets/snap_la.csv?url'

const MAP_CENTER = { lat: 34.0522, lng: -118.2437 }
const MAP_OPTIONS = {
  disableDefaultUI: false,
  clickableIcons: false,
}

const containerStyle = {
  width: '100%',
  height: '100vh',
}

function scoreColor(score) {
  const s = parseFloat(score)
  if (s >= 4) return 'green'
  if (s >= 2.5) return 'orange'
  return 'red'
}

export default function MapView() {
  const [locations, setLocations] = useState([])
  const [selected, setSelected] = useState(null)

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
      },
    })
  }, [])

  if (loadError) return <div>Error loading map</div>
  if (!isLoaded) return <div style={{ padding: '2rem' }}>Loading map…</div>

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={MAP_CENTER}
      zoom={11}
      options={MAP_OPTIONS}
    >
      {locations.map((loc) => (
        <Marker
          key={loc['Record ID']}
          position={{ lat: parseFloat(loc.Latitude), lng: parseFloat(loc.Longitude) }}
          onClick={() => setSelected(loc)}
        />
      ))}

      {selected && (
        <InfoWindow
          position={{
            lat: parseFloat(selected.Latitude),
            lng: parseFloat(selected.Longitude),
          }}
          onCloseClick={() => setSelected(null)}
        >
          <div style={{ maxWidth: 220, fontFamily: 'sans-serif' }}>
            <strong style={{ fontSize: '0.95rem' }}>{selected['Store Name'].trim()}</strong>
            <p style={{ margin: '4px 0', color: '#555', fontSize: '0.8rem' }}>
              {selected['Store Type']}
            </p>
            <p style={{ margin: '4px 0', fontSize: '0.8rem' }}>
              {selected['Street Number']} {selected['Street Name'].trim()},{' '}
              {selected['City']}, {selected['State']} {selected['Zip Code']}
            </p>
            <p style={{ margin: '6px 0 0', fontWeight: 'bold', color: scoreColor(selected['Base Score']) }}>
              Rating: {selected['Base Score']} / 5
            </p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )
}
