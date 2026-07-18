export type AircraftCategory = 'glider' | 'airplane' | 'helicopter'
export type AircraftStatus = 'active' | 'maintenance' | 'grounded' | 'retired'
export type FlightStatus = 'draft' | 'launched' | 'landed' | 'pending_approval' | 'approved'
export type PicType = 'PIC' | 'Dual' | 'Solo'
export type UserRole = 'admin' | 'manager' | 'instructor' | 'operator' | 'member'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  organization_id: string
  is_active: boolean
  created_at: string
}

export interface Aircraft {
  id: string
  registration_number: string
  aircraft_type: string
  aircraft_category: AircraftCategory
  aircraft_status: AircraftStatus
  is_visible: boolean
  display_order?: number
  aircraft_memo?: string
  aircraft_initial_airframe_time: number
  aircraft_initial_flight_count: number
  aircraft_initial_takeoff_count: number
  aircraft_initial_landing_count: number
  created_at: string
  updated_at: string
}

export interface FlightSubject {
  id: string
  name: string
  display_order: number
  is_active: boolean
}

export interface LaunchMethod {
  id: string
  name: string
  display_order: number
  is_active: boolean
}

export interface Flight {
  id: string
  aircraft_id: string
  aircraft?: Aircraft
  pilot_id: string
  pilot?: User
  instructor_id?: string
  instructor?: User
  copilot_name?: string
  subject_id: string
  subject?: FlightSubject
  launch_method_id: string
  launch_method?: LaunchMethod
  departure_time: string
  arrival_time?: string
  flight_time?: number
  departure_place: string
  arrival_place: string
  landing_count: number
  takeoff_count: number
  night_landing_count: number
  night_takeoff_count: number
  pic_type: PicType
  flight_status: FlightStatus
  release_altitude?: number
  max_altitude?: number
  aircraft_category: AircraftCategory
  flight_rule?: 'VFR' | 'IFR'
  route?: string
  flight_content?: string
  pic_time?: number
  solo_time?: number
  sic_time?: number
  copilot_time?: number
  dual_instruction_time?: number
  hood_time?: number
  actual_instrument_time?: number
  cross_country_time?: number
  instruction_time?: number
  other_flight_time?: number
  supplementary_note?: string
  flights_memo?: string
  is_edited: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface PersonalLogEntry {
  id: string
  flight_id: string
  flight?: Flight
  user_id: string
  aircraft_category: AircraftCategory
  date: string
  aircraft_type: string
  registration_number: string
  departure_place: string
  arrival_place: string
  departure_time: string
  arrival_time?: string
  flight_content?: string
  landing_count: number
  night_landing_count: number
  takeoff_count: number
  night_takeoff_count: number
  total_flight_time: number
  pic_time?: number
  solo_time?: number
  sic_time?: number
  copilot_time?: number
  dual_instruction_time?: number
  cross_country_pic_solo_picus_time?: number
  night_pic_solo_picus_time?: number
  cross_country_copilot_dual_time?: number
  night_copilot_dual_time?: number
  hood_time?: number
  actual_instrument_time?: number
  other_flight_time?: number
  instruction_time?: number
  instructor_id?: string
  instructor_name?: string
  supplementary_note?: string
  memo?: string
  logbook_page_no?: number
  row_no_in_page?: number
  launch_method_id?: string
  launch_method_name?: string
  created_at: string
}

export interface AircraftLogEntry {
  id: string
  flight_id: string
  aircraft_id: string
  aircraft?: Aircraft
  aircraft_category: AircraftCategory
  aircraft_type: string
  registration_number: string
  date: string
  departure_place: string
  arrival_place: string
  departure_time: string
  arrival_time?: string
  flight_time: number
  pilot_id: string
  pilot_name: string
  instructor_id?: string
  instructor_name?: string
  copilot_name?: string
  flight_content?: string
  takeoff_count: number
  landing_count: number
  night_takeoff_count: number
  night_landing_count: number
  initial_airframe_time: number
  final_airframe_time: number
  initial_flight_count: number
  final_flight_count: number
  initial_landing_count: number
  final_landing_count: number
  launch_method_name?: string
  release_altitude?: number
  max_altitude?: number
  supplementary_note?: string
  maintenance_note?: string
  memo?: string
  created_at: string
}

export interface Organization {
  id: string
  name: string
  invite_code?: string
  default_departure_airports: string[]
  default_arrival_airports: string[]
}
