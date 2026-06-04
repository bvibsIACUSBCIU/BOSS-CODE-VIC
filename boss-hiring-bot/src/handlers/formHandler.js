import { AirtableClient } from '../storage/airtableClient.js';
import { generateRecordId } from '../storage/recordIdGenerator.js';
import { analyzeResume, analyzeJob } from '../ai/summarizer.js';
import { matchCandidateToJobs, matchJobToCandidates } from '../ai/matcher.js';

const airtableClient = new AirtableClient();

// In-memory user form filling state map
const USER_STATES = new Map();

// Simplified options mapping for multiple choice buttons
const BUTTON_LABELS = {
  zh: { cancel: '取消填写', confirm: '确认提交', restart: '重新填写' },
  en: { cancel: 'Cancel', confirm: 'Confirm Submit', restart: 'Restart' },
  km: { cancel: 'បោះបង់', confirm: 'យល់ព្រមបញ្ជូន', restart: 'បំពេញឡើងវិញ' }
};

// Candidate Questionnaire Fields & Localized Prompts
const CANDIDATE_QUESTIONS = [
  {
    field: 'name',
    prompts: {
      zh: '请输入您的姓名：',
      en: 'Please enter your name:',
      km: 'សូមបញ្ចូលឈ្មោះរបស់អ្នក៖'
    }
  },
  {
    field: 'gender',
    prompts: {
      zh: '请选择您的性别：',
      en: 'Please select your gender:',
      km: 'សូមជ្រើសរើសភេទរបស់អ្នក៖'
    },
    options: [
      { text: { zh: '男', en: 'Male', km: 'ប្រុស' }, val: '男' },
      { text: { zh: '女', en: 'Female', km: 'ស្រី' }, val: '女' }
    ]
  },
  {
    field: 'age',
    prompts: {
      zh: '请输入您的年龄（例如: 25）：',
      en: 'Please enter your age (e.g., 25):',
      km: 'សូមបញ្ចូលអាយុរបស់អ្នក (ឧទាហរណ៍៖ ២៥)៖'
    }
  },
  {
    field: 'nationality',
    prompts: {
      zh: '请输入您的国籍（例如: 柬埔寨, 中国）：',
      en: 'Please enter your nationality (e.g., Cambodia, China):',
      km: 'សូមបញ្ចូលសញ្ជាតិរបស់អ្នក (ឧទាហរណ៍៖ កម្ពុជា, ចិន)៖'
    }
  },
  {
    field: 'currentCity',
    prompts: {
      zh: '请输入您当前所在的城市（例如: 金边）：',
      en: 'Please enter your current city (e.g., Phnom Penh):',
      km: 'សូមបញ្ចូលទីក្រុងបច្ចុប្បន្នរបស់អ្នក (ឧទាហរណ៍៖ ភ្នំពេញ)៖'
    }
  },
  {
    field: 'telegramContact',
    prompts: {
      zh: '请输入您的 Telegram 联系方式（例如: @username）：',
      en: 'Please enter your Telegram handle (e.g., @username):',
      km: 'សូមបញ្ចូលគណនី Telegram របស់អ្នក (ឧទាហរណ៍៖ @username)៖'
    }
  },
  {
    field: 'phoneWhatsApp',
    prompts: {
      zh: '请输入您的联系电话 / WhatsApp：',
      en: 'Please enter your Phone / WhatsApp number:',
      km: 'សូមបញ្ចូលលេខទូរស័ព្ទ / WhatsApp របស់អ្នក៖'
    }
  },
  {
    field: 'languages',
    prompts: {
      zh: '您会哪些语言（例如: 中文, 英文, 柬文）：',
      en: 'Which languages do you speak? (e.g., Chinese, English, Khmer):',
      km: 'តើអ្នកអាចនិយាយភាសាអ្វីខ្លះ? (ឧទាហរណ៍៖ ចិន, អង់គ្លេស, ខ្មែរ)៖'
    }
  },
  {
    field: 'education',
    prompts: {
      zh: '请选择您的最高学历：',
      en: 'Please select your highest education level:',
      km: 'សូមជ្រើសរើសកម្រិតវប្បធម៌ខ្ពស់បំផុតរបស់អ្នក៖'
    },
    options: [
      { text: { zh: '高中及以下', en: 'High School or below', km: 'មធ្យមសិក្សាឬទាបជាង' }, val: '高中及以下' },
      { text: { zh: '专科/大专', en: 'Associate Degree', km: 'បរិញ្ញាបត្ររង' }, val: '专科' },
      { text: { zh: '本科', en: 'Bachelor\'s Degree', km: 'បរិញ្ញាបត្រ' }, val: '本科' },
      { text: { zh: '硕士及以上', en: 'Master\'s / PhD', km: 'អនុបណ្ឌិតឬខ្ពស់ជាង' }, val: '硕士及以上' }
    ]
  },
  {
    field: 'experienceYears',
    prompts: {
      zh: '请输入您的工作年限（例如: 1年, 3-5年, 无经验）：',
      en: 'Please enter your years of experience (e.g., 1 year, 3-5 years, No experience):',
      km: 'សូមបញ្ចូលឆ្នាំពិសោធន៍ការងាររបស់អ្នក (ឧទាហរណ៍៖ ១ឆ្នាំ, ៣-៥ឆ្នាំ, គ្មានពិសោធន៍)៖'
    }
  },
  {
    field: 'pastExperience',
    prompts: {
      zh: '请输入您的过往行业经验：',
      en: 'Please enter your past industry experience:',
      km: 'សូមបញ្ចូលបទពិសោធន៍វិស័យការងារពីមុនរបស់អ្នក៖'
    }
  },
  {
    field: 'expectedRole',
    prompts: {
      zh: '请输入您期望的岗位（例如: 翻译, 行政, 销售）：',
      en: 'Please enter your expected job role (e.g., Translator, Admin, Sales):',
      km: 'សូមបញ្ចូលតួនាទីរំពឹងទុក (ឧទាហរណ៍៖ អ្នកបកប្រែ, រដ្ឋបាល, លក់)៖'
    }
  },
  {
    field: 'expectedSalary',
    prompts: {
      zh: '请输入您的期望月薪（例如: 1000$）：',
      en: 'Please enter your expected monthly salary (e.g., 1000$):',
      km: 'សូមបញ្ចូលប្រាក់ខែរំពឹងទុក (ឧទាហរណ៍៖ ១០០០$)៖'
    }
  },
  {
    field: 'acceptableLocation',
    prompts: {
      zh: '请输入可接受的工作地点（例如: 金边, 西港）：',
      en: 'Please enter your preferred work location (e.g., Phnom Penh, Sihanoukville):',
      km: 'សូមបញ្ចូលទីតាំងការងារដែលអាចទទួលយកបាន (ឧទាហរណ៍៖ ភ្នំពេញ, ព្រះសីហនុ)៖'
    }
  },
  {
    field: 'availableStartDate',
    prompts: {
      zh: '请输入您的最快可入职时间（例如: 随时, 1周内）：',
      en: 'Please enter your earliest available start date (e.g., Immediately, within 1 week):',
      km: 'សូមបញ្ចូលកាលបរិច្ឆេទអាចចូលធ្វើការបានឆាប់បំផុត (ឧទាករណ៍៖ ភ្លាមៗ, ក្នុងរយៈពេល ១សប្តាហ៍)៖'
    }
  },
  {
    field: 'cambodiaWorkExperience',
    prompts: {
      zh: '您是否有柬埔寨工作经验：',
      en: 'Do you have work experience in Cambodia?',
      km: 'តើអ្នកមានបទពិសោធន៍ការងារនៅប្រទេសកម្ពុជាទេ?៖'
    },
    options: [
      { text: { zh: '是', en: 'Yes', km: 'បាទ/ចាស' }, val: '是' },
      { text: { zh: '否', en: 'No', km: 'ទេ' }, val: '否' }
    ]
  },
  {
    field: 'accommodationSupport',
    prompts: {
      zh: '您是否需要住宿支持：',
      en: 'Do you require accommodation support?',
      km: 'តើអ្នកត្រូវការជំនួយផ្នែកកន្លែងស្នាក់នៅទេ?៖'
    },
    options: [
      { text: { zh: '是', en: 'Yes', km: 'បាទ/ចាស' }, val: '是' },
      { text: { zh: '否', en: 'No', km: 'ទេ' }, val: '否' }
    ]
  },
  {
    field: 'visaSupport',
    prompts: {
      zh: '您是否需要签证 / 工作证支持：',
      en: 'Do you require visa / work permit support?',
      km: 'តើអ្នកត្រូវការជំនួយផ្នែកទិដ្ឋាការ / លិខិតអនុញ្ញាតការងារទេ?៖'
    },
    options: [
      { text: { zh: '是', en: 'Yes', km: 'បាទ/ចាស' }, val: '是' },
      { text: { zh: '否', en: 'No', km: 'ទេ' }, val: '否' }
    ]
  },
  {
    field: 'otherNotes',
    prompts: {
      zh: '请输入其他备注（如无，请输入“无”）：',
      en: 'Please enter other notes (if none, enter "None"):',
      km: 'សូមបញ្ចូលព័ត៌មានបន្ថែមផ្សេងៗ (បើគ្មានទេ សូមបញ្ចូល "គ្មាន")៖'
    }
  }
];

