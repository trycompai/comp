"use client";

import { useEffect, useState } from "react";
import { auth } from "@/auth";
import { db } from "@bubba/db";

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setIsLoading(true);
        const session = await auth();
        
        if (!session?.user.organizationId) {
          throw new Error("Organization ID not found");
        }
        
        const organizationUsers = await db.user.findMany({
          where: { organizationId: session.user.organizationId },
          select: {
            id: true,
            name: true,
            image: true,
          },
        });
        
        setUsers(organizationUsers);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch users"));
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUsers();
  }, []);

  return { users, isLoading, error };
}
