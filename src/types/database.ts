// ============================================================================
// DATABASE TYPES - Exact match with Supabase schema
// These represent the raw data structure from the database
// ============================================================================

export type AssetStatus = 'available' | 'assigned' | 'maintenance' | 'retired'
export type SubscriptionPlan = 'basic' | 'pro' | 'enterprise'
export type CompanyStatus = 'active' | 'inactive' | 'suspended'
export type Theme = 'light' | 'dark' | 'system'
export type UserRole = 'admin' | 'employee'
export type TimeFormat = '12h' | '24h'

// ============================================================================
// Raw Database Row Types (as returned by Supabase)
// ============================================================================

export interface DbCompany {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  logo_url: string | null
  subscription_plan: string | null
  max_users: number | null
  max_assets: number | null
  status: string | null
  created_at: string
  updated_at: string
}

export interface DbUser {
  id: string
  email: string
  full_name: string
  role: string
  avatar_url: string | null
  phone: string | null
  company_id: string
  department_id: string | null
  created_at: string
  updated_at: string
}

export interface DbAsset {
  id: string
  name: string
  description: string
  serial_number: string | null
  category: string | null
  photo_url: string
  status: string
  assigned_to: string | null
  assigned_at: string | null
  purchase_date: string | null
  purchase_price: number | null
  warranty_months: number | null
  warranty_expiry: string | null
  company_id: string | null
  created_at: string
  updated_at: string
}

export interface DbDepartment {
  id: string
  name: string
  description: string | null
  manager_id: string | null
  company_id: string
  created_at: string | null
  updated_at: string | null
}

export interface DbTicket {
  id: string
  title: string
  description: string
  status: string
  priority: string
  category: string | null
  photo_url: string
  asset_id: string | null
  assigned_to: string | null
  accepted_by: string | null
  accepted_at: string | null
  resolved_at: string | null
  created_by: string
  department_id: string | null
  company_id: string
  created_at: string
  updated_at: string
}

// ============================================================================
// APPLICATION TYPES - Ergonomic types for use in components
// FIXED: Now matches database exactly with string | null instead of string | undefined
// ============================================================================

export interface Company {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  logo_url: string | null
  subscription_plan: SubscriptionPlan
  max_users: number
  max_assets: number
  status: CompanyStatus
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  phone: string | null
  company_id: string
  department_id: string | null
  created_at: string
  updated_at: string
  // Joined data
  department?: Department | null
}

// FIXED: Changed all optional fields to explicit string | null
export interface Asset {
  id: string
  name: string
  description: string
  serial_number: string | null  // FIXED: was string | undefined
  category: string | null        // FIXED: was string | undefined
  photo_url: string
  status: AssetStatus
  assigned_to: string | null
  assigned_at: string | null
  purchase_date: string | null
  purchase_price: number | null
  warranty_months: number | null
  warranty_expiry: string | null
  company_id: string | null
  created_at: string
  updated_at: string
  // Joined data
  assigned_user?: User | null
}

export interface Department {
  id: string
  name: string
  description: string | null
  manager_id: string | null
  company_id: string
  created_at: string | null
  updated_at: string | null
  // Joined data
  manager?: User | null
}

export interface Ticket {
  id: string
  title: string
  description: string
  status: string
  priority: string
  category: string | null
  photo_url: string
  asset_id: string | null
  assigned_to: string | null
  accepted_by: string | null
  accepted_at: string | null
  resolved_at: string | null
  created_by: string
  department_id: string | null
  company_id: string
  created_at: string
  updated_at: string
  // Joined data
  asset?: Asset | null
  created_by_user?: User | null
  assigned_user?: User | null
  accepted_by_user?: User | null
}

// ============================================================================
// TYPE GUARDS - Runtime type checking
// ============================================================================

export function isValidAssetStatus(status: string): status is AssetStatus {
  return ['available', 'assigned', 'maintenance', 'retired'].includes(status)
}

export function isValidUserRole(role: string): role is UserRole {
  return ['admin', 'employee'].includes(role)
}

export function isValidCompanyStatus(status: string): status is CompanyStatus {
  return ['active', 'inactive', 'suspended'].includes(status)
}

