import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { events, eventServices, services } from '@/lib/schema';
import { eq, and, lte, gte } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const now = new Date();

    const activeEvents = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.isActive, true),
          lte(events.startsAt, now),
          gte(events.endsAt, now)
        )
      );

    const eventsWithServices = await Promise.all(
      activeEvents.map(async (event) => {
        const eventServiceRecords = await db
          .select({
            serviceId: eventServices.serviceId,
            serviceSlug: services.slug,
            serviceTitle: services.title,
            serviceSubtitle: services.subtitle,
            servicePrice: services.price,
            serviceImageUrl: services.imageUrl,
          })
          .from(eventServices)
          .leftJoin(services, eq(eventServices.serviceId, services.id))
          .where(eq(eventServices.eventId, event.id));

        return {
          ...event,
          services: eventServiceRecords.map((es) => ({
            id: es.serviceId,
            slug: es.serviceSlug,
            title: es.serviceTitle,
            subtitle: es.serviceSubtitle,
            price: es.servicePrice,
            imageUrl: es.serviceImageUrl,
          })),
        };
      })
    );

    return NextResponse.json(eventsWithServices);
  } catch (error) {
    console.error('[Events GET Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
