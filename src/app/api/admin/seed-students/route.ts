// src/app/api/admin/seed-students/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, ClassLevel } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const testStudents = [
      {
        fullName: "ABDULWASIH ABDULAZEEZ OLAMILEKAN",
        phone: "+2347050790770", 
        appliedClass: ClassLevel.IDAADIY,
      },
      {
        fullName: "Jinadu Aa'ishah",
        phone: "+2349135883564", 
        appliedClass: ClassLevel.IBTIDAAIY,
      },
      {
        fullName: "Ubaydah AbdulJabbar",
        phone: "+447464499327", 
        appliedClass: ClassLevel.IDAADIY,
      },
      {
        fullName: "Shareefah Tajudeen",
        phone: "+2348146891234", 
        appliedClass: ClassLevel.IDAADIY,
      },
      {
        fullName: "Kifayat Abdulazeez Mojisola",
        phone: "+2347035694914", 
        appliedClass: ClassLevel.IDAADIY,
      },
      {
        fullName: "Folahanmi Ololade Aminat",
        phone: "+2349064943065", 
        appliedClass: ClassLevel.IBTIDAAIY,
      },
      {
        fullName: "Mukaila Aishat",
        phone: "+2348163585886", 
        appliedClass: ClassLevel.IBTIDAAIY,
      },
      {
        fullName: "Zulaykho Eniola Sayuti",
        phone: "+2347070911902", 
        appliedClass: ClassLevel.IDAADIY,
      },
      {
        fullName: "Mu'minah Adelana",
        phone: "+2349135913054", 
        appliedClass: ClassLevel.IDAADIY,
      },
      {
        fullName: "Abdullahi bin Abdul azeez",
        phone: "+2347032078968", 
        appliedClass: ClassLevel.IBTIDAAIY,
      },
      {
        fullName: "Yusuf Abdulqoyum Akolade",
        phone: "+2349019843717", 
        appliedClass: ClassLevel.IDAADIY,
      },
      {
        fullName: "Adeniji Adesope Haleemah",
        phone: "+2347035906460", 
        appliedClass: ClassLevel.IBTIDAAIY, // Assumed Ibtidaaiy (not specified in list)
      },
      {
        fullName: "Abdganiyu Yusuph Tunde",
        phone: "+2349020019226", 
        appliedClass: ClassLevel.IDAADIY,
      },
      {
        fullName: "Lateefat AbdulAzeez",
        phone: "+2349073322121", 
        appliedClass: ClassLevel.IDAADIY,
      },
      {
        fullName: "Islamiyah Alimi",
        phone: "+17167091505", 
        appliedClass: ClassLevel.IBTIDAAIY,
      },
      {
        fullName: "Manzuma Muhammad Bello",
        phone: "+2347089594236", 
        appliedClass: ClassLevel.IBTIDAAIY, // Assumed Ibtidaaiy (not specified in list)
      },
      {
        fullName: "Hussein-lawal Yusrah",
        phone: "+2348160471610", 
        appliedClass: ClassLevel.IBTIDAAIY,
      },
      {
        fullName: "Aaminah Oyefolahan",
        phone: "+2347025758144", 
        appliedClass: ClassLevel.IDAADIY,
      },
      {
        fullName: "Abdulrahman A.",
        phone: "+2349033331805", 
        appliedClass: ClassLevel.IDAADIY,
      },
      {
        fullName: "Hikmah Kikelomo Adedokun",
        phone: "+201147827065", 
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
      message: `Successfully seeded ${testStudents.length} applicants into the database.`,
      loginInstructions: "Applicants can now log in by selecting their country code and typing their local number (e.g., Nigeria -> 07050790770)."
    });

  } catch (error) {
    console.error('Student Seeding Error:', error);
    return NextResponse.json(
      { error: 'Failed to seed applicants. Check server logs.' },
      { status: 500 }
    );
  }
}
