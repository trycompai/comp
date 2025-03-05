"use client";

import { useEffect, useState } from "react";
import { auth } from "@/auth";
import { db } from "@bubba/db";

interface CloudTest {
  id: string;
  title: string;
  description: string | null;
  provider: string;
  status: string;
  result: string;
  severity: string | null;
  createdAt: Date;
  resultDetails: any;
  assignedUserId: string | null;
}

interface UseTestResult {
  cloudTest: CloudTest | null;
  isLoading: boolean;
  error: Error | null;
  mutate: () => Promise<void>;
}

export function useTest(testId: string): UseTestResult {
  const [cloudTest, setCloudTest] = useState<CloudTest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTest = async () => {
    try {
      setIsLoading(true);
      const session = await auth();
      
      if (!session?.user.organizationId) {
        throw new Error("Organization ID not found");
      }
      
      const test = await db.$queryRaw`
        SELECT 
          id, 
          title, 
          description, 
          provider, 
          status, 
          result, 
          severity, 
          "createdAt", 
          "resultDetails", 
          "assignedUserId"
        FROM "Organization_integration_results"
        WHERE id = ${testId} AND "organizationId" = ${session.user.organizationId}
        LIMIT 1
      `;
      
      if (Array.isArray(test) && test.length > 0) {
        setCloudTest(test[0] as CloudTest);
      } else {
        throw new Error("Test not found");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch test"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTest();
  }, [testId]);

  const mutate = async () => {
    await fetchTest();
  };

  return { cloudTest, isLoading, error, mutate };
}
