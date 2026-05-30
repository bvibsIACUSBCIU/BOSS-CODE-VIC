# Boss Hiring Knowledge Base

本目录是 Boss Hiring Telegram Bot 的企业知识库源文件。

## 文件说明

1. `boss-hiring-enterprise-knowledge-base.md`  
   企业知识库总文档，覆盖公司定位、服务流程、AI 边界、信息保护、后台数据、费用规则和客服原则。

2. `boss-hiring-faq.csv`  
   FAQ 百问百答表，适合后续接入 Bot 做关键词匹配或语义检索。

3. `boss-hiring-customer-service-scripts.csv`  
   客服标准话术表，用于统一 Bot 和人工顾问的回答风格。

## 后续接入 Bot 的建议

第一阶段：

- 读取 `boss-hiring-faq.csv`
- 根据语言和关键词做匹配
- 返回标准回答和推荐按钮

第二阶段：

- 将总文档和 FAQ 同步到向量库
- 用户提问后做语义搜索
- AI 根据知识片段生成自然客服回复
- 费用、合同、保证期、隐私等高风险问题转人工顾问确认

## 维护规则

- 费用、保证期、补人规则等内容必须由 Boss Hiring 负责人确认后再写入。
- 所有回答都不能承诺一定录用、一定招到人或固定成交时间。
- 涉及候选人联系方式、企业资料、完整简历时，必须遵守信息保护规则。
- 每条 FAQ 建议保持一个清晰问题和一个标准答案，避免一条 FAQ 承载过多主题。
