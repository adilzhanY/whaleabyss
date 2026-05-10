import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { events, eventServices, services } from '@/lib/schema';
import { eq, and, lte, gte } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const allEvents = await db.select().from(events);

    const eventsWithServices = await Promise.all(
      allEvents.map(async (event) => {
        const eventServiceRecords = await db
          .select({ serviceId: eventServices.serviceId })
          .from(eventServices)
          .where(eq(eventServices.eventId, event.id));

        const serviceIds = eventServiceRecords.map((es) => es.serviceId);

        return {
          ...event,
          serviceIds,
        };
      })
    );

    return NextResponse.json(eventsWithServices);
  } catch (error) {
    console.error('[Admin Events GET Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, description, discountPercent, backgroundUrl, startsAt, endsAt, serviceIds } = body;

    if (!name || !slug || !discountPercent || !startsAt || !endsAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [newEvent] = await db
      .insert(events)
      .values({
        name,
        slug,
        description: description || null,
        discountPercent: Number(discountPercent),
        backgroundUrl: backgroundUrl || null,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        isActive: true,
      })
      .returning();

    if (serviceIds && serviceIds.length > 0) {
      const eventServiceValues = serviceIds.map((serviceId: string) => ({
        eventId: newEvent.id,
        serviceId,
      }));

      await db.insert(eventServices).values(eventServiceValues);
    }

    return NextResponse.json(newEvent);
  } catch (error) {
    console.error('[Admin Events POST Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
