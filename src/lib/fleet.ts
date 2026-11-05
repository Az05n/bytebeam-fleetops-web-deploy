import { demoFleetData } from '../data/demoData'
import type { FleetData, Trip, TripPoint, Vehicle } from '../types'
import { supabase } from './supabase'

const normalizeVehicle = (vehicle: Partial<Vehicle>): Vehicle => ({
  id: String(vehicle.id ?? 'vehicle-unknown'),
  vehicle_number: String(vehicle.vehicle_number ?? 'N/A'),
  name: String(vehicle.name ?? 'Unnamed vehicle'),
  vehicle_type: String(vehicle.vehicle_type ?? 'Fleet vehicle'),
  registration_number: String(vehicle.registration_number ?? 'N/A'),
  driver_name: String(vehicle.driver_name ?? 'Unassigned'),
  status: (vehicle.status as Vehicle['status']) ?? 'idle',
  latitude: Number(vehicle.latitude ?? 0),
  longitude: Number(vehicle.longitude ?? 0),
  fuel_level: Number(vehicle.fuel_level ?? 0),
  battery_level: vehicle.battery_level == null ? null : Number(vehicle.battery_level),
  ignition_on: Boolean(vehicle.ignition_on),
  last_seen: String(vehicle.last_seen ?? new Date().toISOString()),
  created_at: String(vehicle.created_at ?? new Date().toISOString()),
  updated_at: String(vehicle.updated_at ?? new Date().toISOString()),
})

const normalizeTrip = (trip: Partial<Trip>): Trip => ({
  id: String(trip.id ?? 'trip-unknown'),
  vehicle_id: String(trip.vehicle_id ?? 'unknown-vehicle'),
  start_location: String(trip.start_location ?? 'Unknown'),
  end_location: String(trip.end_location ?? 'Unknown'),
  start_time: String(trip.start_time ?? new Date().toISOString()),
  end_time: String(trip.end_time ?? new Date().toISOString()),
  distance_km: Number(trip.distance_km ?? 0),
  duration_minutes: Number(trip.duration_minutes ?? 0),
  average_speed_kmh: Number(trip.average_speed_kmh ?? 0),
  max_speed_kmh: Number(trip.max_speed_kmh ?? 0),
  idle_minutes: Number(trip.idle_minutes ?? 0),
  halt_count: Number(trip.halt_count ?? 0),
  overspeed_events: Number(trip.overspeed_events ?? 0),
  trip_status: (trip.trip_status as Trip['trip_status']) ?? 'scheduled',
  created_at: String(trip.created_at ?? new Date().toISOString()),
})

const normalizeTripPoint = (point: Partial<TripPoint>): TripPoint => ({
  id: String(point.id ?? 'point-unknown'),
  trip_id: String(point.trip_id ?? 'unknown-trip'),
  latitude: Number(point.latitude ?? 0),
  longitude: Number(point.longitude ?? 0),
  recorded_at: String(point.recorded_at ?? new Date().toISOString()),
  sequence_number: Number(point.sequence_number ?? 0),
})

export async function fetchFleetData(): Promise<FleetData> {
  if (!supabase) {
    return demoFleetData
  }

  const [vehiclesResponse, tripsResponse, tripPointsResponse] = await Promise.all([
    supabase.from('vehicles').select('*').order('last_seen', { ascending: false }),
    supabase.from('trips').select('*').order('start_time', { ascending: false }),
    supabase.from('trip_points').select('*').order('sequence_number', { ascending: true }),
  ])

  const queryError =
    vehiclesResponse.error ?? tripsResponse.error ?? tripPointsResponse.error
  if (queryError) {
    throw new Error(`Unable to load fleet data from Supabase: ${queryError.message}`)
  }

  return {
    vehicles: (vehiclesResponse.data ?? []).map(normalizeVehicle),
    trips: (tripsResponse.data ?? []).map(normalizeTrip),
    tripPoints: (tripPointsResponse.data ?? []).map(normalizeTripPoint),
  }
}
