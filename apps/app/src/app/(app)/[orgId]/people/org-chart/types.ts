export interface OrgChartMember {
  id: string;
  user: {
    name: string;
    email: string;
  };
  role: string;
  jobTitle?: string | null;
}
