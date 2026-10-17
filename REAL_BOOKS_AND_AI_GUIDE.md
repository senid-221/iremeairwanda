# IREME Platform - Real Books & AI Integration Guide

## 📚 Adding Real Educational Books

### Important Principles

**NEVER fabricate or create fake book content.** Only add resources that are:
1. **Open Educational Resources (OER)** - freely licensed for educational use
2. **Creative Commons licensed** - with proper attribution
3. **Public domain** - no copyright restrictions
4. **Official government materials** - with explicit permission
5. **Verified and authentic** - from legitimate educational sources

### Approved Sources for Rwandan Educational Materials

#### 1. Rwanda Education Board (REB)
- Website: https://reb.gov.rw
- Official curriculum materials
- Contact REB for permission to distribute digital copies
- Always verify URLs and materials are current

#### 2. Open Educational Resources (OER)
- **OER Commons**: https://www.oercommons.org
- **OpenStax**: https://openstax.org (free textbooks)
- **CK-12**: https://www.ck12.org
- **Khan Academy**: https://www.khanacademy.org
- **MIT OpenCourseWare**: https://ocw.mit.edu

#### 3. Creative Commons Search
- https://search.creativecommons.org
- Filter for educational use and modifications allowed
- Always verify license terms

#### 4. African Educational Resources
- **African Storybook**: https://www.africanstorybook.org
- **Book Dash**: https://bookdash.org
- **Afrilib**: https://afrilib.org

### How to Add a Real Book

#### Step 1: Verify the Resource
Before adding any book, verify:
- [ ] Source is legitimate and official
- [ ] License allows digital distribution
- [ ] Content is accurate and up-to-date
- [ ] Aligned with Rwanda curriculum
- [ ] Available in required language(s)

#### Step 2: Gather Metadata
Collect complete information:
```javascript
{
  title: "Exact official title",
  titleRw: "Kinyarwanda translation if available",
  subject: "Mathematics",
  subjectCode: "MATH",
  level: "Primary 5",
  levelCode: "P5",
  resourceType: "textbook", // textbook, student-guide, teacher-guide, exam, additional
  author: "Official author or organization",
  publisher: "Publisher name",
  year: 2024,
  license: "Creative Commons Attribution 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  language: ["en", "rw"],
  format: "pdf",
  url: "https://official-source-url.com/book.pdf",
  coverImage: "img/resources/book-cover.jpg",
  description: "Official description",
  isbn: "978-...",
  pages: 240,
  tags: ["mathematics", "primary", "p5"]
}
```

#### Step 3: Add via Admin API
```javascript
// Using the API client
IremeApi.createResource({
  title: "Mathematics P5 Student Textbook",
  titleRw: "Igitabo cy'Imibare P5",
  subject: "Mathematics",
  subjectCode: "MATH",
  level: "Primary 5",
  levelCode: "P5",
  resourceType: "textbook",
  author: "Rwanda Education Board",
  publisher: "REB",
  year: 2024,
  license: "OER - Open Educational Resource",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  language: ["en", "rw"],
  format: "pdf",
  url: "https://reb.gov.rw/materials/math-p5.pdf",
  isVerified: true,
  verifiedBy: "REB Official"
});
```

#### Step 4: Verification
- Mark as verified only after manual review
- Include verifier name and date
- Ensure all links work
- Test download functionality

### Resource Categories

1. **Textbooks** - Official curriculum textbooks
2. **Student Guides** - Supplementary student materials
3. **Teacher Guides** - Teaching resources and lesson plans
4. **National Exams** - Past examination papers (with permission)
5. **Additional Materials** - Other approved resources

---

## 🤖 AI API Integration

### Current AI Implementation

The IREME platform uses **OpenAI API** for AI-powered features:

#### 1. AI Tutor (Umufasha AI)
- **Location**: `/api/ai-tutor`
- **Purpose**: Conversational learning assistant
- **Features**:
  - Bilingual support (English/Kinyarwanda)
  - Curriculum-aware responses
  - Context-aware conversations
  - Student learning history

#### 2. Video Lesson Generation
- **Location**: `/api/video-lessons`
- **Purpose**: Generate educational video content
- **Features**:
  - Script generation from lesson topics
  - Text-to-speech narration
  - Visual content generation
  - Quiz creation

#### 3. Teacher Content Generation
- **Location**: `/api/teacher`
- **Purpose**: Help teachers create content
- **Features**:
  - Lesson plan generation
  - Quiz creation
  - Student report generation

### AI Configuration