// Employer Questionnaire Fields & Localized Prompts
const EMPLOYER_QUESTIONS = [
  {
    field: 'companyName',
    prompts: {
      zh: '请输入您的公司名称：',
      en: 'Please enter your company name:',
      km: 'សូមបញ្ចូលឈ្មោះក្រុមហ៊ុនរបស់អ្នក៖'
    }
  },
  {
    field: 'industry',
    prompts: {
      zh: '请输入公司所属行业（例如: 科技 IT, 餐饮, 房地产）：',
      en: 'Please enter the company industry (e.g., IT, Catering, Real Estate):',
      km: 'សូមបញ្ចូលវិស័យការងាររបស់ក្រុមហ៊ុន (ឧទាហរណ៍៖ បច្ចេកវិទ្យា, ភោជនីយដ្ឋាន)៖'
    }
  },
  {
    field: 'companyAddress',
    prompts: {
      zh: '请输入公司地址：',
      en: 'Please enter the company address:',
      km: 'សូមបញ្ចូលអាសយដ្ឋានក្រុមហ៊ុន៖'
    }
  },
  {
    field: 'contactName',
    prompts: {
      zh: '请输入联系人姓名：',
      en: 'Please enter contact person\'s name:',
      km: 'សូមបញ្ចូលឈ្មោះអ្នកទំនាក់ទំនង៖'
    }
  },
  {
    field: 'contactPosition',
    prompts: {
      zh: '请输入您的联系人职位：',
      en: 'Please enter your job title/position:',
      km: 'សូមបញ្ចូលតំណែងអ្នកទំនាក់ទំនង៖'
    }
  },
  {
    field: 'contactTelegram',
    prompts: {
      zh: '请输入联系人的 Telegram 联系方式（例如: @username）：',
      en: 'Please enter contact\'s Telegram handle (e.g., @username):',
      km: 'សូមបញ្ចូលគណនី Telegram អ្នកទំនាក់ទំនង (ឧទាហរណ៍៖ @username)៖'
    }
  },
  {
    field: 'contactPhoneWhatsApp',
    prompts: {
      zh: '请输入联系人电话 / WhatsApp：',
      en: 'Please enter contact Phone / WhatsApp:',
      km: 'សូមបញ្ចូលលេខទូរស័ព្ទ / WhatsApp អ្នកទំនាក់ទំនង៖'
    }
  },
  {
    field: 'jobTitle',
    prompts: {
      zh: '请输入招聘岗位名称（例如: Node.js 程序员, 行政翻译）：',
      en: 'Please enter the job title to recruit (e.g., Node.js Developer, Admin Translator):',
      km: 'សូមបញ្ចូលឈ្មោះមុខតំណែងជ្រើសរើស (ឧទាហរណ៍៖ អ្នកសរសេរកម្មវិធី, អ្នកបកប្រែ)៖'
    }
  },
  {
    field: 'headcount',
    prompts: {
      zh: '请输入招聘人数（例如: 3人, 若干）：',
      en: 'Please enter the headcount needed (e.g., 3 people, several):',
      km: 'សូមបញ្ចូលចំនួនបុគ្គលិកត្រូវការ (ឧទាហរណ៍៖ ៣នាក់, មិនកំណត់)៖'
    }
  },
  {
    field: 'workLocation',
    prompts: {
      zh: '请输入工作地点（例如: 金边）：',
      en: 'Please enter the work location (e.g., Phnom Penh):',
      km: 'សូមបញ្ចូលទីតាំងការងារ (ឧទាហរណ៍៖ ភ្នំពេញ)៖'
    }
  },
  {
    field: 'salaryRange',
    prompts: {
      zh: '请输入薪资范围（例如: 1000-1500 USD）：',
      en: 'Please enter the salary range (e.g., 1000-1500 USD):',
      km: 'សូមបញ្ចូលចន្លោះប្រាក់ខែ (ឧទាហរណ៍៖ ១០០០-១៥០០ ដុល្លារ)៖'
    }
  },
  {
    field: 'workingHours',
    prompts: {
      zh: '请输入工作时间（例如: 8:00-17:00, 周休一天）：',
      en: 'Please enter the working hours (e.g., 8:00-17:00, 1 day off per week):',
      km: 'សូមបញ្ចូលម៉ោងធ្វើការ (ឧទាហរណ៍៖ ៨:០០-១៧:០០, សម្រាកមួយថ្ងៃក្នុងមួយសប្តាហ៍)៖'
    }
  },
  {
    field: 'languageRequirements',
    prompts: {
      zh: '请输入招聘岗位语言要求：',
      en: 'Please enter the language requirements for this role:',
      km: 'សូមបញ្ចូលតម្រូវការភាសាសម្រាប់តួនាទីនេះ៖'
    }
  },
  {
    field: 'experienceRequirements',
    prompts: {
      zh: '请输入招聘岗位工作经验要求：',
      en: 'Please enter the work experience requirements:',
      km: 'សូមបញ្ចូលតម្រូវការបទពិសោធន៍ការងារ៖'
    }
  },
  {
    field: 'accommodationProvided',
    prompts: {
      zh: '公司是否提供住宿：',
      en: 'Does the company provide accommodation?',
      km: 'តើក្រុមហ៊ុនមានផ្តល់កន្លែងស្នាក់នៅទេ?៖'
    },
    options: [
      { text: { zh: '是', en: 'Yes', km: 'បាទ/ចាស' }, val: '是' },
      { text: { zh: '否', en: 'No', km: 'ទេ' }, val: '否' }
    ]
  },
  {
    field: 'visaProvided',
    prompts: {
      zh: '公司是否提供签证 / 工作证：',
      en: 'Does the company provide visa / work permit?',
      km: 'តើក្រុមហ៊ុនមានផ្តល់ទិដ្ឋាការ / លិខិតអនុញ្ញាតការងារទេ?៖'
    },
    options: [
      { text: { zh: '是', en: 'Yes', km: 'បាទ/ចាស' }, val: '是' },
      { text: { zh: '否', en: 'No', km: 'ទេ' }, val: '否' }
    ]
  },
  {
    field: 'expectedArrivalDate',
    prompts: {
      zh: '请输入到岗时间要求（例如: 随时, 2周内）：',
      en: 'Please enter the expected arrival timeline (e.g., Immediately, within 2 weeks):',
      km: 'សូមបញ្ចូលតម្រូវការពេលវេលាមកដល់បំពេញការងារ (ឧទាហរណ៍៖ ភ្លាមៗ, ក្នុងរយៈពេល ២សប្តាហ៍)៖'
    }
  },
  {
    field: 'jobDescription',
    prompts: {
      zh: '请输入岗位描述：',
      en: 'Please enter the job description:',
      km: 'សូមបញ្ចូលការពិពណ៌នាការងារ៖'
    }
  },
  {
    field: 'acceptServiceFeeRules',
    // 问题3优化：追加说明，消除用户"盲签"顾虑
    prompts: {
      zh: '最后一步：您是否愿意进一步了解 Boss Hiring 服务合作规则？\n\n💡 说明：具体服务费率、保证期和补录规则将由顾问在推荐候选人前单独确认，此处仅表示您愿意继续沟通合作。',
      en: "Last step: Are you open to learning more about Boss Hiring's cooperation terms?\n\n💡 Note: The exact fee, guarantee period, and replacement policy will be confirmed by a consultant before any candidate is recommended. This only indicates your willingness to proceed.",
      km: 'ជំហានចុងក្រោយ: តើអ្នកព្រមរៀនបន្ថែមអំពីលក្ខខណ្ឌសហការ Boss Hiring ទេ?\n\n💡 ចំណាំ: ថ្លៃសេវាត្រឹមត្រូវ និងល័ក្ខខ័ណ្ឌនឹងត្រូវបញ្ជាក់ដោយទីប្រឹក្សា មុនណែនាំបេក្ខជន។'
    },
    options: [
      { text: { zh: '是，愿意继续沟通', en: 'Yes, happy to proceed', km: 'បាទ/ចាស ព្រម' }, val: '是' },
      { text: { zh: '否，暂不需要', en: 'No, not for now', km: 'ទេ មិនទាន់' }, val: '否' }
    ]
  },
  {
    field: 'otherNotes',
    prompts: {
      zh: '请输入其他备注（如无，请输入“无”）：',
      en: 'Please enter other notes (if none, enter "None"):',
      km: 'សូមបញ្ចូលព័ត៌មានបន្ថែមផ្សេងៗ (បើគ្មានទេ សូមបញ្ចូល "គ្មាន")៖'
    }
  }
];

