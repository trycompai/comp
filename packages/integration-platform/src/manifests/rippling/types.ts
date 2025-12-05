// Rippling API types for employee sync

export interface RipplingEmployee {
  id: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  personalEmail?: string;
  department?: {
    id: string;
    name: string;
  };
  title?: string;
  employmentType?: string;
  startDate?: string;
  endDate?: string;
  status: 'ACTIVE' | 'TERMINATED' | 'ON_LEAVE';
  manager?: {
    id: string;
    name: string;
  };
  photoUrl?: string;
}

export interface RipplingEmployeesResponse {
  data: RipplingEmployee[];
  pagination?: {
    hasMore: boolean;
    cursor?: string;
  };
}
