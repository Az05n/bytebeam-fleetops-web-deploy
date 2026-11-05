export type VehicleStatus = 'moving' | 'idle' | 'warning' | 'offline'

export type TripStatus = 'completed' | 'in_progress' | 'scheduled'

export interface Vehicle {
  id: string
  vehicle_number: string
  name: string
  vehicle_type: string
  registration_number: string
  driver_name: string
  status: VehicleStatus
  latitude: number
  longitude: number
  fuel_level: number
  battery_level: number | null
  ignition_on: boolean
  last_seen: string
  created_at: string
  updated_at: string
}

export interface TripPoint {
  id: string
  trip_id: string
  latitude: number
  longitude: number
  recorded_at: string
  sequence_number: number
}

export interface Trip {
  id: string
  vehicle_id: string
  start_location: string
  end_location: string
  start_time: string
  end_time: string
  distance_km: number
  duration_minutes: number
  average_speed_kmh: number
  max_speed_kmh: number
  idle_minutes: number
  halt_count: number
  overspeed_events: number
  trip_status: TripStatus
  created_at: string
}

export interface FleetData {
  vehicles: Vehicle[]
  trips: Trip[]
  tripPoints: TripPoint[]
}
