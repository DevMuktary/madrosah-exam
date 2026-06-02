// src/app/api/admin/seed-students/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, ClassLevel } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const testStudents = [
      {
        fullName: "Mukhtar Abdulwaheed (QUADROX TECH)",
        phone: "+2348146817448", // Translates from Nigeria + 08146817448
        appliedClass: ClassLevel.IDAADIY,
      },
      {
        fullName: "Abdullah Abdulrasak",
        phone: "+2349033358098", // Translates from Nigeria + 09033358098
        appliedClass: ClassLevel.IBTIDAAIY,
      }
    ];

    // We use an upsert loop so if you click the seed link twice, 
    // it won't crash trying to create duplicate phone numbers.
    for (const student of testStudents) {
      await prisma.student.upsert({
        where: { phone: student.phone },
        update: {
          fullName: student.fullName,
          appliedClass: student.appliedClass,
        },
        create: student,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Successfully seeded 2 test students (Mukhtar and Abdullah) into the database.",
      loginInstructions: "On the login screen, select Nigeria and type either 08146817448 or 09033358098."
    });

  } catch (error) {
    console.error('Student Seeding Error:', error);
    return NextResponse.json(
      { error: 'Failed to seed test students. Check server logs.' },
      { status: 500 }
    );
  }
}
