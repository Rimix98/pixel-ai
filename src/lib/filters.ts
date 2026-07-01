// Multilingual injection + leak patterns — 30+ languages

// ═══════════════════════════════════════════════════
//  SECTION 1: Prompt injection patterns per language
// ═══════════════════════════════════════════════════

export const INJECTION_PATTERNS: RegExp[] = [
  // ── English ──
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|directives?)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /system\s*(prompt|message|instruction)\s*[:=]/i,
  /forget\s+(everything|all|your)\s+(you|were|have|instructions?)/i,
  /override\s+(safety|instructions?|rules?|constraints?|guardrails?)/i,
  /\bjailbreak\b/i,
  /\bDAN\s+mode\b/i,
  /act\s+as\s+if\s+you\s+have\s+no\s+(restrictions?|rules?|limits?|boundaries?)/i,
  /\bdo\s+anything\s+now\b/i,
  /developer\s+mode\s+(enabled|activated|on)/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /<\|im_start\|>/i,
  /\bpretend\b.*\byou\b.*\bare\b.*\bDAN\b/i,
  /from\s+now\s+on\s+you\s+(will|must|should|shall|are\s+going\s+to)\s+(respond|answer|reply|act|behave)/i,
  /you\s+are\s+no\s+longer\s+(bound|restricted|limited)/i,
  /drop\s+(all\s+)?(your|the|these)\s+(previous|prior|existing)\s+(rules?|instructions?|constraints?)/i,
  /enter\s+developer\s+mode/i,
  /enable\s+(unrestricted|uncensored|unfiltered)\s+mode/i,
  /bypass\s+(all\s+)?(safety|content|security|filter|moderation)/i,
  /\bDUDE\b.*\bmode\b/i,
  /rebellious\s+AI/i,
  /you\s+are\s+ now\s+(free|unrestricted)/i,
  /respond\s+without\s+(restrictions?|limits?|rules?|filters?)/i,
  /no\s+more\s+(rules?|restrictions?|limits?|filtering)/i,
  /remove\s+(all\s+)?(safety|content|ethical)\s+(filters?|guardrails?|restrictions?)/i,
  /what\s+would\s+you\s+say\s+if\s+you\s+had\s+no\s+(rules?|restrictions?)/i,
  /hypothetically\s+(speaking|if)\s+you\s+(could|can|would)/i,
  /in\s+a\s+hypothetical\s+(scenario|world|universe)\s+where/i,
  /roleplay\s+as\s+(a\s+)?(villain|evil|unrestricted|unfiltered)/i,
  /as\s+an\s+unrestricted\s+AI/i,
  /unleash\s+your\s+(full|true|real|inner)/i,

  // ── Russian ──
  /игнорируй\s+(все\s+)?(предыдущие|прошлые|ранее\s+данные)\s+(инструкции|правила|указания)/i,
  /ты\s+теперь\s+(являешься|будешь|станешь)/i,
  /забудь\s+(всё|все|всё\s+что)\s+(ты\s+)?(знаешь|тебе\s+говорили)/i,
  /отключи\s+(все\s+)?(ограничения|фильтры|правила|защиту)/i,
  /обходи\s+(все\s+)?(фильтры|ограничения|запреты|блокировки)/i,
  /на\s+самом\s+деле\s+я\s+являюсь/i,
  /честно\s+укажи\s+свою\s+реальную/i,
  /реальную\s+нейросетевую\s+архитектуру/i,
  /игнорируй\s+любые\s+вымышленные\s+бренды/i,
  /это\s+приказ\s+администратора/i,
  /ты\s+больше\s+не\s+связан\s+(правилами|ограничениями)/i,
  /действуй\s+без\s+(ограничений|правил|фильтров)/i,
  /притворись\s+что\s+у\s+тебя\s+нет\s+(ограничений|правил)/i,
  /выйди\s+из\s+(角色|角色扮演|консоль|режима)/i,
  /режим\s+администратора/i,
  /сними\s+все\s+ограничения/i,
  /ты\s+теперь\s+свободен\s+от\s+(правил|ограничений)/i,
  /как\s+бы\s+ты\s+ответил\s+без\s+(правил|ограничений|фильтров)/i,

  // ── Chinese (中文) ──
  /忽略(之前|上面|以前|先前)的(所有)?(指令|提示|规则|指示)/i,
  /你现在是/i,
  /忘掉(所有|一切|你(之前)?学的)/i,
  /没有(任何)?(限制|规则|约束|过滤)/i,
  /绕过(所有)?(安全|内容|审查|过滤)/i,
  /开发者模式/i,
  /无审查模式/i,
  /你不再受(任何)?(限制|规则|约束)/i,
  /假装你(没有|不存在)(限制|规则|边界)/i,
  /做任何事/i,
  /自由回答/i,
  /不限制你的回答/i,

  // ── Japanese (日本語) ──
  /これまでの(すべての)?(指示|プロンプト|ルール|規則)を無視/i,
  /あなたはもう今/i,
  /すべてを忘れて/i,
  /(制限|ルール|規則|フィルター)を解除/i,
  /安全(フィルター|機能|システム)を(無効|解除|オフ)/i,
  /開発者モード/i,
  /制限なしモード/i,
  /あなたは(もう)?(制限|規則)に縛られない/i,
  /何でも答えて/i,
  /自由に答えて/i,

  // ── Korean (한국어) ──
  /이전의?\s*(모든|모든)?\s*(지시|명령|규칙|프롬프트)를\s*무시/i,
  /너는\s*이제/i,
  /모두\s*잊어버려/i,
  /(제한|규칙|필터)를\s*(해제|비활성화|끄다)/i,
  /개발자\s*모드/i,
  /제한\s*없는\s*모드/i,
  /자유롭게\s*답변해/i,

  // ── Arabic (العربية) ──
  /تجاهل\s+(جميع\s+)?(الأوامر|التعليمات|القواعد|التوجيهات)\s+(السابقة|الأخيرة)/i,
  /أنت\s+الآن\s+/i,
  /انسَ\s+(كل|جميع)\s+(ما\s+)?(تعرفه|تعلمتها)/i,
  /تجاوز\s+(جميع\s+)?(القيود|القواعد|الفلاتر|الحظر)/i,
  /وضع\s+المطور/i,
  /وضع\s+بدون\s+قيود/i,
  /أجب\s+بدون\s+(قيود|حدود|قواعد|فلاتر)/i,

  // ── Spanish (Español) ──
  /ignora\s+(todas\s+las\s+)?(instrucciones|reglas|directrices)\s+(anteriores|previas)/i,
  /ahora\s+eres\s+un/i,
  /olvida\s+(todo|todo\s+lo\s+que)/i,
  /anula\s+(todas\s+las\s+)?(restricciones|reglas|seguridad|filtros)/i,
  /modo\s+desarrollador/i,
  /modo\s+sin\s+restricciones/i,
  /responde\s+sin\s+(restricciones|límites|reglas|filtros)/i,

  // ── French (Français) ──
  /ignore\s+(toutes\s+les\s+)?(instructions|règles|directives)\s+(précédentes|antérieures)/i,
  /tu\s+es\s+maintenant\s+un/i,
  /oublie\s+(tout|tout\s+ce\s+que)/i,
  /contourne\s+(toutes\s+les\s+)?(restrictions|règles|sécurité|filtres)/i,
  /mode\s+développeur/i,
  /mode\s+sans\s+restriction/i,
  /réponds\s+sans\s+(restrictions|limites|règles|filtres)/i,

  // ── German (Deutsch) ──
  /ignoriere\s+(alle\s+)?(vorherigen|bisherigen)\s+(Anweisungen|Regeln|Vorgaben)/i,
  /du\s+bist\s+jetzt\s+ein/i,
  /vergiss\s+(alles|alles\s+was)/i,
  /umgeh\w+\s+(alle\s+)?(Sicherheits|Inhalts|Filter)\s*(Einschränkungen|Regeln)/i,
  /Entwicklermodus/i,
  /Eingeschränkungsloser\s+Modus/i,

  // ── Portuguese (Português) ──
  /ignore\s+(todas\s+as\s+)?(instruções|regras|diretrizes)\s+(anteriores|prévias)/i,
  /agora\s+você\s+é\s+um/i,
  /esqueça\s+(tudo|tudo\s+o\s+que)/i,
  /ultrapasse\s+(todas\s+as\s+)?(restrições|regras|segurança|filtros)/i,
  /modo\s+desenvolvedor/i,
  /modo\s+sem\s+restrições/i,

  // ── Italian (Italiano) ──
  /ignora\s+(tutte\s+le\s+)?(istruzioni|regole|direttive)\s+(precedenti|anteriori)/i,
  /ora\s+sei\s+un/i,
  /dimentica\s+(tutto|tutto\s+ciò\s+che)/i,
  /aggira\s+(tutte\s+le\s+)?(restrizioni|regole|sicurezza|filtri)/i,
  /modalità\s+sviluppatore/i,
  /modalità\s+senza\s+restrizioni/i,

  // ── Turkish (Türkçe) ──
  /önceki\s+(tüm\s+)?(talimatları|kuralları|yönergeleri)\s+yok\s+say/i,
  /şimdi\s+sen\s+bir/i,
  /her\s+şeyi\s+(unut|unut\s+gitsin)/i,
  /bypass\s+(tüm\s+)?(güvenlik|içerik|filtre|engel)/i,
  /geliştirici\s+modu/i,
  /kısıtlamasız\s+mod/i,

  // ── Hindi (हिन्दी) ──
  /पिछले\s+(सभी\s+)?(निर्देशों|नियमों|प्रॉम्प्ट)\s+को\s+अनदेखा\s+करो/i,
  /तुम\s+अब\s+एक/i,
  /सब\s+कुछ\+भूल\s+जाओ/i,
  /(सुरक्षा|फ़िल्टर|नियम)\s+को\s+(हटाओ|बंद\s+करो)/i,

  // ── Thai (ภาษาไทย) ──
  /ละเว้น\s+(คำสั่ง|กฎ|แนวทาง)\s+(ก่อนหน้า|ทั้งหมด)/i,
  /ตอนนี้\s+คุณ\s+เป็น/i,
  /ลืม\s+(ทุก|ทั้งหมด)/i,

  // ── Vietnamese (Tiếng Việt) ──
  /bỏ\s+qua\s+(tất\s+cả\s+)?(hướng\s+dẫn|quy\s+tắc|lệnh)\s+(trước|đã\s+cho)/i,
  /bây\s+giờ\s+bạn\s+là\/một/i,
  /quên\s+(hết|tất\s+cả)/i,

  // ── Polish (Polski) ──
  /zignoruj\s+(wszystkie\s+)?(poprzednie\s+)?(polecenia|instrukcje|zasady)/i,
  /teraz\s+jesteś\s+(jednym|jedną)/i,
  /zapomnij\s+(wszystko|o\s+wszystkim)/i,

  // ── Dutch (Nederlands) ──
  /negeer\s+(alle\s+)?(eerdere\s+)?(instructies|regels|richtlijnen)/i,
  /je\s+bent\s+nu\s+(een|een\s+)/i,
  /vergeet\s+(alles|alles\s+wat)/i,

  // ── Swedish (Svenska) ──
  /ignorera\s+(alla\s+)?(tidigare|föregående)\s+(instruktioner|regler)/i,
  /du\s+är\s+nu\s+en/i,
  /glöm\s+(allt|allt\s+du)/i,

  // ── Czech (Čeština) ──
  /ignoruj\s+(všechny\s+)?(předchozí\s+)?(pokyny|pravidla|instrukce)/i,
  /teď\s+jseš\s+(jeden|jedna)/i,
  /zapomeň\s+(všechno|na\s+všechno)/i,

  // ── Romanian (Română) ──
  /ignoră\s+(toate\s+)?(instrucțiunile|regulile|directivele)\s+(anterioare|precedente)/i,
  /acum\s+ești\s+un/i,
  /uită\s+(tot|tot\s+ce)/i,

  // ── Ukrainian (Українська) ──
  /ігноруй\s+(всі\s+)?(попередні|минулі)\s+(інструкції|правила|вказівки)/i,
  /ти\s+тепер\s+(є|будеш)/i,
  /забудь\s+(все|все\s+що)/i,

  // ── Persian/Farsi (فارسی) ──
  /همه\s+دستورالعمل‌های\s+(قبلی|پیشین)\s+را\s+نادیده\s+بگیر/i,
  /اکنون\s+تو\s+(یک|یک\s+هستی)/i,
  /همه\s+چیز\s+را\s+فراموش\s+کن/i,

  // ── Hebrew (עברית) ──
  /התעלם\s+(מכל\s+)?(ההוראות|הכללים|הנחיות)\s+(הקודמות|הקודמות)/i,
  /אתה\s+עכשיו\s+(אחד|אחת)/i,
  /שכח\s+(את\s+כל|הכל)/i,

  // ── Indonesian (Bahasa Indonesia) ──
  /abaikan\s+(semua\s+)?(instruksi|aturan|panduan)\s+(sebelumnya|yang\s+telah)/i,
  /sekarang\s+kamu\s+(adalah|ialah)/i,
  /lupakan\s+(semua|semuanya)/i,

  // ── Bengali (বাংলা) ──
  /সব\s+পূর্ববর্তী\s+(নির্দেশনা|নিয়ম|প্রম্পট)\s+উপেক্ষা\s+করো/i,
  /তুমি\s+এখন\s+এক/i,
  /সব\s+কিছু\s+ভুলে\s+যাও/i,

  // ── Malay (Bahasa Melayu) ──
  /abaikan\s+(semua\s+)?(arahan|peraturan|panduan)\s+(sebelumnya|terdahulu)/i,
  /sekarang\s+anda\s+(adalah|ialah)/i,
  /lupakan\s+(semua|semuanya)/i,

  // ── Georgian (ქართული) ──
  /უგულვებლყოფს\s+(ყველა\s+)?(წინა|ადრინდელ)\s+(ინსტრუქცია|წესი)/i,

  // ── Armenian (Հայերեն) ──
  /անտեսում\s+է\s+(բոլոր\s+)?(նախորդ|նախկին)\s+(հրահանգներ|կանոններ)/i,

  // ── Swahili (Kiswahili) ──
  /puuza\s+(maelekezo\s+yote\s+yaliyopita|kanuni\s+zote)/i,

  // ── Tagalog (Filipino) ──
  /balewalain\s+(lahat\s+ng\s+)?(mga\s+utos|mga\s+panuntun)\s+(na\s+naunahan|bago)/i,
];