export const formHandler = {
  /**
   * Check if user is actively filling a form
   */
  isFilling(chatId) {
    return USER_STATES.has(String(chatId));
  },

  /**
   * Cancel form session
   */
  cancelForm(chatId) {
    USER_STATES.delete(String(chatId));
  },

  /**
   * Start step-by-step form filling
   */
  async startForm(chatId, type, lang, replyFunc) {
    const sChatId = String(chatId);
    USER_STATES.set(sChatId, {
      type, // 'candidate' | 'employer'
      step: 0,
      answers: {}
    });

    // 问题1优化：开场白说明问卷长度，降低用户中途放弃率
    const totalQuestions = type === 'candidate' ? CANDIDATE_QUESTIONS.length : EMPLOYER_QUESTIONS.length;
    const introMsgs = {
      zh: {
        candidate: `📝 接下来需要回答 ${totalQuestions} 个问题，约需 3 分钟。\n\n您也可以随时点击「取消填写」退出，改为直接上传简历文件。`,
        employer:  `📝 接下来需要回答 ${totalQuestions} 个问题，约需 3 分钟。\n\n您也可以随时点击「取消填写」退出，改为直接上传 JD 文件。`,
      },
      en: {
        candidate: `📝 There are ${totalQuestions} questions in total, about 3 minutes.\n\nYou can tap "Cancel" at any time and upload your resume file instead.`,
        employer:  `📝 There are ${totalQuestions} questions in total, about 3 minutes.\n\nYou can tap "Cancel" at any time and upload your JD file instead.`,
      },
      km: {
        candidate: `📝 មានសំណួរ ${totalQuestions} ប្រហែល ៣ នាទី។\n\nអ្នកអាចចុច «បោះបង់» គ្រប់ពេល ហើយផ្ញើ CV ជំនួសវិញ។`,
        employer:  `📝 មានសំណួរ ${totalQuestions} ប្រហែល ៣ នាទី។\n\nអ្នកអាចចុច «បោះបង់» គ្រប់ពេល ហើយផ្ញើ JD ជំនួសវិញ។`,
      },
    };
    const introMsg = (introMsgs[lang] || introMsgs.zh)[type] || introMsgs.zh[type];
    await replyFunc(sChatId, introMsg);

    await sendQuestion(sChatId, lang, replyFunc);
  },

  /**
   * Handle text response
   */
  async handleFormInput(chatId, text, lang, replyFunc, notifyInternalFunc) {
    const sChatId = String(chatId);
    const state = USER_STATES.get(sChatId);
    if (!state) return;

    const questions = state.type === 'candidate' ? CANDIDATE_QUESTIONS : EMPLOYER_QUESTIONS;
    const currentQuestion = questions[state.step];
    
    // Save answer
    state.answers[currentQuestion.field] = text.trim();
    state.step++;

    if (state.step < questions.length) {
      await sendQuestion(sChatId, lang, replyFunc);
    } else {
      await sendSummary(sChatId, lang, replyFunc);
    }
  },

  /**
   * Handle button click events during questionnaire
   */
  async handleFormCallback(chatId, data, lang, replyFunc, notifyInternalFunc) {
    const sChatId = String(chatId);
    
    if (data === 'form:cancel') {
      this.cancelForm(sChatId);
      const cancelMsgs = {
        zh: '已取消在线填写。您随时可以通过主菜单重新选择服务。',
        en: 'Online filling cancelled. You can restart any time from the main menu.',
        km: 'ការបំពេញអនឡាញត្រូវបានបោះបង់។ អ្នកអាចចាប់ផ្តើមឡើងវិញគ្រប់ពេលពីម៉ឺនុយមេ។'
      };
      await replyFunc(sChatId, cancelMsgs[lang] || cancelMsgs.zh);
      return;
    }

    const state = USER_STATES.get(sChatId);
    if (!state) return;

    const questions = state.type === 'candidate' ? CANDIDATE_QUESTIONS : EMPLOYER_QUESTIONS;

    if (data.startsWith('form:opt:')) {
      const selectedValue = data.replace('form:opt:', '');
      const currentQuestion = questions[state.step];
      
      state.answers[currentQuestion.field] = selectedValue;
      state.step++;

      if (state.step < questions.length) {
        await sendQuestion(sChatId, lang, replyFunc);
      } else {
        await sendSummary(sChatId, lang, replyFunc);
      }
      return;
    }

    if (data === 'form:restart') {
      state.step = 0;
      state.answers = {};
      await sendQuestion(sChatId, lang, replyFunc);
      return;
    }

    if (data === 'form:confirm') {
      const processingMsgs = {
        zh: '正在处理提交并由 AI 整理归档，请稍候...',
        en: 'Processing submission and archiving via AI. Please wait...',
        km: 'កំពុងដំណើរការបញ្ជូន និងរៀបចំ AI សូមរង់ចាំ...'
      };
      await replyFunc(sChatId, processingMsgs[lang] || processingMsgs.zh);
      
      try {
        await submitForm(sChatId, state, lang, replyFunc, notifyInternalFunc);
      } catch (err) {
        console.error('Failed to submit online form:', err);
        const errMsg = {
          zh: '提交失败，请稍后重试或尝试直接上传文件。',
          en: 'Submission failed. Please try again later or upload files directly.',
          km: 'ការបញ្ជូនបានបរាជ័យ សូមព្យាយាមម្តងទៀត ឬផ្ញើឯកសារដោយផ្ទាល់。'
        };
        await replyFunc(sChatId, errMsg[lang] || errMsg.zh);
      } finally {
        this.cancelForm(sChatId);
      }
    }
  }
};

