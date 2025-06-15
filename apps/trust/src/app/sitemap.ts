import { cache } from "react";
import { db } from "@comp/db";
import type { MetadataRoute } from "next";

const baseUrl = "https://trust.inc";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const organizations = await getOrganizations();

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...organizations,
  ];
}

const getOrganizations = cache(async () => {
  const published = await db.trust.findMany({
    where: {
      status: "published",
    },
    select: {
      friendlyUrl: true,
      organizationId: true,
    },
  });

  return published.map((trust) => ({
    url: `${baseUrl}/${trust.friendlyUrl ?? trust.organizationId}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
});
