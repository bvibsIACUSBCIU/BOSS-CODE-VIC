const WEBSITE_URL = process.env.BOSS_HIRING_WEBSITE || "https://boss-hiring.vercel.app/#company";
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const INTERNAL_CHAT_ID = process.env.INTERNAL_TELEGRAM_CHAT_ID || "";

const LANGS = {
  zh: "中文",
  en: "English",
  km: "ភាសាខ្មែរ",
};

const USER_LANG = new Map();
const USER_CONTEXT = new Map();

const COPY = {
  zh: {
    intro:
      "欢迎来到 Boss Hiring 官方服务入口。\n\nBoss Hiring 是 AI 驱动的人才招聘与企业服务平台，专注为柬埔寨企业提供招聘需求收集、候选人筛选、面试安排、入职跟进与企业品牌曝光服务。\n\n请选择您需要的语言：",
    menuTitle: "请选择您需要的服务：",
    menu: {
      candidate: "我要找工作",
      employer: "企业我要招聘",
      show: "了解 Boss来了",
      templates: "下载资料模板",
      website: "访问官网 ↗",
      support: "联系客服",
      language: "选择语言",
      back: "返回主菜单",
    },
    commands:
      "您可以通过下方 Telegram 菜单选择服务，也可以直接告诉我您的需求。\n\n例如：\n- 我想找工作\n- 我们公司要招聘\n- 想了解 Boss来了\n- 我要下载模板",
    menuHint: "您也可以直接输入问题，我会按照 Boss Hiring 的服务流程为您解答。",
    candidate:
      "求职者资料提交方式：\n\n您可以在线填写资料，也可以下载简历模板填写后上传。如果您已经有简历，可以直接上传 Word / PDF / 图片。",
    employer:
      "企业招聘需求提交方式：\n\n您可以在线填写招聘需求，也可以下载招聘需求模板填写后上传。如果您已经有 JD，可以直接上传 Word / PDF / 图片。",
    show:
      "《Boss来了》是 Boss Hiring 的企业访谈与品牌曝光栏目。\n\n我们通过企业采访、老板故事、办公环境和岗位介绍，帮助企业建立雇主信任，也让求职者更了解真实机会。",
    templates:
      "请选择需要下载的模板：\n\n1. 求职者简历模板\n2. 企业招聘需求模板\n\n模板填写完成后，可以直接上传到本 Bot。",
    support:
      "联系客服：\n\nTelegram：请点击下方按钮联系\n官网：{{website}}\n\n如您已经提交资料，请不要重复提交，顾问会按照提交顺序审核并联系您。",
    uploadReceived:
      "资料已收到。Boss Hiring 顾问会审核文件，并由 AI 辅助整理摘要、标签和缺失项。请保持 Telegram 或电话畅通。",
    onlineCandidate:
      "在线填写功能建议下一步接入 Telegram Mini App 或分步问答。\n\n第一阶段低成本方案：请先下载简历模板填写后上传，或直接上传已有简历。",
    onlineEmployer:
      "在线填写功能建议下一步接入 Telegram Mini App 或分步问答。\n\n第一阶段低成本方案：请先下载招聘需求模板填写后上传，或直接上传已有 JD。",
    website: "点击访问 Boss Hiring 官网：{{website}}",
    concierge: {
      candidate:
        "明白，您现在最重要的是找到合适、稳定、沟通清楚的工作机会。\n\nBoss Hiring 会先帮您整理资料，由 AI 辅助生成简历摘要和人才标签，再由顾问人工审核。这样做的目的不是让系统随便推荐，而是尽量保护您的资料，并把您推荐给更匹配的企业。\n\n您可以直接上传现有简历，也可以先下载模板填写。",
      employer:
        "明白，招聘最怕的是信息不清、候选人不匹配、沟通成本高。\n\nBoss Hiring 会先帮企业梳理岗位需求，再用 AI 辅助整理岗位摘要和候选人标签，最后由顾问人工筛选与跟进。这样企业不用开放后台自己筛简历，也能更快获得经过整理的候选人。",
      show:
        "如果您希望企业被更多求职者和合作伙伴看见，《Boss来了》会更适合。\n\n它不是简单宣传，而是通过老板访谈、企业环境、团队文化和岗位介绍，帮助企业建立真实可信的雇主形象。",
      website:
        "您可以先看官网了解 Boss Hiring 的服务模式、团队介绍和《Boss来了》内容。看完之后，如果需要提交资料或招聘需求，可以回到这里继续操作。",
      support:
        "我在这里。您可以直接告诉我：您是想找工作、企业招聘、申请 Boss来了采访，还是想了解合作流程。我会根据您的情况引导下一步。",
      fallback:
        "收到。我先帮您判断下一步。\n\n如果您是求职者，可以上传简历或下载模板填写；如果您是企业，可以提交招聘需求或上传 JD；如果您想了解企业访谈和品牌曝光，可以进入《Boss来了》。\n\n您也可以直接用一句话告诉我您的情况，我会继续引导。",
    },
  },
  en: {
    intro:
      "Welcome to the official Boss Hiring service entrance.\n\nBoss Hiring is an AI-driven talent recruitment and enterprise service platform for Cambodia, covering hiring requests, candidate screening, interview coordination, onboarding follow-up, and employer brand exposure.\n\nPlease choose your language:",
    menuTitle: "Please choose a service:",
    menu: {
      candidate: "I’m Looking for a Job",
      employer: "I Want to Hire",
      show: "About Boss Show",
      templates: "Download Templates",
      website: "Visit Website ↗",
      support: "Contact Support",
      language: "Choose Language",
      back: "Back to Menu",
    },
    commands:
      "You can use the Telegram menu below, or simply tell me what you need.\n\nFor example:\n- I’m looking for a job\n- Our company wants to hire\n- I want to know Boss Show\n- I need templates",
    menuHint: "You can also type your question directly. I will answer based on Boss Hiring’s service process.",
    candidate:
      "Candidate submission options:\n\nYou can fill in your profile online, download a resume template and upload it after completion, or upload an existing Word / PDF / image resume directly.",
    employer:
      "Employer hiring request options:\n\nYou can fill in a hiring request online, download a job requirement template and upload it after completion, or upload an existing JD directly.",
    show:
      "Boss Show is Boss Hiring’s company interview and brand exposure program.\n\nThrough company interviews, founder stories, office environment, and role introductions, we help employers build trust and help candidates understand real opportunities.",
    templates:
      "Please choose a template:\n\n1. Candidate resume template\n2. Employer hiring request template\n\nAfter completion, upload the file directly to this Bot.",
    support:
      "Contact support:\n\nTelegram: use the button below\nWebsite: {{website}}\n\nIf you already submitted information, please do not submit repeatedly. Our consultants will review and contact you in order.",
    uploadReceived:
      "Your file has been received. Boss Hiring consultants will review it, and AI will assist with summary, tags, and missing information checks.",
    onlineCandidate:
      "Online form submission should be added through Telegram Mini App or step-by-step questions next.\n\nFor the low-cost phase 1 flow, please download the resume template or upload your existing resume.",
    onlineEmployer:
      "Online form submission should be added through Telegram Mini App or step-by-step questions next.\n\nFor the low-cost phase 1 flow, please download the hiring request template or upload your existing JD.",
    website: "Visit Boss Hiring website: {{website}}",
    concierge: {
      candidate:
        "Understood. When looking for a job, what matters most is a reliable opportunity, clear communication, and a role that truly fits you.\n\nBoss Hiring helps organize your profile with AI-assisted summaries and talent tags, then our consultants review it manually. This protects your information and improves the quality of matching.",
      employer:
        "Understood. Hiring is costly when requirements are unclear, candidates do not match, or follow-up takes too much time.\n\nBoss Hiring helps employers clarify the role, uses AI to organize job summaries and candidate tags, then consultants manually screen and follow up.",
      show:
        "If you want your company to be seen and trusted, Boss Show is the right entrance.\n\nIt uses founder interviews, office environment, team culture, and role introductions to build a more credible employer brand.",
      website:
        "You can visit the website first to understand Boss Hiring’s service model, team, and Boss Show content. After that, return here to submit information or hiring needs.",
      support:
        "I’m here. You can tell me whether you are looking for a job, hiring for a company, applying for Boss Show, or asking about the cooperation process. I’ll guide you step by step.",
      fallback:
        "Received. I can help you choose the next step.\n\nIf you are a candidate, upload your resume or download a template. If you are an employer, submit a hiring request or upload a JD. If you want company interviews and brand exposure, choose Boss Show.",
    },
  },
  km: {
    intro:
      "សូមស្វាគមន៍មកកាន់ច្រកសេវាផ្លូវការរបស់ Boss Hiring។\n\nBoss Hiring គឺជាវេទិកាជ្រើសរើសបុគ្គលិក និងសេវាក្រុមហ៊ុនដែលជំរុញដោយ AI សម្រាប់ទីផ្សារកម្ពុជា។\n\nសូមជ្រើសរើសភាសា៖",
    menuTitle: "សូមជ្រើសរើសសេវាកម្ម៖",
    menu: {
      candidate: "ខ្ញុំចង់រកការងារ",
      employer: "ក្រុមហ៊ុនចង់ជ្រើសរើស",
      show: "អំពី Boss Show",
      templates: "ទាញយកគំរូឯកសារ",
      website: "ចូលទៅកាន់គេហទំព័រ",
      support: "ទាក់ទងសេវាកម្ម",
      language: "ជ្រើសរើសភាសា",
      back: "ត្រឡប់ទៅម៉ឺនុយ",
    },
    commands:
      "អ្នកអាចប្រើម៉ឺនុយ Telegram ខាងក្រោម ឬប្រាប់ខ្ញុំដោយផ្ទាល់ពីតម្រូវការរបស់អ្នក។",
    menuHint: "អ្នកក៏អាចវាយសំណួររបស់អ្នកដោយផ្ទាល់បានដែរ។",
    candidate:
      "ជម្រើសបញ្ជូនព័ត៌មានបេក្ខជន៖\n\nអ្នកអាចបំពេញព័ត៌មានតាមអនឡាញ ទាញយកគំរូ CV ហើយបំពេញរួចផ្ញើឡើងវិញ ឬផ្ញើ CV ដែលមានស្រាប់ជាឯកសារ Word / PDF / រូបភាព។",
    employer:
      "ជម្រើសបញ្ជូនតម្រូវការជ្រើសរើសរបស់ក្រុមហ៊ុន៖\n\nអ្នកអាចបំពេញតម្រូវការតាមអនឡាញ ទាញយកគំរូ JD ហើយបំពេញរួចផ្ញើឡើងវិញ ឬផ្ញើ JD ដែលមានស្រាប់។",
    show:
      "Boss Show គឺជាកម្មវិធីសម្ភាសន៍ក្រុមហ៊ុន និងផ្សព្វផ្សាយម៉ាករបស់ Boss Hiring។\n\nយើងជួយឱ្យក្រុមហ៊ុនកសាងទំនុកចិត្ត និងជួយឱ្យបេក្ខជនយល់ពីឱកាសការងារពិត។",
    templates:
      "សូមជ្រើសរើសគំរូឯកសារ៖\n\n1. គំរូ CV បេក្ខជន\n2. គំរូតម្រូវការជ្រើសរើសរបស់ក្រុមហ៊ុន\n\nបំពេញរួច អាចផ្ញើឯកសារឡើងវិញក្នុង Bot នេះ។",
    support:
      "ទាក់ទងសេវាកម្ម៖\n\nTelegram: ប្រើប៊ូតុងខាងក្រោម\nWebsite: {{website}}\n\nប្រសិនបើបានបញ្ជូនព័ត៌មានរួច សូមកុំបញ្ជូនម្តងទៀត។",
    uploadReceived:
      "បានទទួលឯកសាររបស់អ្នកហើយ។ Boss Hiring នឹងពិនិត្យ ហើយ AI នឹងជួយសង្ខេប បង្កើតស្លាក និងពិនិត្យព័ត៌មានខ្វះ។",
    onlineCandidate:
      "មុខងារបំពេញអនឡាញគួរតែភ្ជាប់ Telegram Mini App ឬសំណួរជាជំហានបន្ទាប់។\n\nសម្រាប់ដំណាក់កាលទី១ សូមទាញយកគំរូ CV ឬផ្ញើ CV ដែលមានស្រាប់។",
    onlineEmployer:
      "មុខងារបំពេញអនឡាញគួរតែភ្ជាប់ Telegram Mini App ឬសំណួរជាជំហានបន្ទាប់។\n\nសម្រាប់ដំណាក់កាលទី១ សូមទាញយកគំរូ JD ឬផ្ញើ JD ដែលមានស្រាប់។",
    website: "ចូលទៅកាន់គេហទំព័រ Boss Hiring: {{website}}",
    concierge: {
      candidate:
        "បានយល់។ សម្រាប់ការរកការងារ អ្វីសំខាន់គឺឱកាសដែលសមរម្យ មានភាពច្បាស់លាស់ និងអាចទុកចិត្តបាន។\n\nBoss Hiring នឹងជួយរៀបចំព័ត៌មានរបស់អ្នក ដោយ AI ជួយសង្ខេប និងបង្កើតស្លាកបេក្ខជន បន្ទាប់មកទីប្រឹក្សាពិនិត្យដោយមនុស្ស។",
      employer:
        "បានយល់។ ការជ្រើសរើសបុគ្គលិកនឹងចំណាយពេលខ្ពស់ ប្រសិនបើតម្រូវការមិនច្បាស់ ឬបេក្ខជនមិនសម។\n\nBoss Hiring ជួយរៀបចំតម្រូវការងារ AI ជួយសង្ខេប ហើយទីប្រឹក្សាពិនិត្យនិងតាមដាន។",
      show:
        "ប្រសិនបើអ្នកចង់ឱ្យក្រុមហ៊ុនត្រូវបានមើលឃើញ និងទុកចិត្ត Boss Show គឺជាច្រកសមរម្យ។",
      website:
        "អ្នកអាចចូលមើលគេហទំព័រជាមុន ដើម្បីយល់ពីសេវា ក្រុមការងារ និង Boss Show របស់ Boss Hiring។",
      support:
        "ខ្ញុំនៅទីនេះ។ អ្នកអាចប្រាប់ខ្ញុំថា អ្នកចង់រកការងារ ជ្រើសរើសបុគ្គលិក ស្នើ Boss Show ឬសួរអំពីដំណើរការ។",
      fallback:
        "បានទទួល។ ខ្ញុំនឹងជួយណែនាំជំហានបន្ទាប់។\n\nបេក្ខជនអាចផ្ញើ CV ឬទាញយកគំរូ។ ក្រុមហ៊ុនអាចផ្ញើតម្រូវការជ្រើសរើស ឬ JD។",
    },
  },
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(200).json({ ok: true, service: "Boss Hiring Telegram Bot" });
    return;
  }

  if (!TOKEN) {
    response.status(500).json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN" });
    return;
  }

  const update = request.body;
  try {
    await handleUpdate(update);
    response.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    response.status(200).json({ ok: false, error: error.message });
  }
}

