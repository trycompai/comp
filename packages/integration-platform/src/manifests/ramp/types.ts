export interface RampUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  employee_id?: string | null;
  status?: 'USER_ACTIVE' | 'USER_INACTIVE' | 'USER_SUSPENDED';
}

export interface RampPage {
  next?: string | null;
}

export interface RampUsersResponse {
  data: RampUser[];
  page: RampPage;
}