export function isValidSubscriptionPlan(plan: string): plan is SubscriptionPlan {
  return ['basic', 'pro', 'enterprise'].includes(plan)
}

// ============================================================================
// TRANSFORMATION FUNCTIONS - Database <-> Application
// ============================================================================

/**
 * Transform database asset to application asset
 * Validates types and provides defaults
 */
export function transformDbAsset(dbAsset: DbAsset & { 
  assigned_user?: DbUser | null 
}): Asset {
  return {
    ...dbAsset,
    status: isValidAssetStatus(dbAsset.status) ? dbAsset.status : 'available',
    assigned_user: dbAsset.assigned_user 
      ? transformDbUser(dbAsset.assigned_user)
      : null
  }
}

/**
 * Transform database user to application user
 */
export function transformDbUser(dbUser: DbUser & {
  department?: DbDepartment | null
}): User {
  return {
    ...dbUser,
    role: isValidUserRole(dbUser.role) ? dbUser.role : 'employee',
    department: dbUser.department 
      ? transformDbDepartment(dbUser.department)
      : null
  }
}

/**
 * Transform database department to application department
 */
export function transformDbDepartment(dbDept: DbDepartment & {
  manager?: DbUser | null
}): Department {
  return {
    ...dbDept,
    manager: dbDept.manager 
      ? transformDbUser(dbDept.manager)
      : null
  }
}

/**
 * Transform database company to application company
 */
export function transformDbCompany(dbCompany: DbCompany): Company {
  return {
    ...dbCompany,
    subscription_plan: isValidSubscriptionPlan(dbCompany.subscription_plan || '') 
      ? (dbCompany.subscription_plan as SubscriptionPlan)
      : 'basic',
    status: isValidCompanyStatus(dbCompany.status || '') 
      ? (dbCompany.status as CompanyStatus)
      : 'active',
    max_users: dbCompany.max_users ?? 10,
    max_assets: dbCompany.max_assets ?? 50
  }
}

// ============================================================================
// PARTIAL UPDATE TYPES - For update operations
// ============================================================================

export type AssetUpdate = Partial<Omit<DbAsset, 'id' | 'created_at' | 'updated_at' | 'company_id'>>

export type UserUpdate = Partial<Omit<DbUser, 'id' | 'created_at' | 'updated_at' | 'company_id'>>

export type DepartmentUpdate = Partial<Omit<DbDepartment, 'id' | 'created_at' | 'updated_at' | 'company_id'>>

// ============================================================================
// INSERT TYPES - For create operations
// ============================================================================

export type AssetInsert = Omit<DbAsset, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type UserInsert = Omit<DbUser, 'created_at' | 'updated_at'> & {
  created_at?: string
  updated_at?: string
}

export type DepartmentInsert = Omit<DbDepartment, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string | null
  updated_at?: string | null
}

// ============================================================================
// FORM DATA TYPES - For component forms
// FIXED: Changed to use string | null for consistency
// ============================================================================

export interface AssetFormData {
  name: string
  description: string
  serial_number: string | null  // FIXED: was just string
  category: string | null        // FIXED: was just string
  photo_url: string
  status: AssetStatus
  assigned_to: string | null     // FIXED: was just string
  purchase_date: string | null   // FIXED: was just string
  purchase_price: string | null  // FIXED: was just string
  warranty_months: string | null // FIXED: was just string
}

export interface UserFormData {
  email: string
  full_name: string
  role: UserRole
  phone: string | null           // FIXED: was just string
  department_id: string | null   // FIXED: was just string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface AssetFilters {
  status?: AssetStatus
  assignedTo?: string
  category?: string
  search?: string
}

export interface TicketFilters {
  status?: string
  priority?: string
  assignedTo?: string
  createdBy?: string
  search?: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

export interface ApiSuccess<T> {
  data: T
  message?: string
}

// ============================================================================
// SUPABASE QUERY RESULT TYPES
// ============================================================================

export type AssetWithRelations = DbAsset & {
  assigned_user: DbUser | null
}

export type UserWithRelations = DbUser & {
  department: DbDepartment | null
}

export type TicketWithRelations = DbTicket & {
  asset: DbAsset | null
  created_by_user: DbUser | null
  assigned_user: DbUser | null
  accepted_by_user: DbUser | null
}