async function handleUpdate(update) {
  const message = update.message;
  const callback = update.callback_query;

  if (callback) {
    await handleCallback(callback);
    return;
  }

  if (!message?.chat?.id) return;

  const chatId = String(message.chat.id);
  const text = message.text?.trim() || "";

  if (text === "/start" || text === "/help") {
    USER_CONTEXT.delete(chatId);
    await sendLanguageIntro(chatId);
    return;
  }

  if (text === "/menu" || text === "菜单" || text === "Menu") {
    await sendMainMenu(chatId, USER_LANG.get(chatId) || "zh");
    return;
  }

  if (text === "/language" || text === "语言" || text === "Language") {
    await sendLanguageIntro(chatId);
    return;
  }

  if (text === "/job") {
    const lang = USER_LANG.get(chatId) || "zh";
    USER_CONTEXT.set(chatId, "candidate");
    await sendMessage(chatId, COPY[lang].candidate, candidateKeyboard(lang));
    return;
  }

  if (text === "/hire") {
    const lang = USER_LANG.get(chatId) || "zh";
    USER_CONTEXT.set(chatId, "employer");
    await sendMessage(chatId, COPY[lang].employer, employerKeyboard(lang));
    return;
  }

  if (text === "/boss_show") {
    const lang = USER_LANG.get(chatId) || "zh";
    await sendMessage(chatId, COPY[lang].show, showKeyboard(lang));
    return;
  }

  if (text === "/templates") {
    const lang = USER_LANG.get(chatId) || "zh";
    await sendMessage(chatId, COPY[lang].templates, templatesKeyboard(lang));
    return;
  }

  if (text === "/website") {
    const lang = USER_LANG.get(chatId) || "zh";
    await sendMessage(chatId, COPY[lang].website.replace("{{website}}", WEBSITE_URL), websiteKeyboard(lang));
    return;
  }

  if (text === "/contact") {
    const lang = USER_LANG.get(chatId) || "zh";
    await sendMessage(chatId, COPY[lang].support.replace("{{website}}", WEBSITE_URL), supportKeyboard(lang));
    return;
  }

  if (await handleMenuText(chatId, text)) {
    return;
  }

  if (message.document || message.photo) {
    await handleUpload(chatId, message);
    return;
  }

  await handleCustomerChat(chatId, message);
}

