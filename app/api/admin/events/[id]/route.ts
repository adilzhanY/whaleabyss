import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { events, eventServices } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const [event] = await db.select().from(events).where(eq(events.id, id));

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventServiceRecords = await db
      .select({ serviceId: eventServices.serviceId })
      .from(eventServices)
      .where(eq(eventServices.eventId, id));

    const serviceIds = eventServiceRecords.map((es) => es.serviceId);

    return NextResponse.json({
      ...event,
      serviceIds,
    });
  } catch (error) {
    console.error('[Admin Event GET Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    await db.delete(events).where(eq(events.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Event DELETE Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, slug, description, discountPercent, backgroundUrl, startsAt, endsAt, isActive, serviceIds } = body;

    const [updatedEvent] = await db
      .update(events)
      .set({
        name,
        slug,
        description: description || null,
        discountPercent: Number(discountPercent),
        backgroundUrl: backgroundUrl || null,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning();

    if (serviceIds) {
      await db.delete(eventServices).where(eq(eventServices.eventId, id));

      if (serviceIds.length > 0) {
        const eventServiceValues = serviceIds.map((serviceId: string) => ({
          eventId: id,
          serviceId,
        }));

        await db.insert(eventServices).values(eventServiceValues);
      }
    }

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('[Admin Event PUT Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
