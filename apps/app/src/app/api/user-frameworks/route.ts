import { db } from '@db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const secretKey = process.env.SECRET_KEY;

  if (!secretKey) {
    console.error('SECRET_KEY environment variable is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== secretKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const users = await db.user.findMany({
      select: {
        email: true,
        members: {
          select: {
            organization: {
              select: {
                frameworkInstances: {
                  select: {
                    framework: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      where: {
        members: {
          some: {
            organization: {
              frameworkInstances: {
                some: {},
              },
            },
          },
        },
      },
      orderBy: {
        email: 'asc',
      },
    });

    const userFrameworks = users.map((user) => ({
      email: user.email,
      frameworks: [
        ...new Set(
          user.members.flatMap((membership) =>
            membership.organization.frameworkInstances.map((fi) => fi.framework.name),
          ),
        ),
      ],
    }));

    return NextResponse.json({
      userFrameworks,
    });
  } catch (error) {
    console.error('Error fetching user frameworks:', error);
    return NextResponse.json({ error: 'Failed to fetch user frameworks' }, { status: 500 });
  }
}