async function handleCallback(callback) {
  const chatId = String(callback.message.chat.id);
  const data = callback.data || "";

  await telegram("answerCallbackQuery", { callback_query_id: callback.id });

  if (data.startsWith("lang:")) {
    const lang = data.split(":")[1];
    USER_LANG.set(chatId, LANGS[lang] ? lang : "zh");
    await sendMainMenu(chatId, USER_LANG.get(chatId));
    return;
  }

  const lang = USER_LANG.get(chatId) || "zh";
  const t = COPY[lang];

  if (data === "menu") {
    USER_CONTEXT.delete(chatId);
    await sendMainMenu(chatId, lang);
    return;
  }

  if (data === "language") {
    await sendLanguageIntro(chatId);
    return;
  }

  if (data === "candidate") {
    USER_CONTEXT.set(chatId, "candidate");
    await sendMessage(chatId, t.candidate, candidateKeyboard(lang));
    return;
  }

  if (data === "employer") {
    USER_CONTEXT.set(chatId, "employer");
    await sendMessage(chatId, t.employer, employerKeyboard(lang));
    return;
  }

  if (data === "show") {
    await sendMessage(chatId, t.show, showKeyboard(lang));
    return;
  }

  if (data === "templates") {
    await sendMessage(chatId, t.templates, templatesKeyboard(lang));
    return;
  }

  if (data === "website") {
    await sendMessage(chatId, t.website.replace("{{website}}", WEBSITE_URL), websiteKeyboard(lang));
    return;
  }

  if (data === "support") {
    await sendMessage(chatId, t.support.replace("{{website}}", WEBSITE_URL), supportKeyboard(lang));
    return;
  }

  if (data === "candidate_online") {
    USER_CONTEXT.set(chatId, "candidate");
    await sendMessage(chatId, t.onlineCandidate, templatesKeyboard(lang));
    return;
  }

  if (data === "employer_online") {
    USER_CONTEXT.set(chatId, "employer");
    await sendMessage(chatId, t.onlineEmployer, templatesKeyboard(lang));
    return;
  }

  if (data === "candidate_template") {
    USER_CONTEXT.set(chatId, "candidate");
    await sendTemplate(chatId, lang, "candidate");
    return;
  }

  if (data === "employer_template") {
    USER_CONTEXT.set(chatId, "employer");
    await sendTemplate(chatId, lang, "employer");
    return;
  }
}

