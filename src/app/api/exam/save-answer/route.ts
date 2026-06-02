// src/app/api/exam/save-answer/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('student_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questionId, selectedOption } = await request.json();

    if (!questionId || !selectedOption) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const student = await prisma.student.findFirst({ 
      where: { sessionToken: sessionToken } 
    });

    // 🚨 CRITICAL FIX: Delete the dead cookie
    if (!student) {
      cookies().delete('student_session');
      return NextResponse.json({ error: 'Session expired from another device.' }, { status: 401 });
    }

    if (student.isExamTaken) {
      return NextResponse.json({ error: 'Exam closed' }, { status: 403 });
    }
    
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
          studentId: student.id, 
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
