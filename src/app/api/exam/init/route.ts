// src/app/api/exam/init/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Set Exam Duration: 60 Minutes (3600 seconds)
const EXAM_DURATION_SECONDS = 3600; 

// Helper function to securely shuffle arrays (Fisher-Yates algorithm)
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
    // 1. Verify Authentication Cookie
    const cookieStore = cookies();
    
    // This value is now the unique sessionToken, not the student ID
    const sessionToken = cookieStore.get('student_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }

    // 2. Fetch Student Profile using the session token to enforce multi-device lockout
    const student = await prisma.student.findFirst({
      where: { sessionToken: sessionToken },
    });

    // If no student matches the token, it means they logged in on another device
    if (!student) {
      return NextResponse.json({ error: 'Session expired or logged in from another device.' }, { status: 401 });
    }

    if (student.isExamTaken) {
      return NextResponse.json({ error: 'Exam already submitted.' }, { status: 403 });
    }

    // 3. Server-Side Timer Enforcement
    let startedAt = student.examStartedAt;
    
    // If this is their first time logging in, start the official clock
    if (!startedAt) {
      startedAt = new Date();
      await prisma.student.update({
        where: { id: student.id }, // Use student.id for DB updates
        data: { examStartedAt: startedAt },
      });
    }

    // Calculate exact seconds elapsed using the server's epoch time
    const elapsedSeconds = Math.floor((new Date().getTime() - startedAt.getTime()) / 1000);
    const timeLeft = Math.max(0, EXAM_DURATION_SECONDS - elapsedSeconds);

    // 4. Securely Fetch and Scramble Questions
    const rawQuestions = await prisma.question.findMany({
      where: { classLevel: student.appliedClass },
    });

    // We MUST remove the 'correctAnswer' before sending it to the browser
    const sanitizedQuestions = shuffleArray(rawQuestions).map((q) => {
      // Prisma returns JSON fields natively, but we typecast to ensure array methods work
      const optionsArray = q.options as string[];
      
      return {
        id: q.id,
        subject: q.subject,
        questionText: q.questionText,
        options: shuffleArray(optionsArray), // Shuffle the A,B,C,D order for every student
      };
    });

    // 5. Restore Saved Answers (in case they refreshed the page or lost internet)
    const savedAnswersRaw = await prisma.studentAnswer.findMany({
      where: { studentId: student.id }, // Make sure to use the actual student.id here
    });

    // Map into a flat dictionary: { "questionId": "selectedOption" }
    const savedAnswers: Record<string, string> = {};
    savedAnswersRaw.forEach((ans) => {
      savedAnswers[ans.questionId] = ans.selectedOption;
    });

    // 6. Return the Secure Payload
    return NextResponse.json({
      success: true,
      student: {
        id: student.id, // Return the actual ID so the frontend can use it for WebRTC
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