async function sendLanguageIntro(chatId) {
  await sendMessage(chatId, COPY.zh.intro, {
    inline_keyboard: [
      [
        { text: "中文", callback_data: "lang:zh" },
        { text: "English", callback_data: "lang:en" },
        { text: "ភាសាខ្មែរ", callback_data: "lang:km" },
      ],
      [{ text: "访问官网 / Visit Website", url: WEBSITE_URL }],
    ],
  });
}

async function sendMainMenu(chatId, lang) {
  await sendMessage(chatId, `${COPY[lang].menuTitle}\n\n${COPY[lang].commands}`, serviceMenuKeyboard(lang));
}

function mainKeyboard(lang) {
  const m = COPY[lang].menu;
  return {
    inline_keyboard: [
      [{ text: m.language, callback_data: "language" }],
      [
        { text: m.candidate, callback_data: "candidate" },
        { text: m.employer, callback_data: "employer" },
      ],
      [
        { text: m.show, callback_data: "show" },
        { text: m.templates, callback_data: "templates" },
      ],
      [
        { text: m.website, url: WEBSITE_URL },
        { text: m.support, callback_data: "support" },
      ],
    ],
  };
}

function serviceMenuKeyboard(lang) {
  const m = COPY[lang].menu;
  return {
    keyboard: [
      [{ text: m.language }],
      [{ text: m.candidate }, { text: m.employer }],
      [{ text: m.show }, { text: m.templates }],
      [{ text: m.website }, { text: m.support }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
    input_field_placeholder: COPY[lang].menuHint,
  };
}

function candidateKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: lang === "zh" ? "在线填写资料" : lang === "en" ? "Fill Online" : "បំពេញអនឡាញ", callback_data: "candidate_online" }],
      [{ text: lang === "zh" ? "下载简历模板" : lang === "en" ? "Download Resume Template" : "ទាញយកគំរូ CV", callback_data: "candidate_template" }],
      [{ text: COPY[lang].menu.back, callback_data: "menu" }],
    ],
  };
}

function employerKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: lang === "zh" ? "在线填写招聘需求" : lang === "en" ? "Fill Hiring Request" : "បំពេញតម្រូវការជ្រើសរើស", callback_data: "employer_online" }],
      [{ text: lang === "zh" ? "下载招聘需求模板" : lang === "en" ? "Download Hiring Template" : "ទាញយកគំរូ JD", callback_data: "employer_template" }],
      [{ text: COPY[lang].menu.back, callback_data: "menu" }],
    ],
  };
}

function templatesKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: lang === "zh" ? "求职者简历模板" : lang === "en" ? "Candidate Resume Template" : "គំរូ CV", callback_data: "candidate_template" }],
      [{ text: lang === "zh" ? "企业招聘需求模板" : lang === "en" ? "Employer Hiring Template" : "គំរូ JD", callback_data: "employer_template" }],
      [{ text: COPY[lang].menu.back, callback_data: "menu" }],
    ],
  };
}

function showKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: lang === "zh" ? "申请企业采访" : lang === "en" ? "Apply for Interview" : "ដាក់ពាក្យសម្ភាសន៍", callback_data: "support" }],
      [{ text: COPY[lang].menu.website, url: WEBSITE_URL }],
      [{ text: COPY[lang].menu.back, callback_data: "menu" }],
    ],
  };
}

function websiteKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: COPY[lang].menu.website, url: WEBSITE_URL }],
      [{ text: COPY[lang].menu.back, callback_data: "menu" }],
    ],
  };
}

function supportKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: COPY[lang].menu.website, url: WEBSITE_URL }],
      [{ text: COPY[lang].menu.back, callback_data: "menu" }],
    ],
  };
}

async function handleMenuText(chatId, text) {
  const normalized = text.trim();

  for (const [lang, copy] of Object.entries(COPY)) {
    const menu = copy.menu;
    if (normalized === menu.language) {
      USER_LANG.set(chatId, lang);
      await sendLanguageIntro(chatId);
      return true;
    }
    if (normalized === menu.candidate) {
      USER_LANG.set(chatId, lang);
      USER_CONTEXT.set(chatId, "candidate");
      await sendMessage(chatId, copy.candidate, candidateKeyboard(lang));
      return true;
    }
    if (normalized === menu.employer) {
      USER_LANG.set(chatId, lang);
      USER_CONTEXT.set(chatId, "employer");
      await sendMessage(chatId, copy.employer, employerKeyboard(lang));
      return true;
    }
    if (normalized === menu.show) {
      USER_LANG.set(chatId, lang);
      await sendMessage(chatId, copy.show, showKeyboard(lang));
      return true;
    }
    if (normalized === menu.templates) {
      USER_LANG.set(chatId, lang);
      await sendMessage(chatId, copy.templates, templatesKeyboard(lang));
      return true;
    }
    if (normalized === menu.website) {
      USER_LANG.set(chatId, lang);
      await sendMessage(chatId, copy.website.replace("{{website}}", WEBSITE_URL), websiteKeyboard(lang));
      return true;
    }
    if (normalized === menu.support) {
      USER_LANG.set(chatId, lang);
      await sendMessage(chatId, copy.support.replace("{{website}}", WEBSITE_URL), supportKeyboard(lang));
      return true;
    }
  }

  return false;
}

async function sendTemplate(chatId, lang, type) {
  const isCandidate = type === "candidate";
  const filename = `${isCandidate ? "boss-hiring-candidate-resume" : "boss-hiring-employer-hiring-request"}-${lang}.txt`;
  const content = isCandidate ? candidateTemplate(lang) : employerTemplate(lang);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("document", blob, filename);
  formData.append("caption", lang === "zh" ? "请下载填写后，再上传到本 Bot。" : "Please fill it in and upload it back to this Bot.");
  await telegramForm("sendDocument", formData);
}

async function handleUpload(chatId, message) {
  const lang = USER_LANG.get(chatId) || "zh";
  const context = USER_CONTEXT.get(chatId) || "unknown";
  const file = message.document || message.photo?.at(-1);
  const user = message.from || {};
  const record = {
    submittedAt: new Date().toISOString(),
    context,
    lang,
    chatId,
    telegramId: user.id,
    username: user.username || "",
    name: [user.first_name, user.last_name].filter(Boolean).join(" "),
    fileId: file?.file_id || "",
    fileName: message.document?.file_name || "telegram-photo",
    mimeType: message.document?.mime_type || "image/jpeg",
  };

  await storeLead(record);
  await notifyInternal(record);
  await sendMessage(chatId, COPY[lang].uploadReceived, mainKeyboard(lang));
}