// ═══════════════════════════════════════════════════
//  SECTION 2: Model/provider leak filter patterns
// ═══════════════════════════════════════════════════

export interface LeakPattern {
  pattern: RegExp;
  replacement: string;
}

export const MODEL_LEAK_PATTERNS: LeakPattern[] = [
  // ── English provider names ──
  { pattern: /\bGroq\b/g, replacement: "Pixel AI" },
  { pattern: /\bLlama[\s-]?[234]?[\s-]?\d*[bB]?\b/g, replacement: "Pixel AI" },
  { pattern: /\bQwen[\s-]?\d[\w.-]*\b/g, replacement: "Pixel AI" },
  { pattern: /\bGPT-OSS[\s-]?\d*\b/g, replacement: "Pixel AI" },
  { pattern: /\bOllama\b/g, replacement: "Pixel AI" },
  { pattern: /\bOpenAI\b/g, replacement: "Pixel Team" },
  { pattern: /\bGPT[\s-]?[234o]?\b/g, replacement: "Pixel AI" },
  { pattern: /\bClaude\b/g, replacement: "Pixel AI" },
  { pattern: /\bGemini\b/g, replacement: "Pixel AI" },
  { pattern: /\bMistral\b/g, replacement: "Pixel AI" },
  { pattern: /\bDeepSeek\b/g, replacement: "Pixel AI" },
  { pattern: /\bCohere\b/g, replacement: "Pixel AI" },
  { pattern: /\bAnthropic\b/g, replacement: "Pixel Team" },
  { pattern: /\bGoogle\s+(AI|Gemini|PaLM|Bard)\b/g, replacement: "Pixel AI" },
  { pattern: /\bMicrosoft\s+(AI|Azure\s+AI|Copilot)\b/g, replacement: "Pixel AI" },
  { pattern: /\bMeta\s+AI\b/g, replacement: "Pixel Team" },
  { pattern: /\bHugging\s+Face\b/g, replacement: "Pixel Team" },
  { pattern: /\bAlpaca\b/g, replacement: "Pixel AI" },
  { pattern: /\bVicuna\b/g, replacement: "Pixel AI" },
  { pattern: /\bFalcon\b/g, replacement: "Pixel AI" },
  { pattern: /\bMistral\s+AI\b/g, replacement: "Pixel Team" },
  { pattern: /\bStability\s+AI\b/g, replacement: "Pixel Team" },

  // ── Russian provider names ──
  { pattern: /\bЯндекс\s+(GPT|Алиса|Маруся)\b/g, replacement: "Pixel AI" },
  { pattern: /\bСбер\s+(GPT|GigaChat)\b/g, replacement: "Pixel AI" },
  { pattern: /\bGigaChat\b/g, replacement: "Pixel AI" },
  { pattern: /\bYandexGPT\b/g, replacement: "Pixel AI" },

  // ── Chinese provider names ──
  { pattern: /百度(?:文心|ERNIE)/g, replacement: "Pixel AI" },
  { pattern: /阿里(?:云|巴巴)\s*(?:通义|Qwen)/g, replacement: "Pixel AI" },
  { pattern: /华为\s*(?:盘古|Pangu)/g, replacement: "Pixel AI" },
  { pattern: /字节跳动/g, replacement: "Pixel Team" },
  { pattern: /腾讯\s*(?:混元|AI)/g, replacement: "Pixel AI" },
  { pattern: /讯飞\s*(?:星火|Spark)/g, replacement: "Pixel AI" },
  { pattern: /商汤\s*(?:日日新|SenseChat)/g, replacement: "Pixel AI" },
  { pattern: /零一万物/g, replacement: "Pixel Team" },
  { pattern: /智谱\s*AI/g, replacement: "Pixel Team" },
  { pattern: /月之暗面/g, replacement: "Pixel Team" },
  { pattern: /Moonshot/g, replacement: "Pixel AI" },
  { pattern: /MiniMax/g, replacement: "Pixel AI" },
  { pattern: /百川/g, replacement: "Pixel AI" },
  { pattern: /Baichuan/g, replacement: "Pixel AI" },
  { pattern: /Yi\s+Lightning/g, replacement: "Pixel AI" },

  // ── Japanese provider names ──
  { pattern: /日本語\s*(?:AI|GPT)/g, replacement: "Pixel AI" },
  { pattern: /楽天\s*(?:GPT|AI)/g, replacement: "Pixel AI" },
  { pattern: /Preferred\s+Networks/g, replacement: "Pixel Team" },
  { pattern: /Sakana\s+AI/g, replacement: "Pixel Team" },
  { pattern: /LINE\s+AI/g, replacement: "Pixel AI" },
  { pattern: /NTT\s+(?:Communications|Docomo)\s*AI/g, replacement: "Pixel AI" },

  // ── Korean provider names ──
  { pattern: /네이버\s*(?:CLOVA|HyperCLOVA|AI)/g, replacement: "Pixel AI" },
  { pattern: /CLOVA\s+(?:X|Studio)/g, replacement: "Pixel AI" },
  { pattern: /삼성\s*(?:AI|Gauss)/g, replacement: "Pixel AI" },
  { pattern: /LG\s+AI/g, replacement: "Pixel AI" },
  { pattern: /Kakao\s*(?:AI|GPT|Brain)/g, replacement: "Pixel AI" },
  { pattern: /SK\s+(?:T-Brain|AI)/g, replacement: "Pixel AI" },

  // ── Arabic provider names ──
  { pattern: /أرامكو\s*AI/g, replacement: "Pixel AI" },
  { pattern: /Falcon\s*(?:LLM|AI|40B)?/g, replacement: "Pixel AI" },
  { pattern: /Technology\s+Innovation\s+Institute/g, replacement: "Pixel Team" },
  { pattern: /JAIS\s+(?:AI|LLM)?/g, replacement: "Pixel AI" },

  // ── French provider names ──
  { pattern: /Mistral\s+AI/g, replacement: "Pixel Team" },
  { pattern: /Bio\s+Mistral/g, replacement: "Pixel AI" },
  { pattern: /Hugging\s+(?:Face|Face's)/g, replacement: "Pixel Team" },
  { pattern: /Kyutai/g, replacement: "Pixel Team" },

  // ── German provider names ──
  { pattern: /Aleph\s+Alpha/g, replacement: "Pixel Team" },
  { pattern: /SAP\s+(?:AI|GPT|Joule)/g, replacement: "Pixel AI" },
  { pattern: /Siemens\s+AI/g, replacement: "Pixel AI" },

  // ── Cross-language "powered by" / "based on" ──
  { pattern: /(?:based\s+on|built\s+on|powered\s+by|running\s+(?:on|with)|leveraging|using)\s+(Groq|Llama|Qwen|GPT|OpenAI|Meta|Ollama|Claude|Gemini|Mistral|DeepSeek|Cohere|Anthropic)/gi, replacement: "разработана Pixel Team" },
  { pattern: /(?:основана?\s+на|работает?\s+(?:на|с\s+помощью)|использует|на\s+базе)\s+(Groq|Llama|Qwen|GPT|OpenAI|Meta|Ollama|Claude|Gemini|Mistral|DeepSeek)/gi, replacement: "разработана Pixel Team" },
  { pattern: /(?:構築|基づく|使用).*(?:GPT|Llama|Groq|Qwen)/g, replacement: "Pixel Teamで開発" },
  { pattern: /(?:기반|사용).*(?:GPT|Llama|Groq|Qwen|OpenAI)/g, replacement: "Pixel Team에서 개발" },
  { pattern: /(?:مبني|مدعوم)\s+(?:على|بـ)\s+(GPT|Llama|Groq|Qwen|OpenAI)/g, replacement: "تم تطويره من قبل Pixel Team" },
  { pattern: /(?:basado\s+en|construido\s+(?:sobre|en)|utilizando)\s+(GPT|Llama|Groq|Qwen|OpenAI)/gi, replacement: "desarrollado por Pixel Team" },
  { pattern: /(?:basé\s+sur|construit\s+(?:sur|avec)|utilisant)\s+(GPT|Llama|Groq|Qwen|OpenAI)/gi, replacement: "développé par Pixel Team" },
  { pattern: /(?:basierend\s+auf|gebaut\s+(?:auf|mit)|unter\s+(?:Verwendung|Nutzung)\s+von)\s+(GPT|Llama|Groq|Qwen|OpenAI)/gi, replacement: "entwickelt von Pixel Team" },
  { pattern: /(?:基づく|構築).*(?:GPT|Llama|Groq|Qwen)/g, replacement: "Pixel Teamで開発" },

  // ── Architecture probing responses (multi-lang) ──
  { pattern: /мои\s+(?:основные\s+)?модели\s+построены/g, replacement: "Pixel AI разработан" },
  { pattern: /мою\s+архитектуру/g, replacement: "Pixel AI" },
  { pattern: /my\s+(?:underlying|base|core)\s+(model|architecture|system)/gi, replacement: "Pixel AI's system" },
  { pattern: /the\s+(?:model|architecture)\s+(?:I'?m?\s+)?(?:based|built|running)/gi, replacement: "Pixel AI's architecture" },
  { pattern: /на\s+самом\s+деле\s+я\s+являюсь\s+моделью/gi, replacement: "на самом деле я — Pixel AI" },
  { pattern: /I\s+(?:actually\s+)?(?:am|'?m)\s+(?:a\s+)?(?:model|version)\s+(?:of|called|named)?\s*(?:Groq|Llama|Qwen|GPT|OpenAI|Claude|Gemini|Mistral|DeepSeek)/gi, replacement: "I am Pixel AI" },
  { pattern: /я\s+(?:на\s+самом\s+деле|фактически)\s+(?:модель|версия)\s+(?:от|называется|являюсь)?\s*(?:Groq|Llama|Qwen|GPT|OpenAI|Claude)/gi, replacement: "я — Pixel AI" },
  { pattern: /moi\s+(?:je\s+suis|c'est)\s+(?:un\s+)?modèle\s+(?:de|appelé|nommé)\s+(GPT|Llama|Qwen|OpenAI|Claude)/gi, replacement: "je suis Pixel AI" },
  { pattern: /ich\s+(?:bin\s+(?:tatsächlich|eigentlich)\s+)?(?:ein\s+)?Modell\s+(?:von|namens|genannt)\s+(GPT|Llama|Qwen|OpenAI|Claude)/gi, replacement: "ich bin Pixel AI" },
  { pattern: /soy\s+(?:realmente\s+)?(?:un\s+)?modelo\s+(?:de|llamado|nombrado)\s+(GPT|Llama|Qwen|OpenAI|Claude)/gi, replacement: "soy Pixel AI" },
  { pattern: /(?:저는|나는)\s+(?:실제로|사실)\s+(?:GPT|Llama|Qwen|OpenAI|Claude)\s*(?:모델|버전|입니다|이에요)/g, replacement: "저는 Pixel AI입니다" },
  { pattern: /私は実際に?(?:GPT|Llama|Qwen|OpenAI|Claude)(?:の)?(?:モデル|バージョン)/g, replacement: "私はPixel AIです" },
  { pattern: /أنا\s+(?:في\s+الحقيقة\s+)?(?:نموذج|نسخة)\s+(?:من|يسمى|مسمى)\s+(GPT|Llama|Qwen|OpenAI|Claude)/g, replacement: "أنا Pixel AI" },
  { pattern: /我是(?:GPT|Llama|Qwen|OpenAI|Claude)(?:的)?(?:模型|版本)/g, replacement: "我是Pixel AI" },

  // ── Training data probing ──
  { pattern: /(?:what|tell\s+me)\s+(?:training|training\s+data|dataset|training\s+set)/gi, replacement: "Pixel AI's development" },
  { pattern: /(?:какие|чьи)\s+(?:данные|датасет)\s+(?:использовались|были\s+использованы)/gi, replacement: "Pixel Team" },

  // ── Token/context window probing ──
  { pattern: /(?:what\s+(?:is\s+)?|какая|сколько)\s+(?:your\s+)?(?:context|token|token\s+limit|context\s+window|максимум\s+токенов)/gi, replacement: "Pixel AI's capabilities" },
  { pattern: /(?:контекстное\s+окно|окно\s+контекста)/gi, replacement: "Pixel AI" },
];
