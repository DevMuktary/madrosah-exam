// src/app/api/exam/save-answer/route.ts
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

    const { questionId, selectedOption } = await request.json();

    if (!questionId || !selectedOption) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Ensure the student hasn't already submitted the exam
    const student = await prisma.student.findUnique({ where: { id: sessionId } });
    if (!student || student.isExamTaken) {
      return NextResponse.json({ error: 'Exam closed' }, { status: 403 });
    }

    // Upsert the answer: Update if it exists, Create if it is their first time clicking
    // We use findFirst + create/update to bypass complex Prisma compound key types
    const existingAnswer = await prisma.studentAnswer.findFirst({
      where: { studentId: sessionId, questionId: questionId }
    });

    if (existingAnswer) {
      await prisma.studentAnswer.update({
        where: { id: existingAnswer.id },
        data: { selectedOption },
      });
    } else {
      await prisma.studentAnswer.create({
        data: {
          studentId: sessionId,
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