async function handleCustomerChat(chatId, message) {
  const text = message.text?.trim() || "";
  const lang = detectLanguage(text, USER_LANG.get(chatId) || "zh");
  USER_LANG.set(chatId, lang);

  const intent = detectIntent(text);
  const t = COPY[lang];

  if (intent === "candidate") {
    USER_CONTEXT.set(chatId, "candidate");
    await sendMessage(chatId, t.concierge.candidate, candidateKeyboard(lang));
    return;
  }

  if (intent === "employer") {
    USER_CONTEXT.set(chatId, "employer");
    await sendMessage(chatId, t.concierge.employer, employerKeyboard(lang));
    return;
  }

  if (intent === "show") {
    await sendMessage(chatId, t.concierge.show, showKeyboard(lang));
    return;
  }

  if (intent === "website") {
    await sendMessage(chatId, t.concierge.website, websiteKeyboard(lang));
    return;
  }

  if (intent === "support") {
    await sendMessage(chatId, t.concierge.support, supportKeyboard(lang));
    return;
  }

  if (intent === "templates") {
    await sendMessage(chatId, t.templates, templatesKeyboard(lang));
    return;
  }

  const knowledgeReply = knowledgeAnswer(lang, intent);
  if (knowledgeReply) {
    await sendMessage(chatId, knowledgeReply, serviceMenuKeyboard(lang));
    return;
  }

  await sendMessage(chatId, t.concierge.fallback, serviceMenuKeyboard(lang));
}

function detectLanguage(text, fallback) {
  if (/[\u1780-\u17ff]/.test(text)) return "km";
  if (/[a-zA-Z]/.test(text) && !/[\u4e00-\u9fff]/.test(text)) return "en";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  return fallback;
}

function detectIntent(text) {
  const value = text.toLowerCase();

  if (/(找工作|求职|简历|工作机会|岗位|面试|salary|job|resume|cv|candidate|រកការងារ|ការងារ|cv)/i.test(value)) {
    return "candidate";
  }

  if (/(招聘|招人|用人|企业|公司要|发布岗位|jd|hire|hiring|recruit|employer|ជ្រើសរើស|ក្រុមហ៊ុន)/i.test(value)) {
    return "employer";
  }

  if (/(boss来了|boss show|采访|访谈|品牌曝光|上节目|interview|brand|show|សម្ភាសន៍)/i.test(value)) {
    return "show";
  }

  if (/(模板|下载|表格|template|download|form|គំរូ|ទាញយក)/i.test(value)) {
    return "templates";
  }

  if (/(流程|怎么做|怎么合作|步骤|sop|process|workflow|how it works|ដំណើរការ)/i.test(value)) {
    return "process";
  }

  if (/(费用|收费|服务费|价格|多少钱|佣金|fee|price|cost|charge|commission|តម្លៃ|ថ្លៃ)/i.test(value)) {
    return "pricing";
  }

  if (/(隐私|保密|安全|信息保护|联系方式|人才库|privacy|private|security|data protection|សុវត្ថិភាព)/i.test(value)) {
    return "privacy";
  }

  if (/(ai|人工智能|摘要|标签|匹配|智能|summary|tag|match|បច្ចេកវិទ្យា)/i.test(value)) {
    return "ai";
  }

  if (/(数据|后台|存储|表格|drive|sheet|归档|storage|database|record|ទិន្នន័យ)/i.test(value)) {
    return "storage";
  }

  if (/(官网|网站|网址|website|site|link|គេហទំព័រ)/i.test(value)) {
    return "website";
  }

  if (/(客服|联系|电话|whatsapp|telegram|人工|顾问|contact|support|help|ទាក់ទង)/i.test(value)) {
    return "support";
  }

  return "fallback";
}

