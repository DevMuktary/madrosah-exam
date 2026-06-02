// src/app/api/exam/log-infraction/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    // This is now the session token, NOT the student ID
    const sessionToken = cookieStore.get('student_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventType } = await request.json();

    // 1. Fetch the student using the active session token
    const student = await prisma.student.findFirst({
      where: { sessionToken: sessionToken }
    });

    // If the token is invalid or overwritten by another device, block the log
    if (!student) {
      return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
    }

    // 2. Save the infraction to the database using the actual student.id
    await prisma.examLog.create({
      data: {
        studentId: student.id, // Use the ID from the database lookup
        eventType: eventType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log infraction:', error);
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}
