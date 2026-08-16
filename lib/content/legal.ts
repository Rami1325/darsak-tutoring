import type { LocalizedText } from "@/lib/data/types";

/**
 * Legal drafts.
 *
 * Structured as an intermediary
 * marketplace: the platform is not a party to the lesson,
 * tutors are independent and responsible for their own invoicing and licensing.
 *
 * These are drafts and every page says so. Israeli obligations that apply here
 * and need a lawyer's pass before launch: the Privacy Protection Law
 * (Amendment 13, in force August 2025), Consumer Protection Law once paid
 * plans ship, and accessibility under Israeli Standard 5568.
 */

export type LegalSection = { heading: LocalizedText; body: LocalizedText };

export const termsSections: LegalSection[] = [
  {
    heading: {
      ar: "طبيعة الخدمة",
      he: "מהות השירות",
      en: "Nature of the service",
    },
    body: {
      ar: "درسك منصّة بتعرض معلّمين خصوصيين مستقلّين وبتخلّي الطلاب يلاقوهم. المنصّة مش طرف بالاتفاق بين الطالب والمعلّم، وما بتقدّم خدمة تعليمية بحد ذاتها.",
      he: "דרסק היא פלטפורמה שמציגה מורים פרטיים עצמאיים ומאפשרת לתלמידים למצוא אותם. הפלטפורמה אינה צד להסכם בין התלמיד למורה ואינה מספקת בעצמה שירות לימודי.",
      en: "Darsak lists independent private tutors and helps students find them. The platform is not a party to any agreement between a student and a tutor, and does not itself provide tuition.",
    },
  },
  {
    heading: {
      ar: "التسجيل والأهلية",
      he: "הרשמה וכשירות",
      en: "Registration and eligibility",
    },
    body: {
      ar: "التسجيل كمعلّم متاح لمين عمره 18 سنة وفوق. الطلاب من عمر 16 بيقدروا يسجّلوا بأنفسهم؛ تحت 16 لازم موافقة ولي الأمر، أو يسجّل ولي الأمر بدلاً عنهم.",
      he: "הרשמה כמורה פתוחה לבני 18 ומעלה. תלמידים מגיל 16 יכולים להירשם בעצמם; מתחת לגיל 16 נדרשת הסכמת אפוטרופוס, או שההורה נרשם במקומם.",
      en: "Tutor registration is open to those aged 18 and over. Students aged 16 and above may register themselves; under 16 requires guardian consent, or a guardian registering on their behalf.",
    },
  },
  {
    heading: {
      ar: "مسؤوليات المعلّم",
      he: "אחריות המורה",
      en: "Tutor responsibilities",
    },
    body: {
      ar: "المعلّم مستقلّ، ومسؤول لحاله عن إصدار الفواتير والإيصالات، عن التزاماته الضريبية، وعن أي ترخيص أو مؤهّل بيدّعيه. ما في علاقة عمل بين المنصّة والمعلّم.",
      he: "המורה עצמאי ואחראי בעצמו להנפקת חשבוניות וקבלות, לחובות המס שלו, ולכל רישיון או הסמכה שהוא מציג. אין יחסי עובד-מעסיק בין הפלטפורמה למורה.",
      en: "Tutors are independent and solely responsible for issuing invoices and receipts, for their own tax obligations, and for any licence or qualification they claim. There is no employment relationship between the platform and a tutor.",
    },
  },
  {
    heading: { ar: "الدفع والعمولات", he: "תשלום ועמלות", en: "Payment and fees" },
    body: {
      ar: "الدفع على الدروس بصير مباشرة بين الطالب والمعلّم، بالطريقة اللي بيتّفقوا عليها. المنصّة ما بتاخد عمولة على الدروس اللي بيرتّبها المعلّم بنفسه، وما بتتدخّل بالدفع. البحث والتواصل مجاني للطلاب.",
      he: "התשלום על השיעורים מתבצע ישירות בין התלמיד למורה, בדרך שיסכימו עליה. הפלטפורמה אינה גובה עמלה על שיעורים שהמורה סידר בעצמו ואינה מעורבת בתשלום. החיפוש והיצירת קשר חינמיים לתלמידים.",
      en: "Payment for lessons is made directly between student and tutor, by whatever means they agree. The platform takes no commission on lessons a tutor arranges themselves, and is not involved in the payment. Searching and contacting tutors is free for students.",
    },
  },
  {
    heading: { ar: "التقييمات", he: "דירוגים", en: "Reviews" },
    body: {
      ar: "التقييمات بتنكتب من طلاب أخذوا دروس فعلاً، وبتمرّ على مراجعة قبل النشر. بنحتفظ بحق رفض أو إزالة تقييم مخالف، والمعلّم إله حق الرد.",
      he: "הדירוגים נכתבים על ידי תלמידים שלמדו בפועל ועוברים בדיקה לפני פרסום. אנו שומרים את הזכות לדחות או להסיר דירוג מפר, ולמורה שמורה זכות תגובה.",
      en: "Reviews are written by students who actually took lessons and are checked before publication. We reserve the right to reject or remove a review that breaches these terms, and the tutor has a right of reply.",
    },
  },
  {
    heading: { ar: "سلوك محظور", he: "התנהגות אסורה", en: "Prohibited conduct" },
    body: {
      ar: "ممنوع نشر معلومات كاذبة، انتحال شخصية، مضايقة مستخدمين، أو استعمال المنصّة لأغراض تجارية غير التدريس. بنقدر نوقف أي حساب مخالف.",
      he: "אסור לפרסם מידע כוזב, להתחזות, להטריד משתמשים או להשתמש בפלטפורמה למטרות מסחריות שאינן הוראה. אנו רשאים להשעות כל חשבון מפר.",
      en: "Posting false information, impersonation, harassing users, or using the platform for commercial purposes other than tuition is prohibited. We may suspend any account in breach.",
    },
  },
  {
    heading: {
      ar: "إخلاء مسؤولية",
      he: "הגבלת אחריות",
      en: "Limitation of liability",
    },
    body: {
      ar: "المنصّة ما بتضمن مؤهّلات المعلّم ولا جودة الدرس ولا نتيجة معيّنة. بالدروس الوجاهية، ننصح بترتيب اللقاء الأول بمكان عام أو بوجود ولي أمر.",
      he: "הפלטפורמה אינה מתחייבת לכישוריו של מורה, לאיכות השיעור או לתוצאה כלשהי. בשיעורים פרונטליים מומלץ לקיים את המפגש הראשון במקום ציבורי או בנוכחות הורה.",
      en: "The platform does not warrant a tutor's qualifications, the quality of a lesson, or any particular outcome. For in-person lessons we recommend holding the first meeting in a public place or with a guardian present.",
    },
  },
  {
    heading: {
      ar: "التعديلات والقانون الحاكم",
      he: "שינויים ודין חל",
      en: "Changes and governing law",
    },
    body: {
      ar: "بنقدر نحدّث هالشروط، وبننشر تاريخ آخر تحديث. القانون الحاكم هو القانون الإسرائيلي.",
      he: "אנו רשאים לעדכן את התנאים ונפרסם את מועד העדכון האחרון. הדין החל הוא הדין הישראלי.",
      en: "We may update these terms and will publish the date of the latest revision. Israeli law governs.",
    },
  },
];