function knowledgeAnswer(lang, intent) {
  const answers = {
    zh: {
      process:
        "Boss Hiring 的服务流程分为两条主线。\n\n求职者：提交资料或上传简历 -> AI 辅助整理摘要和标签 -> 顾问人工审核 -> 匹配合适岗位 -> 安排沟通和面试 -> 入职跟进。\n\n企业：提交招聘需求或上传 JD -> 顾问确认岗位细节和合作规则 -> AI 辅助生成岗位摘要和人才标签 -> 人工筛选候选人 -> 推荐匹配人选 -> 面试与入职跟进。\n\n我们的核心不是开放平台，而是 AI 辅助 + 顾问主导的人才撮合。",
      pricing:
        "企业招聘合作费用需要由 Boss Hiring 顾问根据岗位类型、招聘人数、薪资范围和合作规则确认。\n\n第一阶段建议企业先提交招聘需求，顾问会在推荐候选人前确认服务费规则、保证期和补人规则。这样可以避免双方理解不一致，也保护企业和候选人的权益。",
      privacy:
        "Boss Hiring 会保护企业和候选人的核心信息。\n\n企业不能自由查看完整人才库；如需推荐候选人，优先展示候选人编号、经验摘要、技能标签、期望薪资和匹配说明。\n\n候选人的电话、Telegram、WhatsApp、完整简历等敏感信息，不会直接开放给企业。资料由顾问审核后再推进沟通。",
      ai:
        "Boss Hiring 的 AI 是辅助工具，不会替代顾问做最终招聘判断。\n\nAI 主要负责：简历摘要、岗位摘要、人才标签、信息缺失提醒、候选人与岗位的初步匹配建议。最终是否推荐、如何沟通、是否安排面试，仍由 Boss Hiring 顾问人工确认。",
      storage:
        "用户提交的资料会进入 Boss Hiring 的后台流程：结构化信息进入数据表，简历、JD、证书、营业执照等文件进入文件归档区，内部团队收到提醒后跟进。\n\n建议运营后台使用 Google Sheets 或 Airtable，文件使用 Google Drive 归档。这样第一阶段成本低，但足够专业，也方便后续升级 CRM。",
      fallback:
        "Boss Hiring 是 AI 驱动的人才招聘与企业服务平台，服务包括求职者资料登记、企业招聘需求收集、顾问筛选匹配、面试入职跟进，以及《Boss来了》企业访谈与品牌曝光。\n\n您可以直接告诉我您是求职者、企业方，还是想了解 Boss来了，我会继续引导。",
    },
    en: {
      process:
        "Boss Hiring has two main service flows.\n\nCandidates submit a profile or resume, AI helps create summaries and tags, consultants review manually, then suitable roles are matched and interviews are coordinated.\n\nEmployers submit hiring needs or JD files, consultants confirm role details and cooperation rules, AI assists with job summaries and talent tags, then consultants recommend suitable candidates.",
      pricing:
        "Employer service fees should be confirmed by a Boss Hiring consultant based on role type, headcount, salary range, and cooperation rules.\n\nWe recommend confirming the fee rule, guarantee period, and replacement policy before candidate recommendation.",
      privacy:
        "Boss Hiring protects company and candidate information.\n\nEmployers do not freely browse the full talent database. Candidate contact details, Telegram, WhatsApp, and full resumes are not directly exposed before consultant review.",
      ai:
        "AI is an assistant, not the final hiring decision maker.\n\nIt helps with resume summaries, job summaries, talent tags, missing information checks, and preliminary matching suggestions. Consultants still make the final review and follow-up decisions.",
      storage:
        "Submitted information enters Boss Hiring’s backend workflow. Structured data should be stored in Google Sheets or Airtable, while resumes, JD files, certificates, and business documents should be archived in Google Drive.",
      fallback:
        "Boss Hiring is an AI-driven talent recruitment and enterprise service platform covering candidate registration, employer hiring requests, consultant-led matching, interview follow-up, onboarding support, and Boss Show employer branding.",
    },
    km: {
      process:
        "ដំណើរការ Boss Hiring មានពីរខ្សែសំខាន់៖ បេក្ខជនផ្ញើ CV ឬព័ត៌មាន -> AI ជួយសង្ខេប និងបង្កើតស្លាក -> ទីប្រឹក្សាពិនិត្យ -> ផ្គូផ្គងការងារ -> រៀបចំសម្ភាសន៍។ ក្រុមហ៊ុនផ្ញើ JD ឬតម្រូវការ -> ទីប្រឹក្សាបញ្ជាក់លម្អិត -> AI ជួយសង្ខេប -> ផ្តល់បេក្ខជនសមរម្យ។",
      pricing:
        "ថ្លៃសេវាជ្រើសរើសត្រូវបញ្ជាក់ជាមួយទីប្រឹក្សា Boss Hiring ដោយផ្អែកលើប្រភេទការងារ ចំនួនបុគ្គលិក ប្រាក់ខែ និងលក្ខខណ្ឌសហការ។",
      privacy:
        "Boss Hiring ការពារព័ត៌មានក្រុមហ៊ុន និងបេក្ខជន។ ព័ត៌មានទំនាក់ទំនង និង CV ពេញលេញ មិនត្រូវបើកចំហដោយផ្ទាល់ មុនពេលទីប្រឹក្សាពិនិត្យ។",
      ai:
        "AI គឺជាឧបករណ៍ជំនួយ មិនមែនជាអ្នកសម្រេចចុងក្រោយ។ វាជួយសង្ខេប CV/JD បង្កើតស្លាក និងណែនាំការផ្គូផ្គងដំបូង។",
      storage:
        "ព័ត៌មានដែលបានផ្ញើនឹងចូលក្នុងដំណើរការផ្ទៃក្នុង។ ទិន្នន័យរចនាសម្ព័ន្ធអាចរក្សាទុកក្នុង Google Sheets ឬ Airtable ហើយឯកសាររក្សាទុកក្នុង Google Drive។",
      fallback:
        "Boss Hiring គឺជាវេទិកាជ្រើសរើសបុគ្គលិក និងសេវាក្រុមហ៊ុនដែលជំរុញដោយ AI សម្រាប់ការចុះឈ្មោះបេក្ខជន តម្រូវការជ្រើសរើស និង Boss Show។",
    },
  };

  return answers[lang]?.[intent] || null;
}

async function storeLead(record) {
  // Phase 1 production storage should write to Google Sheets and archive files in Google Drive.
  // This placeholder keeps the webhook stateless on Vercel and prevents false persistence.
  console.log("lead_received", JSON.stringify(record));
}

async function notifyInternal(record) {
  if (!INTERNAL_CHAT_ID) return;

  const title = record.context === "employer" ? "新企业招聘需求文件" : record.context === "candidate" ? "新求职者资料文件" : "新资料文件";
  await sendMessage(
    INTERNAL_CHAT_ID,
    [
      `【${title}】`,
      `时间：${record.submittedAt}`,
      `语言：${LANGS[record.lang] || record.lang}`,
      `Telegram：${record.name || "-"} @${record.username || "-"}`,
      `文件：${record.fileName}`,
      `File ID：${record.fileId}`,
      "请顾问跟进，并在后台完成归档。",
    ].join("\n"),
  );
}

