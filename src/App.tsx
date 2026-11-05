import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import type { Session } from '@supabase/supabase-js'
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CarFront,
  Gauge,
  LogOut,
  MapPinned,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react'
import { divIcon } from 'leaflet'
import { fetchFleetData } from './lib/fleet'
import { supabase } from './lib/supabase'
import type { FleetData, VehicleStatus } from './types'

const vehicleStatusStyles: Record<VehicleStatus, string> = {
  moving: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  idle: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30',
  warning: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  offline: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
}

const markerColors: Record<VehicleStatus, string> = {
  moving: '#34d399',
  idle: '#94a3b8',
  warning: '#f59e0b',
  offline: '#f87171',
}

function hasValidLocation(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

function MapSizeObserver() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    let frame = 0

    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        map.invalidateSize({ pan: false })
      })
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [map])

  return null
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(() => !supabase)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const client = supabase

    if (!client) {
      return
    }

    let isMounted = true

    const initializeSession = async () => {
      try {
        const { data, error } = await client.auth.getSession()
        if (isMounted) {
          setSession(data.session ?? null)
          if (error) {
            setAuthError(`Unable to restore your session: ${error.message}`)
          }
        }
      } catch (sessionError) {
        if (isMounted) {
          setSession(null)
          setAuthError(
            sessionError instanceof Error
              ? `Unable to restore your session: ${sessionError.message}`
              : 'Unable to restore your session.',
          )
        }
      } finally {
        if (isMounted) {
          setAuthReady(true)
        }
      }
    }

    initializeSession()

    const { data: authListener } = client.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession)
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    const client = supabase

    if (!client) {
      setSession(null)
      return
    }

    try {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) {
        setAuthError(`Unable to sign out: ${error.message}`)
        return
      }

      setAuthError(null)
      setSession(null)
    } catch (signOutError) {
      setAuthError(
        signOutError instanceof Error
          ? `Unable to sign out: ${signOutError.message}`
          : 'Unable to sign out. Please try again.',
      )
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute
              authReady={authReady}
              authError={authError}
              session={session}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/login"
          element={supabase && session ? <Navigate to="/" replace /> : <LoginPage authError={authError} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function ProtectedRoute({
  authReady,
  authError,
  session,
  onLogout,
}: {
  authReady: boolean
  authError: string | null
  session: Session | null
  onLogout: () => Promise<void> | void
}) {
  if (!authReady) {
    return <LoadingScreen label="Restoring secure session" />
  }

  if (!supabase) {
    return <DashboardPage previewMode authError={authError} onLogout={onLogout} />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <DashboardPage authError={authError} session={session} onLogout={onLogout} />
}

function LoginPage({ authError }: { authError: string | null }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!supabase) {
      setError('Supabase credentials are not configured yet. Add the values in the .env file and refresh the page.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
      } else {
        navigate('/', { replace: true })
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to sign in. Please check the credentials and try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-soft backdrop-blur-sm md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-between bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),transparent_35%),linear-gradient(135deg,#0f172a,#111827_40%,#020617)] p-8 md:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Bytebeam</p>
              <h1 className="text-xl font-semibold text-white">FleetOps</h1>
            </div>
          </div>

          <div className="mt-10 space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-cyan-300">Operations dashboard</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight text-white">
                Keep the fleet moving with clear operational insight.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetricHighlight label="Vehicles active" value="96%" detail="Across 10 regions" />
              <MetricHighlight label="Trips today" value="147" detail="On schedule" />
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/40 p-4 text-sm text-slate-300">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Authenticated access for operations teams and dispatch leads.
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Secure access</p>
            <h3 className="mt-3 text-3xl font-semibold text-white">Operations login</h3>
          </div>

          {!supabase ? (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              Supabase is not configured yet. Add the project URL and anon key in the .env file to enable login.
            </div>
          ) : null}

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Work email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500"
                placeholder="ops@bytebeam.io"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500"
                placeholder="••••••••"
                required
              />
            </div>

            {error || authError ? (
              <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error || authError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !supabase}
              className="flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isSubmitting ? 'Signing in…' : 'Login to dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function DashboardPage({
  previewMode = false,
  authError,
  session,
  onLogout,
}: {
  previewMode?: boolean
  authError?: string | null
  session?: Session | null
  onLogout?: () => Promise<void> | void
}) {
  const [fleetData, setFleetData] = useState<FleetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleStatus>('all')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [activeNavigation, setActiveNavigation] = useState('Overview')
  const [today] = useState(() => new Date())
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)

    try {
      setFleetData(await fetchFleetData())
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Unable to refresh fleet data at the moment.',
      )
    } finally {
      setRefreshing(false)
    }
  }

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId)
    setSelectedTripId(null)
  }

  const handleSelectTrip = (tripId: string) => {
    const trip = fleetData?.trips.find((item) => item.id === tripId)
    if (!trip) {
      return
    }

    setSearch('')
    setStatusFilter('all')
    setSelectedVehicleId(trip.vehicle_id)
    setSelectedTripId(trip.id)
  }

  useEffect(() => {
    let isMounted = true

    const loadFleet = async () => {
      try {
        const nextFleetData = await fetchFleetData()
        if (isMounted) {
          setFleetData(nextFleetData)
          setSelectedVehicleId(nextFleetData.vehicles[0]?.id ?? null)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load fleet data at the moment.',
          )
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadFleet()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredVehicles = useMemo(() => {
    if (!fleetData) {
      return []
    }

    return fleetData.vehicles.filter((vehicle) => {
      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter
      const query = search.trim().toLowerCase()
      const matchesSearch =
        !query ||
        vehicle.name.toLowerCase().includes(query) ||
        vehicle.vehicle_number.toLowerCase().includes(query) ||
        vehicle.driver_name.toLowerCase().includes(query)

      return matchesStatus && matchesSearch
    })
  }, [fleetData, search, statusFilter])

  if (filteredVehicles.length === 0 && selectedVehicleId !== null) {
    setSelectedVehicleId(null)
  } else if (
    filteredVehicles.length > 0 &&
    !filteredVehicles.some((vehicle) => vehicle.id === selectedVehicleId)
  ) {
    setSelectedVehicleId(filteredVehicles[0].id)
  }

  const selectedVehicle = useMemo(
    () =>
      filteredVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ??
      filteredVehicles[0] ??
      null,
    [filteredVehicles, selectedVehicleId],
  )

  const selectedTrip = useMemo(() => {
    if (!fleetData) {
      return null
    }

    if (selectedTripId) {
      return fleetData.trips.find((trip) => trip.id === selectedTripId) ?? null
    }

    if (!selectedVehicle) {
      return null
    }

    return [...fleetData.trips]
      .filter((trip) => trip.vehicle_id === selectedVehicle.id)
      .sort((left, right) => Date.parse(right.start_time) - Date.parse(left.start_time))[0]
  }, [fleetData, selectedTripId, selectedVehicle])

  const routePoints = useMemo(() => {
    if (!fleetData || !selectedTrip) {
      return []
    }

    return fleetData.tripPoints
      .filter((point) => point.trip_id === selectedTrip.id)
      .sort((left, right) => left.sequence_number - right.sequence_number)
      .map((point) => [point.latitude, point.longitude] as [number, number])
  }, [fleetData, selectedTrip])

  const metrics = useMemo(() => {
    if (!fleetData) {
      return {
        totalVehicles: 0,
        movingVehicles: 0,
        attentionNeeded: 0,
        tripsToday: 0,
      }
    }

    const tripCount = fleetData.trips.filter((trip) => {
      const tripDay = new Date(trip.start_time)
      return (
        tripDay.getUTCFullYear() === today.getUTCFullYear() &&
        tripDay.getUTCMonth() === today.getUTCMonth() &&
        tripDay.getUTCDate() === today.getUTCDate()
      )
    }).length

    return {
      totalVehicles: fleetData.vehicles.length,
      movingVehicles: fleetData.vehicles.filter((vehicle) => vehicle.status === 'moving').length,
      attentionNeeded: fleetData.vehicles.filter((vehicle) => vehicle.status === 'warning' || vehicle.status === 'offline').length,
      tripsToday: tripCount,
    }
  }, [fleetData, today])

  const alerts = useMemo(() => {
    if (!fleetData) {
      return []
    }

    return fleetData.vehicles
      .filter(
        (vehicle) =>
          vehicle.status === 'warning' ||
          vehicle.status === 'offline' ||
          vehicle.fuel_level < 25 ||
          (vehicle.battery_level !== null && vehicle.battery_level < 30),
      )
      .slice(0, 4)
  }, [fleetData])

  const recentTrips = useMemo(() => {
    if (!fleetData) {
      return []
    }

    return [...fleetData.trips].sort(
      (left, right) => Date.parse(right.start_time) - Date.parse(left.start_time),
    )
  }, [fleetData])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-[1800px] flex-col xl:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-slate-800 bg-slate-900/70 p-5 xl:w-72 xl:border-b-0 xl:border-r">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Operations</p>
              <p className="text-lg font-semibold text-white">FleetOps</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {[
              { label: 'Overview', icon: Gauge, target: 'overview' },
              { label: 'Fleet map', icon: MapPinned, target: 'fleet-map' },
              { label: 'Trips', icon: ArrowRight, target: 'recent-trips' },
              { label: 'Alerts', icon: BellRing, target: 'alerts' },
            ].map(({ label, icon: Icon, target }) => {
              const active = activeNavigation === label

              return (
              <button
                key={label}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  setActiveNavigation(label)
                  document.getElementById(target)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition ${
                  active
                    ? 'bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
                {active ? <span className="h-2 w-2 rounded-full bg-cyan-300" /> : null}
              </button>
              )
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/20">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Operations Desk</p>
                <p className="text-xs text-slate-400">{session ? 'Authenticated' : previewMode ? 'Preview mode' : 'Ready for login'}</p>
              </div>
            </div>

            {!previewMode && onLogout ? (
              <button
                type="button"
                onClick={() => {
                  if (onLogout) {
                    void onLogout()
                  }
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : null}
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-5 lg:p-6">
          <header className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Fleet command</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Bytebeam Fleet Intelligence</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                <Truck className="h-4 w-4" />
                Fleet snapshot
              </div>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={loading || refreshing}
                aria-label="Refresh fleet data"
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
              >
                <span className="flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </span>
              </button>
            </div>
          </header>

          {authError ? (
            <div role="alert" className="mb-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
              {authError}
            </div>
          ) : null}

          {loading ? (
            <LoadingScreen label="Loading fleet data" />
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
              {error}
            </div>
          ) : fleetData ? (
            <>
              <section id="overview" className="scroll-mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Total vehicles"
                  value={metrics.totalVehicles}
                  detail="Active fleet count"
                  icon={<CarFront className="h-5 w-5" />}
                />
                <MetricCard
                  label="Vehicles in motion"
                  value={metrics.movingVehicles}
                  detail="Currently moving"
                  icon={<Truck className="h-5 w-5" />}
                />
                <MetricCard
                  label="Require attention"
                  value={metrics.attentionNeeded}
                  detail="Warnings & offline"
                  icon={<AlertTriangle className="h-5 w-5" />}
                />
                <MetricCard
                  label="Trips today"
                  value={metrics.tripsToday}
                  detail="Completed or active"
                  icon={<Gauge className="h-5 w-5" />}
                />
              </section>

              <section className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[1.45fr_0.78fr]">
                <div id="fleet-map" className="scroll-mt-6 min-w-0 rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Geographic view</p>
                      <h3 className="mt-1 text-xl font-semibold text-white">Fleet coverage map</h3>
                    </div>
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                      {selectedVehicle ? selectedVehicle.status : 'No data'}
                    </div>
                  </div>

                  <div className="fleet-map h-[440px] min-w-0 w-full overflow-hidden rounded-2xl border border-slate-800">
                    <MapContainer
                      center={[20.5937, 78.9629]}
                      zoom={5}
                      scrollWheelZoom
                      className="h-full w-full"
                    >
                      <MapSizeObserver />
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {fleetData.vehicles.filter((vehicle) => hasValidLocation(vehicle.latitude, vehicle.longitude)).map((vehicle) => (
                        <Marker
                          key={vehicle.id}
                          position={[vehicle.latitude, vehicle.longitude]}
                          icon={divIcon({
                            className: 'fleet-marker-wrapper',
                            html: `<div style="width:16px;height:16px;border-radius:9999px;background:${markerColors[vehicle.status]};box-shadow:0 0 0 4px rgba(15,23,42,0.7),0 0 22px ${markerColors[vehicle.status]};border:2px solid rgba(255,255,255,0.7);"></div>`,
                            iconSize: [16, 16],
                            iconAnchor: [8, 8],
                          })}
                          eventHandlers={{
                            click: () => handleSelectVehicle(vehicle.id),
                          }}
                        >
                          <Popup>
                            <div className="w-44 space-y-1 text-slate-700">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-semibold">{vehicle.name}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] ${vehicleStatusStyles[vehicle.status]}`}>
                                  {vehicle.status}
                                </span>
                              </div>
                              <p className="text-xs">{vehicle.vehicle_number}</p>
                              <p className="text-xs">Driver: {vehicle.driver_name}</p>
                              <p className="text-xs">Fuel: {vehicle.fuel_level}%</p>
                            </div>
                          </Popup>
                        </Marker>
                      ))}

                      {selectedTrip && routePoints.length ? (
                        <Polyline positions={routePoints} color="#22d3ee" weight={4} opacity={0.9} />
                      ) : null}
                    </MapContainer>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Selected asset</p>
                      <h3 className="mt-1 text-xl font-semibold text-white">Vehicle detail</h3>
                    </div>
                  </div>

                  {selectedVehicle ? (
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{selectedVehicle.vehicle_number}</p>
                            <h4 className="mt-2 text-2xl font-semibold text-white">{selectedVehicle.name}</h4>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${vehicleStatusStyles[selectedVehicle.status]}`}>
                            {selectedVehicle.status}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                          <InfoRow label="Driver" value={selectedVehicle.driver_name} />
                          <InfoRow label="Type" value={selectedVehicle.vehicle_type} />
                          <InfoRow label="Fuel" value={`${selectedVehicle.fuel_level}%`} />
                          <InfoRow label="Ignition" value={selectedVehicle.ignition_on ? 'On' : 'Off'} />
                          <InfoRow label="Lat" value={selectedVehicle.latitude.toFixed(4)} />
                          <InfoRow label="Lon" value={selectedVehicle.longitude.toFixed(4)} />
                        </div>
                      </div>

                      {selectedTrip ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-white">Latest trip</p>
                            <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                              {selectedTrip.trip_status}
                            </span>
                          </div>

                          <div className="mt-4 space-y-3 text-sm text-slate-300">
                            <InfoRow label="From" value={selectedTrip.start_location} />
                            <InfoRow label="To" value={selectedTrip.end_location} />
                            <InfoRow label="Distance" value={`${selectedTrip.distance_km} km`} />
                            <InfoRow label="Avg speed" value={`${selectedTrip.average_speed_kmh} km/h`} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <EmptyState label="No vehicle selected" />
                  )}
                </div>
              </section>

              <section className="mt-6 grid scroll-mt-6 gap-6 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
                <div id="recent-trips" className="scroll-mt-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Assets</p>
                      <h3 className="mt-1 text-xl font-semibold text-white">Vehicle list</h3>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-2 py-2 text-slate-300">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="w-28 bg-transparent text-sm placeholder:text-slate-500 focus:outline-none"
                        placeholder="Search"
                        aria-label="Search vehicles"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as 'all' | VehicleStatus)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none"
                    >
                      <option value="all">All statuses</option>
                      <option value="moving">Moving</option>
                      <option value="idle">Idle</option>
                      <option value="warning">Warning</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    {filteredVehicles.length ? (
                      filteredVehicles.map((vehicle) => (
                        <button
                          key={vehicle.id}
                          type="button"
                          onClick={() => handleSelectVehicle(vehicle.id)}
                          className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${
                            selectedVehicle?.id === vehicle.id
                              ? 'border-cyan-500/50 bg-cyan-500/10'
                              : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-cyan-300">
                              <Truck className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{vehicle.name}</p>
                              <p className="text-xs text-slate-400">{vehicle.vehicle_number}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${vehicleStatusStyles[vehicle.status]}`}>
                              {vehicle.status}
                            </span>
                            <p className="mt-1 text-xs text-slate-400">{vehicle.fuel_level}% fuel</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <EmptyState label="No vehicles match the current filter" />
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Operations</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">Recent trips</h3>
                  </div>

                  <div className="space-y-3">
                    {recentTrips.length ? recentTrips.slice(0, 5).map((trip) => (
                      <button
                        key={trip.id}
                        type="button"
                        onClick={() => handleSelectTrip(trip.id)}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          selectedTrip?.id === trip.id
                            ? 'border-cyan-500/50 bg-cyan-500/10'
                            : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{trip.start_location}</p>
                            <p className="mt-1 text-xs text-slate-400">→ {trip.end_location}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-300">{trip.distance_km} km</p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{trip.trip_status}</p>
                          </div>
                        </div>
                      </button>
                    )) : <EmptyState label="No trips available" />}
                  </div>
                </div>

                <div id="alerts" className="scroll-mt-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Attention</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">Alerts</h3>
                  </div>

                  <div className="space-y-3">
                    {alerts.length ? (
                      alerts.map((vehicle) => (
                        <div key={vehicle.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-white">{vehicle.name}</p>
                              <p className="text-xs text-slate-400">{vehicle.vehicle_number}</p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[10px] ${vehicleStatusStyles[vehicle.status]}`}>
                              {vehicle.status}
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-slate-300">
                            Fuel {vehicle.fuel_level}% • Last seen {formatTimeAgo(vehicle.last_seen)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <EmptyState label="No active alerts" />
                    )}
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: string | number
  detail: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/20">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  )
}

function MetricHighlight({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-950/30 p-4">
      <p className="text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-300">{detail}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-2.5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 p-4 text-sm text-slate-400">{label}</div>
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-200">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm">
        <div className="h-3 w-3 animate-pulse rounded-full bg-cyan-400" />
        {label}
      </div>
    </div>
  )
}

function formatTimeAgo(dateValue: string) {
  const timestamp = new Date(dateValue).getTime()
  if (Number.isNaN(timestamp)) {
    return 'recently'
  }

  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000))
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} hr ago`
  }

  return `${Math.floor(diffHours / 24)} d ago`
}

export default App
