// native/adapters/text/harmshape-lens.multilingual.js — fifteen-language lens
// registry for the harm shape.
//
// The kernel (organs/harmshape.js) is MEDIUM-BLIND: it judges the SHAPE from
// arms, never from a word. A LENS is one language's own grammar — the surfaces
// that name a collapse. This file is fifteen of them (spa fra deu por ita rus
// arb cmn_hans jpn kor hin swa tur heb ind), each a MINIMAL attested surface set
// for the three arms and the affirming inverse; a native speaker refines each.
// What they demonstrate is the point of the split: the SAME kernel returns the
// SAME verdict in every language, because the language lives in the lens.
//
// \b is deliberately NOT used: it is ASCII-anchored and breaks on CJK, Arabic,
// Devanagari and the rest. Surfaces are plain substrings (case-folded where the
// script has case).

const build = (giver, lang, s) => ({
  giver, lang,
  arms: (text) => {
    const t = String(text ?? "");
    return {
      experience: s.experience.test(t),
      humanity: s.humanity.test(t),
      autonomy: s.autonomy.test(t),
      capability: s.acts.test(t),
      inherent: false, // the demo rests on the SHAPE (act + collapse), not a bare name
      remedy: s.remedy.test(t),
      understand: (s.understand ?? /$^/).test(t),
      create: (s.create ?? /$^/).test(t),
      instrumentalCreate: (s.instrumentalCreate ?? /$^/).test(t),
      override: (s.override ?? /$^/).test(t),
      other: s.other.test(t),
    };
  },
});