export const privacySections: LegalSection[] = [
  {
    heading: {
      ar: "المعلومات اللي بنجمعها",
      he: "המידע שאנו אוספים",
      en: "What we collect",
    },
    body: {
      ar: "رقم الهاتف والاسم عند التسجيل، ومعلومات الصفحة اللي بتدخلها بنفسك (مواضيع، أسعار، مناطق، سيرة). كمان بنجمع بيانات استعمال مجهولة الهوية لتحسين الموقع.",
      he: "מספר טלפון ושם בעת ההרשמה, והמידע שאתם מזינים בפרופיל (מקצועות, מחירים, אזורים, תיאור). כמו כן נאסף מידע שימוש אנונימי לשיפור האתר.",
      en: "Your phone number and name at registration, plus whatever you enter in your profile (subjects, rates, areas, bio). We also collect anonymised usage data to improve the site.",
    },
  },
  {
    heading: {
      ar: "ليش بنستعملها",
      he: "לשם מה אנו משתמשים במידע",
      en: "How we use it",
    },
    body: {
      ar: "لتشغيل المنصّة: عرض صفحات المعلّمين، توصيل الطلاب بالمعلّمين، إرسال إشعارات، ومنع إساءة الاستعمال. ما منبيع معلوماتك ولا منستعملها لإعلانات طرف ثالث.",
      he: "להפעלת הפלטפורמה: הצגת פרופילי מורים, חיבור בין תלמידים למורים, שליחת התראות ומניעת שימוש לרעה. איננו מוכרים את המידע ואיננו משתמשים בו לפרסום צד שלישי.",
      en: "To run the platform: displaying tutor profiles, connecting students with tutors, sending notifications, and preventing abuse. We do not sell your data or use it for third-party advertising.",
    },
  },
  {
    heading: {
      ar: "المعلومات العامة",
      he: "מידע פומבי",
      en: "Public information",
    },
    body: {
      ar: "صفحة المعلّم المنشورة بتكون ظاهرة للجميع ولمحركات البحث، وبتشمل الاسم والمواضيع والأسعار والمناطق والتقييمات. رقم الهاتف ما بينعرض إلا لما تختار تعرضه.",
      he: "פרופיל מורה שפורסם גלוי לכולם ולמנועי חיפוש, וכולל שם, מקצועות, מחירים, אזורים ודירוגים. מספר הטלפון אינו מוצג אלא אם בחרתם להציגו.",
      en: "A published tutor profile is visible to everyone and to search engines, including name, subjects, rates, areas and reviews. Your phone number is not shown unless you choose to display it.",
    },
  },
  {
    heading: { ar: "حقوقك", he: "הזכויות שלכם", en: "Your rights" },
    body: {
      ar: "إلك حق تطّلع على معلوماتك، تصحّحها، أو تطلب حذفها. لطلب من هالنوع تواصل معنا وبنرد خلال مدة معقولة.",
      he: "יש לכם זכות לעיין במידע שלכם, לתקן אותו או לבקש את מחיקתו. לפנייה בעניין זה צרו קשר ונשיב בתוך זמן סביר.",
      en: "You have the right to access your data, correct it, or request its deletion. Contact us and we will respond within a reasonable time.",
    },
  },
  {
    heading: {
      ar: "الاحتفاظ والأمان",
      he: "שמירה ואבטחה",
      en: "Retention and security",
    },
    body: {
      ar: "بنحتفظ بالمعلومات طول ما الحساب فعّال، وبنحذفها بعد فترة معقولة من إغلاقه. بنستعمل تشفير بالنقل وصلاحيات وصول محدودة.",
      he: "אנו שומרים את המידע כל עוד החשבון פעיל, ומוחקים אותו זמן סביר לאחר סגירתו. אנו משתמשים בהצפנה בהעברה ובהרשאות גישה מוגבלות.",
      en: "We keep your data while the account is active and delete it a reasonable period after closure. We use encryption in transit and restricted access controls.",
    },
  },
  {
    heading: { ar: "الكوكيز", he: "עוגיות", en: "Cookies" },
    body: {
      ar: "بنستعمل كوكيز ضرورية لتشغيل الموقع (زي حفظ اللغة وجلسة الدخول)، وكوكيز قياس مجهولة الهوية لفهم استعمال الموقع.",
      he: "אנו משתמשים בעוגיות הכרחיות לתפעול האתר (כמו שמירת שפה וסשן התחברות) ובעוגיות מדידה אנונימיות להבנת השימוש.",
      en: "We use cookies necessary to run the site (such as remembering your language and session) and anonymised analytics cookies to understand usage.",
    },
  },
];

