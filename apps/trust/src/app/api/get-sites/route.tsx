import { db } from '@comp/db';
import { NextRequest, NextResponse } from 'next/server';
import { cache } from 'react';

const getCachedSites = cache(async () => {
  const sites = await db.trust.findMany({
    where: {
      status: 'published',
    },
    select: {
      organizationId: true,
    },
  });

  const websites = await db.organization.findMany({
    where: {
      id: {
        in: sites.map((site) => site.organizationId),
      },
    },
    select: {
      website: true,
    },
  });

  return websites.map((website) => website.website);
});

export async function GET(request: NextRequest) {
  try {
    const websites = await getCachedSites();

    console.log(websites);

    const response = NextResponse.json(websites);

    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.headers.set('CDN-Cache-Control', 'public, max-age=3600');
    response.headers.set('Vercel-CDN-Cache-Control', 'public, max-age=3600');

    return response;
  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}