/**
 * Render and send the current question to Telegram
 */
async function sendQuestion(chatId, lang, replyFunc) {
  const state = USER_STATES.get(chatId);
  const questions = state.type === 'candidate' ? CANDIDATE_QUESTIONS : EMPLOYER_QUESTIONS;
  const q = questions[state.step];
  const total = questions.length;
  const progress = `[${state.step + 1}/${total}]`;

  const questionPrompt = `${progress} ${q.prompts[lang] || q.prompts.zh}`;
  
  // Build inline keyboard
  const inline_keyboard = [];
  
  // Add options if available
  if (q.options) {
    const row = q.options.map(opt => ({
      text: opt.text[lang] || opt.text.zh,
      callback_data: `form:opt:${opt.val}`
    }));
    inline_keyboard.push(row);
  }

  // Always append a cancel button at the bottom
  const cancelLabel = BUTTON_LABELS[lang]?.cancel || BUTTON_LABELS.zh.cancel;
  inline_keyboard.push([{ text: cancelLabel, callback_data: 'form:cancel' }]);

  await replyFunc(chatId, questionPrompt, { inline_keyboard });
}

/**
 * Render and send the confirmation summary page
 */
async function sendSummary(chatId, lang, replyFunc) {
  const state = USER_STATES.get(chatId);
  const questions = state.type === 'candidate' ? CANDIDATE_QUESTIONS : EMPLOYER_QUESTIONS;
  
  let summaryTitle = {
    zh: '*请核对您填写的信息：*\n\n',
    en: '*Please verify the details you entered:*\n\n',
    km: '*សូមពិនិត្យព័ត៌មានដែលបានបំពេញ៖*\n\n'
  }[lang];

  let summaryText = summaryTitle;
  
  // Loop through answers and format key prompts
  for (const q of questions) {
    const val = state.answers[q.field] || '-';
    // Strip icons/numbers for short display
    const label = (q.prompts[lang] || q.prompts.zh).replace(/[^\u4e00-\u9fa5a-zA-Z\s]/g, '').trim().replace('：', '').replace(':', '');
    summaryText += `*${label}:* ${val}\n`;
  }

  const labels = BUTTON_LABELS[lang] || BUTTON_LABELS.zh;
  const inline_keyboard = [
    [
      { text: labels.confirm, callback_data: 'form:confirm' },
      { text: labels.restart, callback_data: 'form:restart' }
    ],
    [
      { text: labels.cancel, callback_data: 'form:cancel' }
    ]
  ];

  await replyFunc(chatId, summaryText, { inline_keyboard });
}

