import type { LocalizedText } from "@/lib/data/types";

/**
 * Cornerstone guides.
 *
 * These target queries no one currently answers well in Arabic. YAEL in
 * particular is a compulsory gate for every Arabic-speaking applicant to
 * Israeli higher education, and the incumbent doesn't list it as a subject at
 * all — let alone explain it.
 *
 * Exam formats and score thresholds change. Every guide points the reader at
 * NITE and their own institution for current requirements rather than
 * presenting numbers as settled.
 */

export type GuideSection = { heading: LocalizedText; body: LocalizedText };

export type Guide = {
  slug: string;
  /** Links the guide to its tutor listings. */
  subjectSlug?: string;
  updated: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  sections: GuideSection[];
};

export const guides: Guide[] = [
  {
    slug: "yael-exam",
    subjectSlug: "yael",
    updated: "2026-08-16",
    title: {
      ar: "امتحان يعيل: الدليل الكامل بالعربي",
      he: 'מבחן יע"ל: המדריך המלא',
      en: "The YAEL exam: a complete guide",
    },
    excerpt: {
      ar: "شو هو امتحان يعيل، مين لازم يقدّمه، كيف بيتركّب، وكيف بتحضّرله — كل شي بالعربي.",
      he: 'מה זה מבחן יע"ל, מי חייב לגשת אליו, איך הוא בנוי וכיצד מתכוננים אליו.',
      en: "What YAEL is, who has to sit it, how it's structured, and how to prepare.",
    },
    sections: [
      {
        heading: { ar: "شو هو امتحان يعيل؟", he: 'מה זה יע"ל?', en: "What is YAEL?" },
        body: {
          ar: "يعيل (يديعات هعِفريت — معرفة العبرية) هو امتحان بيفحص مستوى العبرية عند اللي تعليمهم الثانوي ما كان بالعبري. بيديره المركز القطري للامتحانات والتقييم (نيتِ)، نفس الجهة اللي بتدير البسيخومتري. بالنسبة لأغلب الطلاب العرب اللي بدهم يدرسوا بمؤسسة أكاديمية بالبلاد، هاد الامتحان شرط قبول — مش اختياري.",
          he: 'יע"ל (ידיעת העברית) הוא מבחן הבודק את רמת העברית של מי שלימודיו התיכוניים לא היו בעברית. הוא מנוהל על ידי המרכז הארצי לבחינות ולהערכה (נמ"ה), אותו גוף שמנהל את הפסיכומטרי. עבור רוב הסטודנטים הערבים המבקשים ללמוד במוסד אקדמי בארץ, זהו תנאי קבלה ולא בחירה.',
          en: "YAEL (Yedi'at HaIvrit — Hebrew knowledge) tests the Hebrew level of applicants whose secondary education was not in Hebrew. It is administered by NITE, the same body that runs the psychometric exam. For most Arab students applying to Israeli higher education it is an admission requirement, not an option.",
        },
      },
      {
        heading: {
          ar: "مين لازم يقدّمه؟",
          he: "מי חייב לגשת?",
          en: "Who has to sit it?",
        },
        body: {
          ar: "كل مين تعليمه الثانوي كان بلغة غير العبرية — يعني عملياً كل خرّيجي المدارس العربية. حتى لو بتحكي عبري بطلاقة بالشارع أو بالشغل، المؤسسة بتطلب إثبات رسمي، ويعيل هو الإثبات الأساسي. في بدائل بحالات معيّنة، زي إنهاء دورة عبرية بمخينا أو امتحان تصنيف داخلي بالمؤسسة نفسها.",
          he: "כל מי שלימודיו התיכוניים היו בשפה שאינה עברית — כלומר, למעשה כל בוגרי בתי הספר הערביים. גם אם אתם דוברים עברית שוטפת ברחוב או בעבודה, המוסד דורש הוכחה רשמית, ויע\"ל היא ההוכחה המרכזית. יש חלופות במקרים מסוימים, כמו סיום קורס עברית במכינה או מבחן סיווג פנימי במוסד.",
          en: "Anyone whose secondary schooling was in a language other than Hebrew — in practice, every graduate of an Arab school. Fluent everyday Hebrew is not enough; institutions want formal evidence, and YAEL is the main one. Alternatives exist in some cases, such as completing a mechina Hebrew course or an institution's own placement test.",
        },
      },
      {
        heading: {
          ar: "كيف بيتركّب الامتحان؟",
          he: "איך המבחן בנוי?",
          en: "How the exam is structured",
        },
        body: {
          ar: "الامتحان بيشمل أقسام أسئلة اختيار من متعدد — إكمال جمل، إعادة صياغة، وفهم مقروء — بالإضافة لمهمة كتابة (تعبير). القسم اللي بيسقّط أكتر طلاب مش المفردات، إنما فهم المقروء تحت ضغط وقت. تأكّد من بنية الامتحان الحالية وعدد الأسئلة والمدة على موقع نيتِ قبل ما تحضّر، لأنها بتنحدّث.",
          he: 'המבחן כולל פרקים אמריקאיים — השלמת משפטים, ניסוח מחדש והבנת הנקרא — ובנוסף מטלת כתיבה. הפרק שמפיל הכי הרבה נבחנים אינו אוצר המילים אלא הבנת הנקרא תחת לחץ זמן. בדקו את מבנה המבחן העדכני, מספר השאלות ומשך הזמן באתר נמ"ה לפני שמתחילים להתכונן, כי הם מתעדכנים.',
          en: "The exam has multiple-choice sections — sentence completion, restructuring and reading comprehension — plus a writing task. The section that catches most candidates out isn't vocabulary but reading comprehension under time pressure. Check the current structure, question count and timing on the NITE site before you start preparing, as these are updated.",
        },
      },
      {
        heading: {
          ar: "قدّيش العلامة المطلوبة؟",
          he: "איזה ציון נדרש?",
          en: "What score do you need?",
        },
        body: {
          ar: "بتختلف حسب المؤسسة والموضوع. مثال: الجامعة العبرية بالقدس بتطلب علامة 85 على الأقل بيعيل، مع إمكانية استكمال الشرط حتى نهاية السنة الأولى؛ وبتقبل كبديل علامة 90 وفوق بامتحان يعلنِت. مواضيع تانية بتطلب أعلى. لا تعتمد على رقم سمعته من حدا — افحص شرط القبول على موقع المؤسسة اللي بتقدّملها بالتحديد.",
          he: 'משתנה בין מוסד למוסד ובין חוג לחוג. לדוגמה: האוניברסיטה העברית דורשת ציון 85 לפחות ביע"ל, עם אפשרות להשלים את התנאי עד סוף שנה א\', ומקבלת כחלופה ציון 90 ומעלה במבחן יעלנט. חוגים אחרים דורשים יותר. אל תסתמכו על מספר ששמעתם — בדקו את תנאי הקבלה באתר המוסד הספציפי.',
          en: "It varies by institution and by department. For example, the Hebrew University of Jerusalem requires at least 85 on YAEL, with the option to complete the requirement by the end of first year, and accepts 90 or above on Yalnet as an alternative. Other programmes require more. Don't rely on a number you heard second-hand — check the admission requirements on the specific institution's site.",
        },
      },
      {
        heading: {
          ar: "كيف بتحضّر؟",
          he: "איך מתכוננים?",
          en: "How to prepare",
        },
        body: {
          ar: "أهم شي: تحضير منتظم على مدى شهرين لثلاثة، مش أسبوع مكثّف. اشتغل على نماذج امتحانات سابقة بتوقيت حقيقي، واقرا نصوص عبرية غير أكاديمية كل يوم — أخبار، مقالات رأي — لأنها بتبني السرعة. مهمة الكتابة بتتحسّن بالتصحيح مش بالقراءة، فاكتب وخلّي حدا يصحّحلك.",
          he: "החשוב ביותר: הכנה סדירה על פני חודשיים-שלושה, לא שבוע אינטנסיבי. תרגלו מבחנים קודמים בתנאי זמן אמיתיים, וקראו טקסטים בעברית שאינם אקדמיים כל יום — חדשות, טורי דעה — כי הם בונים מהירות. מטלת הכתיבה משתפרת מתיקונים ולא מקריאה, אז כתבו ותנו למישהו לתקן.",
          en: "The main thing is steady preparation over two or three months, not one intensive week. Practise past papers under real time conditions, and read non-academic Hebrew every day — news, opinion columns — because that builds speed. The writing task improves through correction, not reading, so write and have someone mark it.",
        },
      },
    ],
  },

  {
    slug: "psychometric-in-arabic",
    subjectSlug: "psychometric",
    updated: "2026-08-16",
    title: {
      ar: "البسيخومتري بالعربي: كيف بيشتغل وشو بينفرق",
      he: "פסיכומטרי בערבית: איך זה עובד ומה שונה",
      en: "The psychometric in Arabic: how it works and what differs",
    },
    excerpt: {
      ar: "الامتحان بينعطى بالعربي — بس في تفاصيل لازم تعرفها قبل ما تقرّر بأي لغة بتقدّم.",
      he: "המבחן ניתן בערבית — אבל יש פרטים שכדאי להכיר לפני שמחליטים באיזו שפה לגשת.",
      en: "The exam is offered in Arabic — but there are details worth knowing before choosing your language.",
    },
    sections: [
      {
        heading: {
          ar: "الامتحان متوفّر بالعربي",
          he: "המבחן זמין בערבית",
          en: "The exam is available in Arabic",
        },
        body: {
          ar: "امتحان البسيخومتري بينعطى بعدّة لغات، من ضمنها العربية. القسمين الكمّي واللفظي بيجوا بالعربي كاملين، وبتقدّم الامتحان بنفس المواعيد ونفس الشروط. اختيار اللغة بيصير عند التسجيل عند نيتِ.",
          he: "מבחן הפסיכומטרי ניתן בכמה שפות, ביניהן ערבית. הפרקים הכמותי והמילולי מגיעים בערבית במלואם, וניגשים באותם מועדים ובאותם תנאים. בחירת השפה נעשית בעת ההרשמה בנמ\"ה.",
          en: "The psychometric is offered in several languages, Arabic among them. The quantitative and verbal sections are fully in Arabic, sat on the same dates under the same conditions. You choose the language when registering with NITE.",
        },
      },
      {
        heading: {
          ar: "القسم اللفظي هو الفرق الحقيقي",
          he: "הפרק המילולי הוא ההבדל האמיתי",
          en: "The verbal section is where it actually differs",
        },
        body: {
          ar: "القسم الكمّي منطق رياضي، وما بيتأثّر كثير باللغة. القسم اللفظي شي تاني تماماً: التشابه اللفظي والاستدلال بيعتمدوا على حسّ لغوي بالعربية الفصحى. كثير من كتب التحضير المتداولة ترجمة حرفية عن العبري، وبتضلّل بهاد القسم بالذات — دوّر على مواد مبنية أصلاً للنسخة العربية.",
          he: "הפרק הכמותי הוא היגיון מתמטי ומושפע פחות מהשפה. הפרק המילולי הוא סיפור אחר לגמרי: אנלוגיות והיסקים נשענים על תחושה לשונית בערבית ספרותית. חלק ניכר מספרי ההכנה הנפוצים הם תרגום מילולי מעברית ומטעים דווקא בפרק הזה — חפשו חומרים שנבנו מלכתחילה לגרסה הערבית.",
          en: "The quantitative section is mathematical reasoning and is less language-dependent. The verbal section is another matter: analogies and inference rest on a feel for Modern Standard Arabic. Much of the common preparation material is a literal translation from Hebrew and misleads precisely here — look for material built for the Arabic version from the start.",
        },
      },
      {
        heading: {
          ar: "قسم الإنجليزي",
          he: "פרק האנגלית",
          en: "The English section",
        },
        body: {
          ar: "قسم الإنجليزي بيضلّ إنجليزي مهما كانت لغة الامتحان. الطلاب اللي بيجوا من المدارس العربية غالباً بيلاقوا هالقسم هو الفرق الأكبر بعلامتهم النهائية، فبينستحق وقت تحضير منفصل — ومرات امتحان أمير كمان.",
          he: "פרק האנגלית נשאר באנגלית ללא קשר לשפת המבחן. תלמידים מבתי ספר ערביים מגלים לרוב שדווקא הפרק הזה עושה את ההבדל הגדול בציון הסופי, ולכן שווה לו זמן הכנה נפרד — ולעיתים גם מבחן אמי\"ר.",
          en: "The English section stays in English whatever the exam language. Students from Arab schools often find this is where the biggest swing in their final score lies, so it deserves separate preparation time — and sometimes the AMIR exam too.",
        },
      },
      {
        heading: {
          ar: "لا تنسى يعيل",
          he: 'אל תשכחו את יע"ל',
          en: "Don't forget YAEL",
        },
        body: {
          ar: "إذا قدّمت البسيخومتري بالعربي، أغلب المؤسسات رح تطلب منك كمان إثبات مستوى بالعبرية — يعني امتحان يعيل. الاثنين بيتحضّروا بالتوازي عادة، وأفضل تخطيط إنك تعرف من البداية إنه في امتحانين مش واحد.",
          he: 'אם ניגשתם לפסיכומטרי בערבית, רוב המוסדות ידרשו מכם גם הוכחת רמת עברית — כלומר מבחן יע"ל. השניים נלמדים בדרך כלל במקביל, וכדאי לדעת מראש שמדובר בשני מבחנים ולא באחד.',
          en: "If you sit the psychometric in Arabic, most institutions will also require evidence of your Hebrew level — that is, YAEL. The two are usually prepared for in parallel, and it helps to know from the outset that this is two exams, not one.",
        },
      },
    ],
  },

  {
    slug: "bagrut-units",
    subjectSlug: "mathematics",
    updated: "2026-08-16",
    title: {
      ar: "وحدات البجروت: 3، 4، ولا 5؟",
      he: "יחידות בגרות: 3, 4 או 5?",
      en: "Bagrut units: 3, 4 or 5?",
    },
    excerpt: {
      ar: "شو بتعني الوحدات، إيمتى بتقرّر، وليش الرياضيات والإنجليزي بيفرقوا أكتر من غيرهم.",
      he: "מה משמעות היחידות, מתי מחליטים, ולמה מתמטיקה ואנגלית משנות יותר מהשאר.",
      en: "What the units mean, when you decide, and why maths and English matter more than the rest.",
    },
    sections: [
      {
        heading: {
          ar: "شو بتعني الوحدات؟",
          he: "מה זה יחידות?",
          en: "What are units?",
        },
        body: {
          ar: "الوحدة (يحيدات لِمود) هي وحدة قياس لحجم المادة وعمقها بامتحان البجروت. المواضيع الأساسية بتنعطى بمستويات 3، 4، أو 5 وحدات — 3 هو الحد الأدنى للحصول على شهادة بجروت، و5 هو المستوى الموسّع.",
          he: "יחידת לימוד היא מדד להיקף ולעומק החומר בבחינת הבגרות. מקצועות הליבה נלמדים ברמות של 3, 4 או 5 יחידות — 3 הוא המינימום לתעודת בגרות, ו-5 היא הרמה המורחבת.",
          en: "A study unit measures the scope and depth of the material in a bagrut exam. Core subjects are taken at 3, 4 or 5 units — 3 is the minimum for a bagrut certificate, and 5 is the extended level.",
        },
      },
      {
        heading: {
          ar: "ليش الرياضيات والإنجليزي بيفرقوا أكتر",
          he: "למה מתמטיקה ואנגלית משנות יותר",
          en: "Why maths and English matter more",
        },
        body: {
          ar: "المؤسسات الأكاديمية بتعطي إضافة على العلامة (بونوس) للمواضيع الموسّعة، والإضافة على الرياضيات والإنجليزي بمستوى 5 وحدات هي الأكبر عادةً. كمان في مواضيع جامعية — هندسة، طب، علوم حاسوب — بتطلب 5 وحدات رياضيات كشرط قبول مباشر، مش بس كبونوس.",
          he: "המוסדות האקדמיים מעניקים בונוס לציון על מקצועות מורחבים, והבונוס על מתמטיקה ואנגלית ברמת 5 יחידות הוא בדרך כלל הגדול ביותר. בנוסף, חוגים כמו הנדסה, רפואה ומדעי המחשב דורשים 5 יחידות מתמטיקה כתנאי קבלה ישיר, לא רק כבונוס.",
          en: "Universities add a bonus to your grade for extended subjects, and the bonus for 5-unit maths and English is usually the largest. Beyond that, degrees like engineering, medicine and computer science require 5-unit maths as a direct admission condition, not merely as a bonus.",
        },
      },
      {
        heading: {
          ar: "إيمتى بتقرّر؟",
          he: "מתי מחליטים?",
          en: "When you decide",
        },
        body: {
          ar: "القرار الفعلي بينبني بالصف العاشر، ولما توصل الحادي عشر بيصير النزول من 5 لـ 4 أسهل بكثير من الطلوع. الطلاب اللي بيوصلوا لدرس خصوصي بالصف العاشر بيقدروا يضلّوا بمستوى 5 وحدات؛ اللي بيستنّى لآخر الحادي عشر غالباً بينزّل مستوى.",
          he: "ההחלטה בפועל נקבעת בכיתה י', ובכיתה י\"א ירידה מ-5 ל-4 קלה בהרבה מעלייה. תלמידים שמגיעים לשיעור פרטי בכיתה י' מצליחים לרוב להישאר ברמת 5 יחידות; מי שממתין לסוף י\"א בדרך כלל מוריד רמה.",
          en: "The real decision is made in tenth grade, and by eleventh, dropping from 5 to 4 is far easier than climbing. Students who start private tuition in tenth grade usually manage to stay at 5 units; those who wait until the end of eleventh usually drop a level.",
        },
      },
      {
        heading: {
          ar: "شو بينطبق على المدارس العربية بالتحديد",
          he: "מה רלוונטי במיוחד לבתי ספר ערביים",
          en: "What applies specifically in Arab schools",
        },
        body: {
          ar: "نسبة التقدّم لامتحانات البجروت بالمدارس العربية عالية جداً — أعلى من نظيرتها بالمدارس العبرية — بس نسبة الوصول لبجروت بمستوى يؤهّل للجامعة أقل. الفجوة مش بالجهد، هي بمستوى الوحدات وبالدعم المتوفّر. هون بالضبط بيفرق الدرس الخصوصي.",
          he: "שיעור הניגשים לבחינות הבגרות בבתי הספר הערביים גבוה מאוד — גבוה מזה שבחינוך העברי — אך שיעור הזכאות לבגרות ברמה המאפשרת קבלה לאוניברסיטה נמוך יותר. הפער אינו במאמץ אלא ברמת היחידות ובתמיכה הזמינה. כאן בדיוק שיעור פרטי עושה את ההבדל.",
          en: "The share of students sitting bagrut exams in Arab schools is very high — higher than in Hebrew-sector schools — but the share reaching a university-qualifying bagrut is lower. The gap isn't effort; it's unit levels and available support. That is exactly where private tuition changes the outcome.",
        },
      },
    ],
  },
];

export function findGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
