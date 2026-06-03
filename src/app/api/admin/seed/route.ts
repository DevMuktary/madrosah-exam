// src/app/api/admin/seed/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, ClassLevel } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. Clear existing questions to prevent duplicates if clicked twice
    await prisma.question.deleteMany({});

    const questions = [
      // ==========================================
      // TEJWEED (التجويد) - IBTIDAAIY
      // ==========================================
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "التجويد",
        questionText: "ما حد التجويد لغة؟",
        options: ["التنغيم", "التبديل", "التحسين", "المزدوج"],
        correctAnswer: "التحسين",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "التجويد",
        questionText: "كم حالة للنون الساكنة و التنوين؟",
        options: ["ستة", "تسعة", "خمسة", "أربعة"],
        correctAnswer: "أربعة",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "التجويد",
        questionText: "ٱختر حرف الإدغام من هذه الحروف",
        options: ["الباء", "الياء", "الجيم", "الفاء"],
        correctAnswer: "الياء",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "التجويد",
        questionText: "ٱختر حرف الإظهار من هذه الحروف",
        options: ["الراء", "اللام", "الحاء", "السين"],
        correctAnswer: "الحاء",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "التجويد",
        questionText: "ٱختر حرف القلب من هذه الحروف",
        options: ["الواو", "النون", "التاء", "الباء"],
        correctAnswer: "الباء",
      },

      // ==========================================
      // TEJWEED (التجويد) - IDAADIY
      // ==========================================
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "التجويد",
        questionText: "ما حد التجويد لغة؟",
        options: ["التنغيم", "التبديل", "التحسين", "المزدوج"],
        correctAnswer: "التحسين",
      },
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "التجويد",
        questionText: "كم حالة للميم الساكنة و التنوين؟",
        options: ["ستة", "تسعة", "ثلاثة", "أربعة"],
        correctAnswer: "ثلاثة",
      },
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "التجويد",
        questionText: "ما حد المد لغة؟",
        options: ["الطي", "القبض", "الزيادة", "النقص"],
        correctAnswer: "الزيادة",
      },
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "التجويد",
        questionText: "ينقسم المد إلى كم قسم؟",
        options: ["ٱثنان", "أربعة", "ثلاثة", "عشرة"],
        correctAnswer: "ٱثنان",
      },
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "التجويد",
        questionText: "ٱختر حرف القمرية من هذه الحروف؟",
        options: ["الجيم", "النون", "الثاء", "اللام"],
        correctAnswer: "الجيم",
      },

      // ==========================================
      // HADITH (الحديث) - IBTIDAAIY
      // ==========================================
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "الحديث",
        questionText: "من راوي أكثر الأحاديث المذكورة؟",
        options: ["عبد الله بن عمر", "أبو هريرة رضي الله عنه", "أنس بن مالك", "عائشة رضي الله عنها"],
        correctAnswer: "أبو هريرة رضي الله عنه",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "الحديث",
        questionText: "ما الكلمتان الخفيفتان على اللسان؟",
        options: ["الحمد لله والله أكبر", "سبحان الله وبحمده، سبحان الله العظيم", "لا إله إلا الله محمد رسول الله", "أستغفر الله وأتوب إليه"],
        correctAnswer: "سبحان الله وبحمده، سبحان الله العظيم",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "الحديث",
        questionText: "من أحق الناس بحسن الصحبة؟",
        options: ["الأخ", "الأم", "الصديق", "الأب"],
        correctAnswer: "الأم",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "الحديث",
        questionText: "من قام رمضان إيمانًا واحتسابًا ماذا ينال؟",
        options: ["المال", "المغفرة", "الشهرة", "الراحة"],
        correctAnswer: "المغفرة",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "الحديث",
        questionText: "ما جزاء الحج المبرور؟",
        options: ["الجنة", "المال الكثير", "الصحة", "البركة"],
        correctAnswer: "الجنة",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "الحديث",
        questionText: "إذا تثاءب أحدكم فماذا يفعل؟",
        options: ["يرفع صوته", "يضحك", "يردّه ما استطاع", "يغمض عينيه"],
        correctAnswer: "يردّه ما استطاع",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "الحديث",
        questionText: "كم عدد حقوق المسلم على المسلم المذكورة في الحديث؟",
        options: ["ثلاثة", "خمسة", "سبعة", "ستة"],
        correctAnswer: "خمسة",
      },

      // ==========================================
      // SEERAH (السيرة) - BOTH CLASSES
      // Array mapped twice, once for Ibtidaaiy, once for Idaadiy
      // ==========================================
      ...([ClassLevel.IBTIDAAIY, ClassLevel.IDAADIY].flatMap(level => [
        {
          classLevel: level,
          subject: "السيرة",
          questionText: "في أي شهر وُلِدَ الرسول ﷺ؟",
          options: ["رمضان", "ربيع الأول", "شعبان", "محرم"],
          correctAnswer: "ربيع الأول",
        },
        {
          classLevel: level,
          subject: "السيرة",
          questionText: "ما اليوم المشهور لميلاد النبي ﷺ؟",
          options: ["يوم الجمعة", "يوم الأحد", "يوم الاثنين", "يوم الخميس"],
          correctAnswer: "يوم الاثنين",
        },
        {
          classLevel: level,
          subject: "السيرة",
          questionText: "من هي مرضعة النبي ﷺ؟",
          options: ["آمنة بنت وهب", "حليمة السعدية", "خديجة بنت خويلد", "ثويبة"],
          correctAnswer: "حليمة السعدية",
        },
        {
          classLevel: level,
          subject: "السيرة",
          questionText: "أين تُوفِّيَت أم النبي ﷺ؟",
          options: ["مكة", "المدينة", "الأبواء", "الطائف"],
          correctAnswer: "الأبواء",
        },
        {
          classLevel: level,
          subject: "السيرة",
          questionText: "من الذي كفل النبي ﷺ بعد وفاة جده؟",
          options: ["أبو لهب", "أبو طالب", "العباس", "حمزة"],
          correctAnswer: "أبو طالب",
        },
        {
          classLevel: level,
          subject: "السيرة",
          questionText: "كم كان عمر النبي ﷺ عندما سافر إلى الشام مع عمه؟",
          options: ["12 سنة", "20 سنة", "25 سنة", "15 سنة"],
          correctAnswer: "12 سنة",
        },
        {
          classLevel: level,
          subject: "السيرة",
          questionText: "لمن خرج النبي ﷺ تاجرًا إلى الشام وعمره خمس وعشرون سنة؟",
          options: ["عائشة رضي الله عنها", "خديجة رضي الله عنها", "فاطمة رضي الله عنها", "زينب رضي الله عنها"],
          correctAnswer: "خديجة رضي الله عنها",
        },
        {
          classLevel: level,
          subject: "السيرة",
          questionText: "من أول أبناء النبي ﷺ من خديجة رضي الله عنها؟",
          options: ["إبراهيم", "القاسم", "عبد الله", "الطيب"],
          correctAnswer: "القاسم",
        },
        {
          classLevel: level,
          subject: "السيرة",
          questionText: "كم كان عمر النبي ﷺ عندما بُعث رسولًا؟",
          options: ["30 سنة", "35 سنة", "40 سنة", "50 سنة"],
          correctAnswer: "40 سنة",
        },
        {
          classLevel: level,
          subject: "السيرة",
          questionText: "ما أول سورة نزلت على النبي ﷺ؟",
          options: ["الفاتحة", "اقرأ", "المدثر", "المزمل"],
          correctAnswer: "اقرأ",
        }
      ])),

      // ==========================================
      // NAHW (النحو) - IDAADIY
      // ==========================================
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "النحو",
        questionText: "الكلام ينحصر في ..... أقسام",
        options: ["٣", "٤", "٥", "٦"],
        correctAnswer: "٣",
      },
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "النحو",
        questionText: "الفعل يكون مرفوعا ومجرورا.",
        options: ["نعم", "لا", "أحيانا", "في الأفعال الخمسة فقط"],
        correctAnswer: "لا", // Verbs cannot be majroor (مجرور)
      },
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "النحو",
        questionText: "هل الزمن جزء من الاسم؟",
        options: ["نعم", "لا", "في بعض الأسماء", "في المصدر فقط"],
        correctAnswer: "لا",
      },
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "النحو",
        questionText: "أي هذه العبارات صحيحة إعرابيا؟",
        options: ["قُتِلَ إِبراهيمُ الكبشَ", "قتَلَ إبراهيمُ الكبشَ", "قاتَلَ إبراهيم الكبشَ", "قتلَ إبراهيمَ الكبشُ"],
        correctAnswer: "قتَلَ إبراهيمُ الكبشَ",
      },
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "النحو",
        questionText: "محمد يبكي على أبيه. ما الاسم في هذه الجملة؟",
        options: ["أبيه", "يبكي", "محمد", "محمد و أبيه"],
        correctAnswer: "محمد و أبيه",
      },

      // ==========================================
      // SARF (الصرف) - IDAADIY
      // ==========================================
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "الصرف",
        questionText: "ما معنى الصرف لغة ؟",
        options: ["التغيير", "النفس", "المال", "الثبات"],
        correctAnswer: "التغيير",
      },
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "الصرف",
        questionText: "اسم المكان أو الزمان من الفعل (استشفى)؟",
        options: ["مستشفي", "مستشفى", "مسفى", "شافي"],
        correctAnswer: "مستشفى",
      },
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "الصرف",
        questionText: "هل كلمة (مدينة) تعتبر مصدرا ميميا؟",
        options: ["نعم", "لا", "أحيانا", "لا شيء مما ذكر"],
        correctAnswer: "لا",
      },
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "الصرف",
        questionText: "اسم الفاعل لفعل (ذهب)؟",
        options: ["مذهب", "ذاهب", "مذهوب", "ذهاب"],
        correctAnswer: "ذاهب",
      },
      {
        classLevel: ClassLevel.IDAADIY,
        subject: "الصرف",
        questionText: "إلى كم ينقسم الفعل المعتل والصحيح باعتبار الأصول ؟",
        options: ["٤", "٧", "٥", "٣"],
        correctAnswer: "٧", // أقسام الصحيح والمعتل السبعة
      },

      // ==========================================
      // ARABIC (العربية) - IBTIDAAIY
      // ==========================================
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "العربية",
        questionText: "الولدُ واقفً بمعنى .....",
        options: ["The child is standing", "The girl is squatting", "The kid is running", "The boy is sitting"],
        correctAnswer: "The child is standing",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "العربية",
        questionText: "أكمل: هذا .....",
        options: ["بيت", "مئة", "جميلة", "سيارة"],
        correctAnswer: "بيت",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "العربية",
        questionText: "أكمل: هم .....",
        options: ["رجل", "طلاب", "يوسف", "طالبة"],
        correctAnswer: "طلاب",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "العربية",
        questionText: "اجلس على ....",
        options: ["المكتب", "القلم", "الكتاب", "السقف"],
        correctAnswer: "المكتب",
      },
      {
        classLevel: ClassLevel.IBTIDAAIY,
        subject: "العربية",
        questionText: "الحروف القمرية تشدد بعد (ال) نعم أم لا؟",
        options: ["نعم", "لا", "أحيانا", "حسب الكلمة"],
        correctAnswer: "لا", // الشمسية هي التي تشدد
      }
    ];

    // 2. Insert all questions into the database
    await prisma.question.createMany({
      data: questions,
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully seeded ${questions.length} questions for Institute of Mutoon.` 
    });

  } catch (error) {
    console.error('Seeding Error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database. Check server logs.' },
      { status: 500 }
    );
  }
}