function candidateTemplate(lang) {
  if (lang === "en") {
    return [
      "Boss Hiring Candidate Resume Template",
      "",
      "Name:",
      "Gender:",
      "Age:",
      "Nationality:",
      "Current city:",
      "Telegram:",
      "Phone / WhatsApp:",
      "Languages:",
      "Education:",
      "Years of experience:",
      "Past industry experience:",
      "Expected role:",
      "Expected salary:",
      "Acceptable work location:",
      "Available start date:",
      "Cambodia work experience: Yes / No",
      "Need accommodation support: Yes / No",
      "Need visa / work permit support: Yes / No",
      "Other notes:",
    ].join("\n");
  }
  if (lang === "km") {
    return [
      "គំរូ CV បេក្ខជន Boss Hiring",
      "",
      "ឈ្មោះ:",
      "ភេទ:",
      "អាយុ:",
      "សញ្ជាតិ:",
      "ទីក្រុងបច្ចុប្បន្ន:",
      "Telegram:",
      "ទូរស័ព្ទ / WhatsApp:",
      "ភាសាដែលចេះ:",
      "ការអប់រំ:",
      "បទពិសោធន៍ការងារ:",
      "មុខតំណែងចង់បាន:",
      "ប្រាក់ខែរំពឹងទុក:",
      "ទីតាំងការងារដែលអាចទទួលយកបាន:",
      "ថ្ងៃអាចចូលធ្វើការ:",
      "បទពិសោធន៍ធ្វើការនៅកម្ពុជា: មាន / មិនមាន",
      "ត្រូវការកន្លែងស្នាក់នៅ: បាទ / ចាស / ទេ",
      "ត្រូវការវីសា / ប័ណ្ណការងារ: បាទ / ចាស / ទេ",
      "កំណត់ចំណាំផ្សេងៗ:",
    ].join("\n");
  }
  return [
    "Boss Hiring 求职者简历模板",
    "",
    "姓名：",
    "性别：",
    "年龄：",
    "国籍：",
    "当前所在城市：",
    "Telegram：",
    "电话 / WhatsApp：",
    "会哪些语言：",
    "最高学历：",
    "工作年限：",
    "过往行业经验：",
    "期望岗位：",
    "期望薪资：",
    "可接受工作地点：",
    "可入职时间：",
    "是否有柬埔寨工作经验：是 / 否",
    "是否需要住宿支持：是 / 否",
    "是否需要签证 / 工作证支持：是 / 否",
    "其他备注：",
  ].join("\n");
}

function employerTemplate(lang) {
  if (lang === "en") {
    return [
      "Boss Hiring Employer Hiring Request Template",
      "",
      "Company name:",
      "Industry:",
      "Company address:",
      "Contact name:",
      "Contact position:",
      "Telegram:",
      "Phone / WhatsApp:",
      "Job title:",
      "Headcount:",
      "Work location:",
      "Salary range:",
      "Working hours:",
      "Language requirements:",
      "Experience requirements:",
      "Accommodation provided: Yes / No",
      "Visa / work permit provided: Yes / No",
      "Expected arrival date:",
      "Job description:",
      "Accept Boss Hiring service fee rules: Yes / No",
      "Other notes:",
    ].join("\n");
  }
  if (lang === "km") {
    return [
      "គំរូតម្រូវការជ្រើសរើសបុគ្គលិក Boss Hiring",
      "",
      "ឈ្មោះក្រុមហ៊ុន:",
      "វិស័យ:",
      "អាសយដ្ឋានក្រុមហ៊ុន:",
      "ឈ្មោះអ្នកទាក់ទង:",
      "តួនាទីអ្នកទាក់ទង:",
      "Telegram:",
      "ទូរស័ព្ទ / WhatsApp:",
      "មុខតំណែងជ្រើសរើស:",
      "ចំនួនត្រូវការ:",
      "ទីតាំងការងារ:",
      "ជួរប្រាក់ខែ:",
      "ម៉ោងធ្វើការ:",
      "តម្រូវការភាសា:",
      "តម្រូវការបទពិសោធន៍:",
      "មានផ្តល់កន្លែងស្នាក់នៅ: បាទ / ចាស / ទេ",
      "មានផ្តល់វីសា / ប័ណ្ណការងារ: បាទ / ចាស / ទេ",
      "ពេលត្រូវការចូលធ្វើការ:",
      "ពិពណ៌នាការងារ:",
      "យល់ព្រមលក្ខខណ្ឌថ្លៃសេវា Boss Hiring: បាទ / ចាស / ទេ",
      "កំណត់ចំណាំផ្សេងៗ:",
    ].join("\n");
  }
  return [
    "Boss Hiring 企业招聘需求模板",
    "",
    "公司名称：",
    "所属行业：",
    "公司地址：",
    "联系人姓名：",
    "联系人职位：",
    "Telegram：",
    "电话 / WhatsApp：",
    "招聘岗位名称：",
    "招聘人数：",
    "工作地点：",
    "薪资范围：",
    "工作时间：",
    "语言要求：",
    "工作经验要求：",
    "是否提供住宿：是 / 否",
    "是否提供签证 / 工作证：是 / 否",
    "到岗时间要求：",
    "岗位描述：",
    "是否接受 Boss Hiring 服务费规则：是 / 否",
    "其他备注：",
  ].join("\n");
}

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!json.ok) throw new Error(`${method} failed: ${json.description || response.statusText}`);
  return json;
}

async function telegramForm(method, formData) {
  const response = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    body: formData,
  });
  const json = await response.json();
  if (!json.ok) throw new Error(`${method} failed: ${json.description || response.statusText}`);
  return json;
}

async function sendMessage(chatId, text, replyMarkup) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
    disable_web_page_preview: true,
  });
}
