// src/app/api/admin/monitor/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Prevent Next.js from caching this route so the admin dashboard gets live data
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      include: {
        logs: true, // Fetch their anti-cheat logs
        answers: true, // Fetch their current progress
      },
      orderBy: { createdAt: 'asc' }
    });

    // Map the database output into a clean format for the frontend dashboard
    const liveDashboardData = students.map(student => {
      // Determine their current status
      let status = "PENDING"; // Hasn't logged in yet
      if (student.examStartedAt && !student.isExamTaken) status = "ACTIVE";
      if (student.isExamTaken) status = "COMPLETED";

      return {
        id: student.id,
        fullName: student.fullName,
        phone: student.phone,
        appliedClass: student.appliedClass,
        status: status,
        progress: student.answers.length, // How many questions they've answered so far
        finalScore: student.finalScore,
        placementStatus: student.placementStatus,
        infractionCount: student.logs.length,
        recentLogs: student.logs.slice(-3), // Get their 3 most recent cheating attempts
      };
    });

    return NextResponse.json({ success: true, students: liveDashboardData });

  } catch (error) {
    console.error('Admin Monitor Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
