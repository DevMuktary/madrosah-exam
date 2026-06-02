// src/app/api/exam/init/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const EXAM_DURATION_SECONDS = 3600; 

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('student_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }

    const student = await prisma.student.findFirst({
      where: { sessionToken: sessionToken },
    });

    // 🚨 CRITICAL FIX: Delete the dead cookie so the middleware doesn't trap them in a loop
    if (!student) {
      cookies().delete('student_session'); 
      return NextResponse.json({ error: 'Session expired or logged in from another device.' }, { status: 401 });
    }

    if (student.isExamTaken) {
      return NextResponse.json({ error: 'Exam already submitted.' }, { status: 403 });
    }

    let startedAt = student.examStartedAt;
    
    if (!startedAt) {
      startedAt = new Date();
      await prisma.student.update({
        where: { id: student.id },
        data: { examStartedAt: startedAt },
      });
    }

    const elapsedSeconds = Math.floor((new Date().getTime() - startedAt.getTime()) / 1000);
    const timeLeft = Math.max(0, EXAM_DURATION_SECONDS - elapsedSeconds);

    const rawQuestions = await prisma.question.findMany({
      where: { classLevel: student.appliedClass },
    });

    const sanitizedQuestions = shuffleArray(rawQuestions).map((q) => {
      const optionsArray = q.options as string[];
      return {
        id: q.id,
        subject: q.subject,
        questionText: q.questionText,
        options: shuffleArray(optionsArray), 
      };
    });

    const savedAnswersRaw = await prisma.studentAnswer.findMany({
      where: { studentId: student.id }, 
    });

    const savedAnswers: Record<string, string> = {};
    savedAnswersRaw.forEach((ans) => {
      savedAnswers[ans.questionId] = ans.selectedOption;
    });

    return NextResponse.json({
      success: true,
      student: {
        id: student.id, 
        fullName: student.fullName,
        appliedClass: student.appliedClass,
      },
      timeLeft,
      questions: sanitizedQuestions,
      savedAnswers,
    });

  } catch (error) {
    console.error('Exam Initialization Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error.' },
      { status: 500 }
    );
  }
}