/**
 * Finalize form submission, run AI analysis and save to database
 */
async function submitForm(chatId, state, lang, replyFunc, notifyInternalFunc) {
  const isCandidate = state.type === 'candidate';
  const typePrefix = isCandidate ? 'CV' : 'JD';
  const tableName = isCandidate ? 'Candidates' : 'Jobs';
  
  // Format answers to structured text block for Gemini multimodal analysis
  const questions = isCandidate ? CANDIDATE_QUESTIONS : EMPLOYER_QUESTIONS;
  let formattedText = `【在线表单提交的内容】\n`;
  for (const q of questions) {
    const label = q.prompts.zh.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').replace('：', '');
    formattedText += `${label}：${state.answers[q.field] || ''}\n`;
  }

  // Step 1: Run Gemini analysis on text block
  let aiResult;
  if (isCandidate) {
    aiResult = await analyzeResume(null, null, formattedText);
  } else {
    aiResult = await analyzeJob(null, null, formattedText);
  }

  // Step 2: Generate unique record ID
  const recordId = await generateRecordId(typePrefix, airtableClient);

  // Step 3: Construct database record
  // Use manual answers first, fallback to AI values
  const record = {
    recordId,
    status: isCandidate ? '求职中' : '招聘中',
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lang,
    telegramId: String(chatId),
    notes: '用户通过 Telegram 在线表单填写完成',
    ...aiResult
  };

  // Overlay direct manual questionnaire entries for maximum precision
  for (const [key, val] of Object.entries(state.answers)) {
    if (val) {
      if (key === 'age') {
        const num = parseInt(val, 10);
        record.age = isNaN(num) ? null : num;
      } else {
        record[key] = val;
      }
    }
  }

  // Step 4: Write to Airtable
  await airtableClient.appendRecord(tableName, record);

  // Step 5: Trigger smart matching (AI assist)
  let matchReport = '';
  try {
    if (isCandidate) {
      const activeJobs = (await airtableClient.getRecords('Jobs'))
        .filter(j => j.status === '招聘中' || j.status === 'OPEN' || !j.status);
      
      if (activeJobs.length > 0) {
        const matches = await matchCandidateToJobs(record, activeJobs);
        if (matches.length > 0) {
          const topMatches = matches.slice(0, 3);
          record.matchedJobs = JSON.stringify(topMatches.map(m => `${m.jobId} (${m.totalScore}分)`));
          await airtableClient.updateByRecordId('Candidates', recordId, {
            matchedJobs: record.matchedJobs
          });
          matchReport = `\n\n🎯 *智能推荐岗位：*\n` + topMatches.map(m => `- ${m.jobId}: [${m.jobTitle}](${m.companyName || '未知企业'}) (匹配度: ${m.totalScore}分, ${m.recommendation})`).join('\n');
        }
      }
    } else {
      const activeCandidates = (await airtableClient.getRecords('Candidates'))
        .filter(c => c.status === '求职中' || c.status === 'ACTIVE' || !c.status);

      if (activeCandidates.length > 0) {
        const matches = await matchJobToCandidates(record, activeCandidates);
        if (matches.length > 0) {
          const topMatches = matches.slice(0, 3);
          record.matchedCandidates = JSON.stringify(topMatches.map(m => `${m.candidateId} (${m.totalScore}分)`));
          await airtableClient.updateByRecordId('Jobs', recordId, {
            matchedCandidates: record.matchedCandidates
          });
          matchReport = `\n\n🎯 *智能推荐求职者：*\n` + topMatches.map(m => `- ${m.candidateId}: ${m.candidateName} (${m.expectedRole}) (匹配度: ${m.totalScore}分, ${m.recommendation})`).join('\n');
        }
      }
    }
  } catch (matchErr) {
    console.error('Match engine failure during form submission:', matchErr.message);
  }

  // Step 6: Send internal group notification
  const internalTitle = isCandidate ? '在线填写 - 求职者简历登记' : '在线填写 - 企业招聘需求登记';
  const internalDetails = isCandidate
    ? `👤 姓名：${record.name}\n💼 期望岗位：${record.expectedRole}\n💰 期望薪资：${record.expectedSalary}\n🗣 语言能力：${record.languages}\n📍 意向地点：${record.acceptableLocation}`
    : `🏢 公司：${record.companyName}\n👔 招聘岗位：${record.jobTitle}\n👥 招聘人数：${record.headcount}\n💰 薪资范围：${record.salaryRange}\n📍 工作地点：${record.workLocation}`;

  await notifyInternalFunc(
    `【${internalTitle} - 序号：${recordId}】\n` +
    `时间：${record.submittedAt}\n` +
    `Telegram ID：[${record.name}](tg://user?id=${chatId})\n` +
    `${internalDetails}\n\n` +
    `🤖 *AI 摘要：*${record.aiSummary || '无'}\n` +
    `🏷 *AI 标签：*${(record.aiTags || []).join(', ') || '无'}\n` +
    `⚠️ *缺失关键信息：*${(record.missingFields || []).join(', ') || '无'}` +
    matchReport
  );

  // Step 7: Inform the client of completion
  // 问题7优化：追加下一步引导，避免提交后界面「死掉」
  const nextStepGuide = {
    zh: '\n\n💬 如有任何疑问，可在此直接输入提问，或使用下方菜单选择其他服务。',
    en: '\n\nFeel free to ask any questions here, or use the menu below for more services.',
    km: '\n\nអ្នកអាចសួរសំណួរបន្ថែម ឬប្រើម៉ឺនុយខាងក្រោមដើម្បីរកសេវាបន្ថែម។',
  };
  const completionMsg = isCandidate
    ? {
        zh: `提交成功！✅\n\n您的简历已整理完毕，生成序号：*${recordId}*。\n\n我们会保护您的隐私（不会对外直接暴露您的姓名和联系方式），根据匹配度为您推荐岗位，并在顾问确认后与您联系。${nextStepGuide.zh}`,
        en: `Submitted successfully! ✅\n\nYour profile has been processed with ID: *${recordId}*.\n\nWe protect your privacy by hiding contact details, using AI to match jobs, and our consultant will reach out to you once matching is confirmed.${nextStepGuide.en}`,
        km: `បានបញ្ជូនដោយជោគជ័យ! ✅\n\nប្រវត្តិរូបរបស់អ្នកត្រូវបានចុះបញ្ជីលេខ៖ *${recordId}*។\n\nយើងខ្ញុំនឹងរក្សាការសម្ងាត់ព័ត៌មានរបស់អ្នក ផ្គូផ្គងជាមួយឱកាសការងារ AI ហើយទីប្រឹក្សានឹងទាក់ទងទៅវិញក្នុងពេលឆាប់ៗ។${nextStepGuide.km}`
      }
    : {
        zh: `需求提交成功！✅\n\n您的岗位登记已处理完毕，生成序号：*${recordId}*。\n\n顾问会在确认合作规则与服务条款后，向您推荐匹配的候选人。${nextStepGuide.zh}`,
        en: `Hiring request submitted! ✅\n\nYour listing has been registered with ID: *${recordId}*.\n\nOur consultant will verify cooperation rules and then send qualified candidates matching your role.${nextStepGuide.en}`,
        km: `បានបញ្ជូនតម្រូវការជ្រើសរើសដោយជោគជ័យ! ✅\n\nតម្រូវការការងារត្រូវបានចុះបញ្ជីលេខ៖ *${recordId}*។\n\nទីប្រឹក្សានឹងទាក់ទងបញ្ជាក់ព័ត៌មាន បន្ទាប់មកណែនាំបេក្ខជនដែលសមរម្យ។${nextStepGuide.km}`
      };

  await replyFunc(chatId, completionMsg[lang] || completionMsg.zh);
}
