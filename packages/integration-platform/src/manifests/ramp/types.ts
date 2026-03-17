export type RampUserStatus =
  | 'USER_ACTIVE'
  | 'USER_INACTIVE'
  | 'USER_SUSPENDED'
  | 'INVITE_PENDING'
  | 'INVITE_EXPIRED'
  | 'USER_ONBOARDING';

export type RampKnownRole =
  | 'AUDITOR'
  | 'BUSINESS_ADMIN'
  | 'BUSINESS_BOOKKEEPER'
  | 'BUSINESS_OWNER'
  | 'BUSINESS_USER'
  | 'GUEST_USER'
  | 'IT_ADMIN';

// Ramp can also have custom roles — allow any string
export type RampUserRole = RampKnownRole | (string & {});

export interface RampUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  employee_id?: string | null;
  status?: RampUserStatus;
  role?: RampUserRole;
  department_id?: string;
  location_id?: string;
  manager_id?: string;
  phone?: string;
  is_manager?: boolean;
  business_id?: string;
  entity_id?: string;
  scheduled_deactivation_date?: string;
}

export interface RampEmployee {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string | null;
  status: 'active' | 'inactive' | 'suspended' | 'onboarding' | 'invite_pending' | 'invite_expired';
  role?: RampUserRole;
  departmentId?: string;
  locationId?: string;
  managerId?: string;
  phone?: string;
  isManager?: boolean;
}

export interface RampPage {
  next?: string | null;
}

export interface RampUsersResponse {
  data: RampUser[];
  page: RampPage;
}

export interface RoleMappingEntry {
  rampRole: string;
  compRole: string;
  isBuiltIn: boolean;
  permissions?: Record<string, string[]>;
  obligations?: Record<string, boolean>;
}
