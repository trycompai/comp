"use client";

export interface TestType {
  id: string;
  severity: string | null;
  result: string;
  title: string;
  provider: string;
  createdAt: Date;
  assignedUser: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}