#### Environment Variables
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-4o-mini

# Optional: Custom AI settings
AI_RESPONSE_TIMEOUT_MS=30000
AI_MAX_TOKENS=4000
AI_TEMPERATURE=0.7
```

#### Setting Up OpenAI API Key

1. **Get API Key**
   - Visit: https://platform.openai.com/api-keys
   - Create new secret key
   - Copy and save securely

2. **Add to Backend**
   - Edit `server/.env`
   - Add: `OPENAI_API_KEY=your-key-here`
   - Restart server

3. **Test Integration**
   ```bash
   curl https://iremeairwanda-1.onrender.com/api/ai-tutor/health
   ```

### AI Features Across the Platform

#### 1. Student Features
- **AI Tutor**: Homework help, concept explanation
- **Practice Tests**: AI-generated questions
- **Study Guides**: Personalized study materials
- **Writing Assistant**: Essay and composition help

#### 2. Teacher Features
- **Lesson Planning**: Generate lesson plans from topics
- **Quiz Creation**: Auto-generate assessments
- **Student Reports**: AI-assisted report writing
- **Content Creation**: Generate worksheets and activities

#### 3. Parent Features
- **Learning Insights**: AI analysis of child's progress
- **Study Recommendations**: Personalized learning suggestions
- **Communication Help**: Draft messages to teachers

### Enhancing AI Integration

#### Add AI to New Features

```javascript
// Example: AI-powered study recommendations
router.post('/study-recommendations', requireAuth, async function(req, res) {
  var studentProfile = await getStudentProfile(req.user.id);
  
  // Get student's learning history
  var activity = await prisma.learningActivityLog.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  // Generate recommendations using AI
  var prompt = `Based on this student's recent learning activity:
    ${JSON.stringify(activity)}
    
    Recommend 3 focused study activities for improvement.`;
  
  var response = await callOpenAI(prompt, { maxTokens: 1000 });
  
  res.json({ recommendations: response });
});
```

#### AI Best Practices

1. **Always provide context** - Include curriculum, level, subject
2. **Set appropriate limits** - Max tokens, timeout, rate limiting
3. **Handle errors gracefully** - Fallback messages in both languages
4. **Cache responses** - Reduce API costs for common queries
5. **Monitor usage** - Track API calls and costs
6. **Validate outputs** - Ensure AI responses are appropriate

### Cost Management

#### OpenAI Pricing (as of 2024)
- GPT-4o-mini: $0.15 / 1M input tokens, $0.60 / 1M output tokens
- GPT-4o: $2.50 / 1M input tokens, $10.00 / 1M output tokens

#### Cost Reduction Strategies
1. Use GPT-4o-mini for most tasks (10x cheaper than GPT-4)
2. Cache frequent responses
3. Limit conversation history (10 messages max)
4. Use shorter prompts when possible
5. Implement rate limiting per user

#### Monitoring
```javascript
// Track AI usage
await prisma.aiUsageLog.create({
  data: {
    userId: req.user.id,
    feature: 'ai-tutor',
    model: 'gpt-4o-mini',
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    cost: calculatedCost
  }
});
```

---

## 🚀 Next Steps

### Immediate Actions

1. **Set up OpenAI API key** in production environment
2. **Test AI tutor** with real students
3. **Identify 5-10 real OER books** to add initially
4. **Contact REB** for permission to use official materials
5. **Create admin interface** for resource management

### Short-term Goals (1-2 weeks)

1. Add 20+ verified educational resources
2. Implement AI usage tracking
3. Create resource download analytics
4. Add user ratings and reviews for resources
5. Implement AI-powered search

### Long-term Goals (1-3 months)

1. Partner with REB for official digital materials
2. Build mobile app with offline access
3. Implement AI tutoring for all subjects
4. Create adaptive learning paths
5. Add voice-based AI assistant

---

## 📞 Support & Resources

### Technical Support
- Backend API: https://iremeairwanda-1.onrender.com
- Documentation: Check server/src/routes/ files
- Database: Neon PostgreSQL

### Educational Resources
- Rwanda Education Board: https://reb.gov.rw
- OER Commons: https://www.oercommons.org
- Creative Commons: https://creativecommons.org

### AI Resources
- OpenAI Documentation: https://platform.openai.com/docs
- OpenAI Playground: https://platform.openai.com/playground
- Prompt Engineering Guide: https://www.promptingguide.ai

---

**Remember**: Always prioritize accuracy, proper licensing, and student safety when adding educational content or AI features.
