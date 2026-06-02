// src/app/api/exam/save-answer/route.ts
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

    const { questionId, selectedOption } = await request.json();

    if (!questionId || !selectedOption) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Fetch the student by their active session token to enforce multi-device lockout
    const student = await prisma.student.findFirst({ 
      where: { sessionToken: sessionToken } 
    });

    if (!student || student.isExamTaken) {
      return NextResponse.json({ error: 'Session expired or exam closed' }, { status: 403 });
    }

    // Upsert the answer: Update if it exists, Create if it is their first time clicking
    // We use findFirst + create/update to bypass complex Prisma compound key types
    
    // 2. Use the actual student.id from the database lookup, not the cookie
    const existingAnswer = await prisma.studentAnswer.findFirst({
      where: { studentId: student.id, questionId: questionId }
    });

    if (existingAnswer) {
      await prisma.studentAnswer.update({
        where: { id: existingAnswer.id },
        data: { selectedOption },
      });
    } else {
      await prisma.studentAnswer.create({
        data: {
          studentId: student.id, // Use student.id here as well
          questionId: questionId,
          selectedOption: selectedOption,
        },
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Save Answer Error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
