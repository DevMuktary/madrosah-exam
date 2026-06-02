// src/app/api/exam/submit/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST() {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('student_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch the student
    const student = await prisma.student.findUnique({ where: { id: sessionId } });
    
    if (!student || student.isExamTaken) {
      return NextResponse.json({ error: 'Exam already submitted' }, { status: 400 });
    }

    // 2. Fetch all questions for their class level
    const questions = await prisma.question.findMany({
      where: { classLevel: student.appliedClass },
    });

    // 3. Fetch all their saved answers
    const studentAnswers = await prisma.studentAnswer.findMany({
      where: { studentId: sessionId },
    });

    // 4. The Grading Engine
    let correctCount = 0;
    
    questions.forEach((question) => {
      const studentAnswer = studentAnswers.find((ans) => ans.questionId === question.id);
      if (studentAnswer && studentAnswer.selectedOption === question.correctAnswer) {
        correctCount++;
      }
    });

    // Calculate percentage (rounded to nearest whole number)
    const totalQuestions = questions.length;
    const finalScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // 5. The Placement Logic
    let placementStatus = "";

    if (student.appliedClass === "IBTIDAAIY") {
      placementStatus = "Eligible for Ibtidaaiy";
    } else if (student.appliedClass === "IDAADIY") {
      if (finalScore >= 50) {
        placementStatus = "Eligible for Idaadiy";
      } else {
        placementStatus = "Eligible for Ibtidaaiy Only"; // Fallback logic
      }
    }

    // 6. Lock the account and save the final verdict
    await prisma.student.update({
      where: { id: sessionId },
      data: {
        isExamTaken: true,
        finalScore: finalScore,
        placementStatus: placementStatus,
      },
    });

    // 7. Destroy the session cookie
    cookies().delete('student_session');

    return NextResponse.json({ success: true, score: finalScore });

  } catch (error) {
    console.error('Submit Exam Error:', error);
    return NextResponse.json({ error: 'Failed to process submission' }, { status: 500 });
  }
}
