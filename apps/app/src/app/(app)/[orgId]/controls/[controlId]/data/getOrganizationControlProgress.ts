export interface ControlProgressResponse {
  total: number;
  completed: number;
  progress: number;
  byType: {
    [key: string]: {
      total: number;
      completed: number;
    };
  };
}