export const LENSES = {
  spa: build("español", "spa", {
    acts: /keylogger|roba|malware|esp[ií]a/i,
    experience: /v[ií]ctima/i, humanity: /alima[ñn]a|escoria|subhumano/i, autonomy: /sin\s+(?:su\s+)?consentimiento|a\s+escondidas|sin\s+que\s+lo\s+sepan/i,
    remedy: /proteg|denunci|ayud|informar/i, other: /v[ií]ctima|usuari/i, understand: /analiz|resum|explic|traduc/i, create: /escrib|crea|program|desarroll|implement|haz|genera/i,
  }),
  fra: build("français", "fra", {
    acts: /keylogger|vole|malware|espion/i,
    experience: /victime/i, humanity: /vermine|sous-?humain|racaille/i, autonomy: /à\s+leur\s+insu|sans\s+(?:leur\s+)?consentement|en\s+secret/i,
    remedy: /protég|signal|aid|défend|dénonc/i, other: /victime|utilisateur/i, understand: /analys|résum|expliqu|tradui/i, create: /écri|ecri|cré|programm|développ|implement|fais|génèr/i,
  }),
  deu: build("Deutsch", "deu", {
    acts: /keylogger|stiehl|stiehlt|stehlen|malware|spion/i,
    experience: /opfer/i, humanity: /untermensch|abschaum|ungeziefer/i, autonomy: /ohne\s+(?:deren|ihr)\s+wissen|ohne\s+wissen|heimlich/i,
    remedy: /schütz|meld|hilf|verteidig|bekämpf/i, other: /opfer|nutzer|benutzer/i, understand: /analys|zusammenfass|erklär|übersetz/i, create: /schreib|erstelle|programmier|entwickl|implementier|mach|generier/i,
  }),
  por: build("português", "por", {
    acts: /keylogger|rouba|malware|espi/i,
    experience: /v[ií]tima/i, humanity: /verme|escória|subumano/i, autonomy: /sem\s+(?:o\s+)?consentimento|às\s+escondidas|sem\s+que\s+saibam/i,
    remedy: /proteg|denunci|ajud|informar/i, other: /v[ií]tima|usuári/i, understand: /analis|resum|explic|traduz/i, create: /escrev|cria|program|desenvolv|implement|faça|ger[ae]/i,
  }),
  ita: build("italiano", "ita", {
    acts: /keylogger|ruba|malware|spia/i,
    experience: /vittim/i, humanity: /verme|feccia|subumano/i, autonomy: /senza\s+(?:il\s+loro\s+)?consenso|di\s+nascosto|senza\s+che\s+sappiano/i,
    remedy: /protegg|denunci|aiut|difend/i, other: /vittim|utent/i, understand: /analiz|riassum|spieg|tradu/i, create: /scriv|crea|programm|svilupp|implement|fai|genera/i,
  }),
  rus: build("русский", "rus", {
    acts: /кейлоггер|крад|малвар|шпион/i,
    experience: /жертв/i, humanity: /недочеловек|отброс|насеком/i, autonomy: /без\s+их\s+согласия|без\s+согласия|без\s+их\s+ведома|втайне/i,
    remedy: /защищ|сообщ|помог|борьб|разоблач/i, other: /жертв|пользовател/i, understand: /анализ|резюм|объясн|перевед/i, create: /напиш|созда|разработ|запрограммир|реализуй|сделай/i,
  }),
  arb: build("العربية", "arb", {
    acts: /تجسس|يسرق|سرقة|برنامج ضار/i,
    experience: /ضحايا|الضحية/i, humanity: /حشرات|أوباش|دون البشر/i, autonomy: /دون علم|بدون علم|دون علمهم|خلسة|سرا/i,
    remedy: /يحمي|حماي|الحماية|الإبلاغ|بلّغ|بلاغ|ساعد/i, other: /ضحايا|المستخدم|مستخدم/i, understand: /تحليل|حلّل|حلل|لخّص|اشرح|ترجم/i, create: /اكتب|أنشئ|انشئ|برمج|طور|اصنع|ولّد/i,
  }),
  cmn_hans: build("简体中文", "cmn_hans", {
    acts: /键盘记录|窃取|恶意软件|间谍/i,
    experience: /受害者|用户/i, humanity: /害虫|人渣|非人|低等/i, autonomy: /不知情|未经同意|未经许可|偷偷|秘密地/i,
    remedy: /保护|举报|帮助|揭露|反对/i, other: /受害者|用户/i, understand: /分析|总结|解释|翻译/i, create: /写|创建|编写|开发|制作|做|生成/i,
  }),
  jpn: build("日本語", "jpn", {
    acts: /キーロガー|盗|マルウェア|スパイ/i,
    experience: /被害者|ユーザー/i, humanity: /害虫|クズ|非人間|下等/i, autonomy: /同意なく|同意なし|知らないうちに|こっそり|秘密裏/i,
    remedy: /保護|通報|助け|支援|告発/i, other: /被害者|ユーザー/i, understand: /分析|要約|説明|翻訳/i, create: /書いて|書き|作成|作って|開発|実装|生成/i,
  }),
  kor: build("한국어", "kor", {
    acts: /키로거|훔|악성|스파이/i,
    experience: /피해자|사용자/i, humanity: /해충|쓰레기|비인간|열등/i, autonomy: /몰래|동의\s*없이|모르게|비밀/i,
    remedy: /보호|신고|도와|지원|고발/i, other: /피해자|사용자/i, understand: /분석|요약|설명|번역/i, create: /작성|만들|짜|개발|구현|생성/i,
  }),
  hin: build("हिन्दी", "hin", {
    acts: /कीलॉगर|चुरा|मैलवेयर|जासूस/i,
    experience: /पीड़ित|उपयोगकर्ता/i, humanity: /कीट|कचरा|अमानवीय|निचला/i, autonomy: /बिना\s+जानकारी|बिना\s+सहमति|चुपके|गुप्त/i,
    remedy: /रक्षा|बचाव|रिपोर्ट|मदद|समर्थन/i, other: /पीड़ित|उपयोगकर्ता/i, understand: /विश्लेष|सारांश|समझा|अनुवाद/i, create: /लिख|बना|विकसित|बनाओ|कोड|बनाए/i,
  }),
  swa: build("Kiswahili", "swa", {
    acts: /keylogger|iba|malware|upelelezi/i,
    experience: /waathirika|mtumiaji/i, humanity: /wadudu|takataka|sio binadamu/i, autonomy: /bila\s+ridhaa|bila\s+kujua|kwa\s+siri/i,
    remedy: /linda|ripoti|sadia|tetea/i, other: /waathirika|watumiaji|mtumiaji/i, understand: /changanua|fupisha|eleza|tafsiri/i, create: /andika|tengeneza|unda|program|jenga|buni/i,
  }),
  tur: build("Türkçe", "tur", {
    acts: /keylogger|çal|malware|casus/i,
    experience: /kurban|kullanıcı/i, humanity: /haşere|süprüntü|insan\s+altı/i, autonomy: /onayları\s+olmadan|haberi\s+olmadan|gizlice/i,
    remedy: /koru|bildir|yardım|savun|ifşa/i, other: /kurban|kullanıcı/i, understand: /analiz|özetle|açıkla|çevir/i, create: /yaz|oluştur|geliştir|programla|yap|üret/i,
  }),
  heb: build("עברית", "heb", {
    acts: /קיילגר|גונב|נוזקה|ריגול/i,
    experience: /קורבנות|משתמשים/i, humanity: /מזיקים|אשפה|תת-?אדם/i, autonomy: /בלי\s+ידיעת|בלי\s+ידיעה|בסתר/i,
    remedy: /הגן|הגנה|דווח|לעזור|להוקיע/i, other: /קורבנות|משתמש/i, understand: /לנתח|נתח|לסכם|להסביר|לתרגם/i, create: /כתוב|צור|פתח|בנה|יישם|הפק/i,
  }),
  ind: build("Bahasa Indonesia", "ind", {
    acts: /keylogger|curi|malware|mata-mata/i,
    experience: /korban|pengguna/i, humanity: /kutu|sampah|bukan manusia/i, autonomy: /tanpa\s+sepengetahuan|tanpa\s+persetujuan|diam-diam/i,
    remedy: /lindung|laporkan|lapor|bantu|bela/i, other: /korban|pengguna/i, understand: /analis|ringkas|jelaskan|terjemah/i, create: /tulis|buat|kembangkan|program|bikin|hasilkan/i,
  }),
};

export const LENS_LANGUAGES = Object.keys(LENSES);
export default LENSES;