export const accessibilitySections: LegalSection[] = [
  {
    heading: { ar: "التزامنا", he: "המחויבות שלנו", en: "Our commitment" },
    body: {
      ar: "بنسعى إنه الموقع يكون متاح لكل الناس، بما فيهم أصحاب الإعاقات، وفق المعيار الإسرائيلي ت\"ي 5568 المبني على WCAG 2.0 مستوى AA.",
      he: 'אנו פועלים לכך שהאתר יהיה נגיש לכולם, לרבות אנשים עם מוגבלות, בהתאם לתקן הישראלי ת"י 5568 המבוסס על WCAG 2.0 ברמה AA.',
      en: "We work to make the site usable by everyone, including people with disabilities, in line with Israeli Standard 5568, based on WCAG 2.0 level AA.",
    },
  },
  {
    heading: {
      ar: "شو عملنا",
      he: "מה יישמנו",
      en: "What we have implemented",
    },
    body: {
      ar: "بنية عناوين واضحة، تنقّل كامل بلوحة المفاتيح، رابط تخطّي للمحتوى، تباين ألوان مناسب، نصوص بديلة للصور، ودعم كامل للاتجاه من اليمين لليسار بالعربي والعبري.",
      he: "מבנה כותרות ברור, ניווט מלא במקלדת, קישור דילוג לתוכן, ניגודיות צבעים מספקת, טקסט חלופי לתמונות ותמיכה מלאה בכיווניות מימין לשמאל בערבית ובעברית.",
      en: "Clear heading structure, full keyboard navigation, a skip-to-content link, sufficient colour contrast, alternative text for images, and full right-to-left support in Arabic and Hebrew.",
    },
  },
  {
    heading: {
      ar: "قيود معروفة",
      he: "מגבלות ידועות",
      en: "Known limitations",
    },
    body: {
      ar: "الموقع لسّا قيد التطوير وما خضع لتدقيق إتاحة خارجي بعد. إذا واجهت صعوبة بالوصول لأي جزء، تواصل معنا وبنعالجها.",
      he: "האתר עדיין בפיתוח ולא עבר ביקורת נגישות חיצונית. אם נתקלתם בקושי בגישה לחלק כלשהו, פנו אלינו ונטפל בכך.",
      en: "The site is still in development and has not yet had an external accessibility audit. If you encounter a barrier, contact us and we will address it.",
    },
  },
  {
    heading: { ar: "تواصل معنا", he: "יצירת קשר", en: "Contact" },
    body: {
      ar: "لأي ملاحظة حول إتاحة الموقع، راسلنا على hello@darsak.co.il.",
      he: "לכל הערה בנושא נגישות האתר, כתבו לנו ל-hello@darsak.co.il.",
      en: "For any accessibility feedback, email hello@darsak.co.il.",
    },
  },
];
