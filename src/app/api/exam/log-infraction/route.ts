// src/app/api/exam/log-infraction/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('student_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventType } = await request.json();

    // Save the infraction to the database so the Admin dashboard can see it instantly
    await prisma.examLog.create({
      data: {
        studentId: sessionId,
        eventType: eventType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log infraction:', error);
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}
