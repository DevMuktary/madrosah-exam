// src/app/api/auth/login/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

// Instantiate Prisma securely
const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = body;

    // 1. Validate Input
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required.' },
        { status: 400 }
      );
    }

    // 2. Fetch the student from the database
    const student = await prisma.student.findUnique({
      where: { phone },
    });

    // 3. Security Check: Does the student exist?
    if (!student) {
      return NextResponse.json(
        { error: 'Invalid phone number. Applicant not found.' },
        { status: 401 }
      );
    }

    // 4. Security Check: Has the exam already been taken?
    if (student.isExamTaken) {
      return NextResponse.json(
        { 
          error: 'Exam already submitted.',
          status: 'COMPLETED',
          score: student.finalScore,
          placement: student.placementStatus
        },
        { status: 403 }
      );
    }

    // 5. Success: Create a secure session cookie
    // HttpOnly prevents client-side scripts from reading the cookie (XSS protection)
    cookies().set('student_session', student.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 2, // 2 hours maximum session time
      path: '/',
    });

    // Return the student data to the frontend to construct the dashboard
    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        fullName: student.fullName,
        appliedClass: student.appliedClass,
      }
    });

  } catch (error) {
    console.error('Authentication Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error. Please contact the administrator.' },
      { status: 500 }
    );
  }
}
