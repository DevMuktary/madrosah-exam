// src/app/api/exam/submit/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// 60 minutes for the exam + 2 minutes grace period for network latency
const EXAM_DURATION_SECONDS = 3600; 
const GRACE_PERIOD_SECONDS = 120; 

export async function POST() {
  try {
    const cookieStore = cookies();
    // This is now the session token, NOT the student ID
    const sessionToken = cookieStore.get('student_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch the student by their active session token
    const student = await prisma.student.findFirst({ 
      where: { sessionToken: sessionToken } 
    });
    
    if (!student || student.isExamTaken) {
      return NextResponse.json({ error: 'Exam already submitted or session expired' }, { status: 400 });
    }

    // --- BUG B FIX: Server-Side Timing Enforcement ---
    let finalScore = 0;
    let placementStatus = "";
    let isDisqualified = false;

    if (student.examStartedAt) {
      const elapsedSeconds = Math.floor((new Date().getTime() - student.examStartedAt.getTime()) / 1000);
      
      // If they took longer than 62 minutes, they bypassed the timer
      if (elapsedSeconds > (EXAM_DURATION_SECONDS + GRACE_PERIOD_SECONDS)) {
        isDisqualified = true;
        finalScore = 0;
        placementStatus = "DISQUALIFIED: Time Limit Exceeded";
        console.warn(`Student ${student.fullName} disqualified for time manipulation.`);
      }
    }

    // 2. The Grading Engine (Only grades if they are not disqualified)
    if (!isDisqualified) {
      const questions = await prisma.question.findMany({
        where: { classLevel: student.appliedClass },
      });

      // Fetch answers using student.id (NOT sessionToken)
      const studentAnswers = await prisma.studentAnswer.findMany({
        where: { studentId: student.id },
      });

      let correctCount = 0;
      
      questions.forEach((question) => {
        const studentAnswer = studentAnswers.find((ans) => ans.questionId === question.id);
        if (studentAnswer && studentAnswer.selectedOption === question.correctAnswer) {
          correctCount++;
        }
      });

      const totalQuestions = questions.length;
      finalScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

      // 3. The Placement Logic
      if (student.appliedClass === "IBTIDAAIY") {
        placementStatus = "Eligible for Ibtidaaiy";
      } else if (student.appliedClass === "IDAADIY") {
        if (finalScore >= 50) {
          placementStatus = "Eligible for Idaadiy";
        } else {
          placementStatus = "Eligible for Ibtidaaiy Only"; // Fallback logic
        }
      }
    }

    // 4. Lock the account and save the final verdict using student.id
    await prisma.student.update({
      where: { id: student.id },
      data: {
        isExamTaken: true,
        finalScore: finalScore,
        placementStatus: placementStatus,
      },
    });

    // 5. Destroy the session cookie
    cookies().delete('student_session');

    // Send the final result back to the frontend
    return NextResponse.json({ 
      success: true, 
      score: finalScore,
      placement: placementStatus
    });

  } catch (error) {
    console.error('Submit Exam Error:', error);
    return NextResponse.json({ error: 'Failed to process submission' }, { status: 500 });
  }
}
