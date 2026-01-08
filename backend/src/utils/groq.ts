/**
 * Groq AI Service
 * Handles all interactions with Groq AI
 */
import Groq from "groq-sdk";
import { env } from "../config/env";

const GROQ_API_KEY = env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.warn("GROQ_API_KEY not found in environment variables");
}

// Initialize Groq client
let groq: Groq | null = null;

export function initializeGroq(): Groq {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in environment variables");
  }

  if (!groq) {
    groq = new Groq({
      apiKey: GROQ_API_KEY,
    });
  }

  return groq;
}

/**
 * Generate branch-specific industry insights using Groq
 */
export async function generateBranchInsightsWithGroq(
  branch: string,
  year?: string,
  educationType?: string
): Promise<{ content: any; summary: string }> {
  try {
    console.log(`[Groq] Generating industry insights for branch: ${branch}, year: ${year}, education: ${educationType}`);
    
    const prompt = buildBranchInsightsPrompt(branch, year, educationType);
    const systemMessage = `You are an expert career counselor specializing in providing current, relevant industry insights for engineering students. 
Your insights should be:
- Current and relevant (as of ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
- Specific to the engineering branch mentioned
- Actionable and practical
- Focused on career opportunities, skills in demand, industry trends, and growth areas
- Written in a clear, engaging manner suitable for students`;

    console.log(`[Groq] Calling Groq API to generate insights...`);
    const response = await generateWithGroq(prompt, "llama-3.3-70b-versatile", systemMessage);
    console.log(`[Groq] Received response, length: ${response.length} characters`);
    
    const parsed = parseBranchInsightsFromResponse(response);
    console.log(`[Groq] Successfully parsed insights. Trends: ${parsed.content?.trends?.length || 0}, Opportunities: ${parsed.content?.opportunities?.length || 0}`);

    return {
      content: parsed.content,
      summary: parsed.summary,
    };
  } catch (error: any) {
    console.error("[Groq] Error generating branch insights:", error);
    console.log("[Groq] Falling back to basic insights...");
    // Return fallback insights
    return generateBasicBranchInsights(branch, year, educationType);
  }
}

/**
 * Build prompt for branch-specific insights
 */
function buildBranchInsightsPrompt(branch: string, year?: string, educationType?: string): string {
  const yearContext = year ? ` (${year} student)` : "";
  const educationContext = educationType ? ` pursuing ${educationType}` : "";
  
  return `Generate comprehensive, current industry insights for ${branch}${yearContext}${educationContext} engineering students.

Provide insights in the following JSON structure:
{
  "trends": [
    {
      "title": "Trend title",
      "description": "Detailed description",
      "impact": "How this affects students"
    }
  ],
  "opportunities": [
    {
      "title": "Opportunity title",
      "description": "What it is",
      "skills_needed": ["skill1", "skill2"],
      "growth_potential": "High/Medium/Low"
    }
  ],
  "skills_in_demand": [
    {
      "skill": "Skill name",
      "importance": "Why it's important",
      "learning_resources": "Where to learn"
    }
  ],
  "salary_trends": {
    "entry_level": "₹X-Y LPA",
    "mid_level": "₹X-Y LPA",
    "senior_level": "₹X-Y LPA",
    "growth_rate": "X% annually"
  },
  "top_companies": [
    {
      "name": "Company name",
      "why_relevant": "Why it's good for ${branch} students"
    }
  ],
  "emerging_technologies": [
    {
      "technology": "Tech name",
      "relevance": "Why it matters for ${branch}",
      "career_impact": "How it affects careers"
    }
  ]
}

Focus on:
1. Current market trends (2025)
2. Emerging technologies and their impact
3. Skills that are in high demand
4. Career opportunities and growth areas
5. Salary trends in India
6. Top companies hiring ${branch} engineers
7. Practical advice for students

Make it specific to ${branch} engineering, not generic.`;
}

/**
 * Parse branch insights from Groq response
 */
function parseBranchInsightsFromResponse(response: string): { content: any; summary: string } {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const summary = generateSummary(parsed);
      return {
        content: parsed,
        summary: summary,
      };
    }
    
    throw new Error("No JSON found in response");
  } catch (error: any) {
    console.error("[Groq] Error parsing branch insights:", error);
    throw error;
  }
}

/**
 * Generate a short summary from insights
 */
function generateSummary(insights: any): string {
  const trendsCount = insights.trends?.length || 0;
  const opportunitiesCount = insights.opportunities?.length || 0;
  const skillsCount = insights.skills_in_demand?.length || 0;
  
  return `This week's insights include ${trendsCount} key trends, ${opportunitiesCount} career opportunities, and ${skillsCount} in-demand skills. Explore the latest developments in your field and discover new pathways for growth.`;
}

/**
 * Generate basic fallback insights when Groq fails
 */
function generateBasicBranchInsights(
  branch: string,
  year?: string,
  educationType?: string
): { content: any; summary: string } {
  const branchLower = branch.toLowerCase();
  
  let content: any = {
    trends: [
      {
        title: "Digital Transformation",
        description: "Industries are rapidly adopting digital technologies, creating new opportunities for engineers.",
        impact: "Increased demand for tech-savvy engineers across all sectors",
      },
    ],
    opportunities: [
      {
        title: "Software Development",
        description: "High demand for software engineers in various domains",
        skills_needed: ["Programming", "Problem Solving", "System Design"],
        growth_potential: "High",
      },
    ],
    skills_in_demand: [
      {
        skill: "Programming Languages",
        importance: "Core skill for most engineering roles",
        learning_resources: "Online courses, coding platforms, university curriculum",
      },
    ],
    salary_trends: {
      entry_level: "₹5-8 LPA",
      mid_level: "₹12-18 LPA",
      senior_level: "₹20-35 LPA",
      growth_rate: "10-15% annually",
    },
    top_companies: [
      {
        name: "Tech Companies",
        why_relevant: "Leading employers for engineering graduates",
      },
    ],
    emerging_technologies: [
      {
        technology: "AI/ML",
        relevance: "Growing application across industries",
        career_impact: "New roles and opportunities emerging",
      },
    ],
  };

  // Customize based on branch
  if (branchLower.includes("cse") || branchLower.includes("computer")) {
    content.trends[0].title = "Cloud Computing & DevOps";
    content.opportunities[0].title = "Full-Stack Development";
  } else if (branchLower.includes("ece") || branchLower.includes("electronics")) {
    content.trends[0].title = "IoT & Embedded Systems";
    content.opportunities[0].title = "Hardware Design";
  } else if (branchLower.includes("eee") || branchLower.includes("electrical")) {
    content.trends[0].title = "Renewable Energy";
    content.opportunities[0].title = "Power Systems Engineering";
  }

  return {
    content,
    summary: `Weekly insights for ${branch} engineering students. Explore trends, opportunities, and skills in demand.`,
  };
}

/**
 * Generate content using Groq AI
 */
export async function generateWithGroq(
  prompt: string,
  model: string = "llama-3.3-70b-versatile",
  systemMessage?: string
): Promise<string> {
  try {
    console.log("[Groq] Initializing Groq client...");
    const client = initializeGroq();
    console.log("[Groq] Groq client initialized successfully");
    
    const messages: any[] = [];
    
    if (systemMessage) {
      messages.push({
        role: "system",
        content: systemMessage,
      });
      console.log("[Groq] System message added");
    }
    
    messages.push({
      role: "user",
      content: prompt,
    });
    
    console.log("[Groq] Calling Groq API with model:", model);
    console.log("[Groq] Prompt length:", prompt.length, "characters");
    
    const completion = await client.chat.completions.create({
      messages,
      model: model,
      temperature: 0.7, // Lower temperature for more consistent output
      max_tokens: 8000, // Increased for longer question sets
    });

    const response = completion.choices[0]?.message?.content || "";
    console.log("[Groq] API call successful, response length:", response.length);
    
    return response;
  } catch (error: any) {
    console.error("[Groq] Error generating content:", error);
    console.error("[Groq] Error details:", error?.message);
    if (error?.response) {
      console.error("[Groq] Error response:", error.response);
    }
    throw new Error(`Failed to generate content with Groq: ${error?.message || "Unknown error"}`);
  }
}

/**
 * Generate assessment questions using Groq AI
 */
export async function generateAssessmentQuestionsWithGroq(
  profileData: any,
  assessmentType: "aptitude" | "personality",
  numQuestions: number = 50
): Promise<any[]> {
  const prompt = buildAssessmentPrompt(profileData, assessmentType, numQuestions);
  
  // Add system message for better instruction following
  const systemMessage = assessmentType === "aptitude"
    ? "You are an expert assessment designer. You ONLY generate general aptitude questions (quantitative, logical reasoning, verbal ability). You NEVER generate technical questions about programming, computer science, engineering, or any domain-specific knowledge. CRITICAL: The 'options' array must contain REAL answer values (like '60 km/h', '42', 'Kind'), NOT placeholder text like 'A', 'B', 'C', 'D' or 'Option A'. Each option must be a meaningful answer choice. You always return valid JSON."
    : "You are an expert psychologist creating personality assessments. You generate career-oriented personality questions using Likert scales and simple choices. For Likert scale questions, use: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']. For choice questions, provide real meaningful options, not placeholders. You always return valid JSON.";
  
  console.log(`[Groq] Generating ${numQuestions} ${assessmentType} questions for user profile:`, {
    year: profileData.grade_or_year,
    branch: profileData.branch,
    education_type: profileData.education_type,
  });
  
  console.log(`[Groq] Calling Groq API...`);
  const response = await generateWithGroq(prompt, "llama-3.3-70b-versatile", systemMessage);
  
  console.log(`[Groq] Received response length: ${response.length} characters`);
  console.log(`[Groq] Response (first 1000 chars):`, response.substring(0, 1000));
  
  const questions = parseQuestionsFromResponse(response, assessmentType);
  
  console.log(`[Groq] Parsed ${questions.length} questions`);
  
  if (questions.length > 0) {
    console.log(`[Groq] Sample question:`, {
      id: questions[0].id,
      question: questions[0].question || questions[0].question_text,
      options: questions[0].options,
      optionsCount: Array.isArray(questions[0].options) ? questions[0].options.length : 0,
    });
  }
  
  // Validate that questions have real options (not placeholders)
  const validQuestions = questions.filter((q: any) => {
    if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
      console.warn(`[Groq] Question ${q.id} has no options`);
      return false;
    }
    
    // Check if options are placeholders
    const firstOption = String(q.options[0]).toLowerCase().trim();
    const isPlaceholder = 
      firstOption === "a" || 
      firstOption === "b" || 
      firstOption === "option a" || 
      firstOption === "option b" ||
      firstOption.startsWith("option ");
    
    if (isPlaceholder) {
      console.error(`[Groq] Question ${q.id} has placeholder options:`, q.options);
      return false;
    }
    
    return true;
  });
  
  console.log(`[Groq] Valid questions (with real options): ${validQuestions.length} out of ${questions.length}`);
  
  if (validQuestions.length === 0) {
    console.error("[Groq] No valid questions generated! All questions had placeholder options.");
    console.error("[Groq] Response (first 2000 chars):", response.substring(0, 2000));
    throw new Error("Failed to generate valid questions with real answer options. The AI generated placeholder options instead of actual answers. Please try again.");
  }
  
  if (validQuestions.length < numQuestions * 0.8) {
    console.warn(`[Groq] Only ${validQuestions.length} valid questions out of ${numQuestions} requested. Some questions had placeholder options.`);
  }
  
  return validQuestions;
}

function buildAssessmentPrompt(
  profileData: any,
  assessmentType: string,
  numQuestions: number
): string {
  // Extract educational profile information
  const gradeOrYear = profileData.grade_or_year || "Not specified";
  const educationType = profileData.education_type || "Not specified";
  const branch = profileData.branch || profileData.primary_domain || "Not specified";
  
  // Determine academic level and year
  const yearMatch = gradeOrYear.match(/(\d+)(st|nd|rd|th)?\s*(year|yr)/i) || 
                     gradeOrYear.match(/(first|second|third|fourth|final)/i);
  let yearNumber = 0;
  let academicLevel = "undergraduate";
  
  if (yearMatch) {
    const yearStr = yearMatch[1] || yearMatch[0];
    if (yearStr.match(/1|first/i)) yearNumber = 1;
    else if (yearStr.match(/2|second/i)) yearNumber = 2;
    else if (yearStr.match(/3|third/i)) yearNumber = 3;
    else if (yearStr.match(/4|fourth|final/i)) yearNumber = 4;
  }
  
  // Determine if postgraduate
  if (educationType.match(/m\.?(tech|e|sc|ba|com|phd|ms)/i)) {
    academicLevel = "postgraduate";
  }

  // Determine difficulty based on year
  let difficulty = "moderate";
  if (yearNumber <= 2) {
    difficulty = "easy";
  } else if (yearNumber >= 3) {
    difficulty = "moderate-hard";
  }

  if (assessmentType === "aptitude") {
    return buildAptitudePrompt(profileData, numQuestions, yearNumber, academicLevel, branch, difficulty);
  } else {
    return buildPersonalityPrompt(profileData, numQuestions, yearNumber, academicLevel, branch);
  }
}

function buildAptitudePrompt(
  profileData: any,
  numQuestions: number,
  yearNumber: number,
  academicLevel: string,
  branch: string,
  difficulty: string
): string {
  // Shorter, more concise prompt to reduce token usage
  return `Generate ${numQuestions} general aptitude questions (NO technical/coding questions).

Student: Year ${yearNumber}, ${academicLevel}, ${branch}. Difficulty: ${difficulty}.

Categories: Quantitative (40%), Logical (35%), Verbal (25%).

CRITICAL: Options must be REAL values like ["60 km/h", "70 km/h", "80 km/h", "90 km/h"], NOT ["A", "B", "C", "D"].

Format (JSON only):
{
  "questions": [
    {
      "id": 1,
      "question": "If a train travels 240 km in 3 hours, what is its average speed?",
      "type": "aptitude",
      "options": ["60 km/h", "70 km/h", "80 km/h", "90 km/h"],
      "correct_answer": "C",
      "category": "quantitative"
    }
  ]
}

Examples:
- Quantitative: "What is 15% of 240?" → options: ["30", "36", "40", "45"]
- Logical: "Complete: 2, 6, 12, 20, 30, ?" → options: ["40", "42", "44", "46"]
- Verbal: "Synonym of 'Benevolent'?" → options: ["Malevolent", "Kind", "Strict", "Harsh"]

NEVER generate: algorithms, databases, OS, networks, coding, DSA, technical CS topics.

Generate exactly ${numQuestions} questions. Return ONLY valid JSON, no markdown.`;
}

function buildPersonalityPrompt(
  profileData: any,
  numQuestions: number,
  yearNumber: number,
  academicLevel: string,
  branch: string
): string {
  // Shorter, more concise prompt to reduce token usage
  return `Generate ${numQuestions} career-oriented personality questions.

Student: Year ${yearNumber}, ${academicLevel}, ${branch}.

Focus: Career interests, work style, values, decision-making, teamwork, leadership.

Format (JSON only):
{
  "questions": [
    {
      "id": 1,
      "question": "I prefer working in a team rather than independently",
      "type": "personality",
      "options": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
      "scale_type": "likert"
    }
  ]
}

80% Likert scale (5 options), 20% choice questions (2-4 options). Make relevant to Year ${yearNumber} ${academicLevel} student.

Return ONLY valid JSON, no markdown.`;
}

function parseQuestionsFromResponse(text: string, assessmentType: string): any[] {
  try {
    // Clean the response text
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    
    // Try to find JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Extract questions array
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions.map((q: any, index: number) => {
          // Validate options - check if they're placeholder values
          let options = q.options || [];
          
          // Check if options are placeholders (like "A", "B", "C", "D" or "Option A", etc.)
          if (Array.isArray(options) && options.length > 0) {
            const firstOption = String(options[0]).toLowerCase().trim();
            const isPlaceholder = 
              firstOption === "a" || 
              firstOption === "b" || 
              firstOption === "option a" || 
              firstOption === "option b" ||
              firstOption.startsWith("option ");
            
            if (isPlaceholder) {
              console.error(`[Groq] Question ${q.id || index + 1} has placeholder options:`, options);
              console.error(`[Groq] This question will be skipped. AI did not follow instructions.`);
              return null; // Mark for filtering
            }
          }
          
          // For personality, use default Likert scale if options are missing
          if (assessmentType === "personality" && (!options || options.length === 0)) {
            options = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
          }
          
          return {
            id: q.id || index + 1,
            question: q.question || q.question_text || "",
            question_text: q.question || q.question_text || "",
            type: q.type || assessmentType,
            options: options,
            correct_answer: q.correct_answer || null,
            category: q.category || null,
            scale_type: q.scale_type || (assessmentType === "personality" ? "likert" : null),
          };
        }).filter((q: any) => q !== null); // Remove questions with placeholder options
      }
      
      // If questions is not an array but the object itself is an array
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    
    // Try parsing the whole text as JSON
    const directParse = JSON.parse(jsonText);
    if (Array.isArray(directParse)) {
      return directParse;
    }
    if (directParse.questions && Array.isArray(directParse.questions)) {
      return directParse.questions;
    }
    
    console.warn("[Groq] Could not parse questions from response");
    return [];
  } catch (error: any) {
    console.error("[Groq] Error parsing questions:", error);
    console.error("[Groq] Response text:", text.substring(0, 500));
    
    // Try to extract questions using regex as fallback
    try {
      const questionMatches = text.match(/"question"\s*:\s*"([^"]+)"/g);
      if (questionMatches && questionMatches.length > 0) {
        console.warn("[Groq] Attempting fallback parsing");
        // Fallback parsing - try to extract options from response
        console.warn("[Groq] Attempting fallback parsing - this should not happen if AI follows instructions");
        // Don't use placeholder options in fallback - return empty array to force regeneration
        return [];
      }
    } catch (fallbackError) {
      console.error("[Groq] Fallback parsing also failed:", fallbackError);
    }
    
    return [];
  }
}

/**
 * Generate career report using Groq AI
 */
export async function generateCareerReportWithGroq(
  assessmentResults: any,
  profileData: any
): Promise<any> {
  console.log("[Groq] Generating personalized career report...");
  console.log("[Groq] Profile:", {
    branch: profileData.branch,
    year: profileData.grade_or_year,
    education: profileData.education_type,
  });
  console.log("[Groq] Aptitude answers:", assessmentResults.aptitude?.answeredQuestions || 0);
  console.log("[Groq] Personality answers:", assessmentResults.personality?.answeredQuestions || 0);
  
  const prompt = buildCareerReportPrompt(assessmentResults, profileData);
  console.log(`[Groq] Report prompt length: ${prompt.length} characters`);
  
  const systemMessage = "You are an expert career counselor. Analyze assessment results and student profiles to generate highly personalized career recommendations. Always base recommendations on actual assessment answers and profile details, not generic suggestions. Return only valid JSON.";
  
  const response = await generateWithGroq(prompt, "llama-3.3-70b-versatile", systemMessage);
  console.log(`[Groq] Report response length: ${response.length} characters`);
  
  const parsed = parseCareerReportFromResponse(response);
  console.log(`[Groq] Parsed report with ${parsed.careerOptions?.length || 0} career options`);
  
  return parsed;
}

function buildCareerReportPrompt(assessmentResults: any, profileData: any): string {
  // Analyze aptitude answers to extract performance patterns
  const aptitudeAnswers = assessmentResults.aptitude?.answers || [];
  const personalityAnswers = assessmentResults.personality?.answers || [];
  
  // Extract quantitative, logical, and verbal questions from aptitude
  const quantitativeQuestions = aptitudeAnswers.filter((a: any) => 
    a.question.toLowerCase().match(/\b(calculate|percent|ratio|speed|distance|time|area|volume|sum|difference|product|divide|multiply|add|subtract|math|number|digit)\b/)
  );
  const logicalQuestions = aptitudeAnswers.filter((a: any) => 
    a.question.toLowerCase().match(/\b(pattern|series|sequence|complete|next|analogy|syllogism|reasoning|logic|deduce|infer)\b/)
  );
  const verbalQuestions = aptitudeAnswers.filter((a: any) => 
    a.question.toLowerCase().match(/\b(synonym|antonym|meaning|word|vocabulary|grammar|sentence|comprehension|read|passage)\b/)
  );
  
  // Analyze personality answers to extract traits
  const personalityTraits: any = {
    teamOriented: 0,
    independent: 0,
    creative: 0,
    analytical: 0,
    leadership: 0,
    detailOriented: 0,
    adaptable: 0,
    deadlineFocused: 0,
  };
  
  personalityAnswers.forEach((a: any) => {
    const question = a.question.toLowerCase();
    const answer = String(a.answer).toLowerCase();
    const isPositive = answer.includes("agree") || answer.includes("yes") || answer.includes("prefer");
    
    if (question.includes("team") || question.includes("collaborat")) {
      personalityTraits.teamOriented += isPositive ? 1 : -1;
    }
    if (question.includes("independent") || question.includes("alone") || question.includes("solo")) {
      personalityTraits.independent += isPositive ? 1 : -1;
    }
    if (question.includes("creativ") || question.includes("innovative") || question.includes("design")) {
      personalityTraits.creative += isPositive ? 1 : -1;
    }
    if (question.includes("analyz") || question.includes("data") || question.includes("logic")) {
      personalityTraits.analytical += isPositive ? 1 : -1;
    }
    if (question.includes("lead") || question.includes("manage") || question.includes("direct")) {
      personalityTraits.leadership += isPositive ? 1 : -1;
    }
    if (question.includes("detail") || question.includes("precise") || question.includes("accurate")) {
      personalityTraits.detailOriented += isPositive ? 1 : -1;
    }
    if (question.includes("adapt") || question.includes("change") || question.includes("flexible")) {
      personalityTraits.adaptable += isPositive ? 1 : -1;
    }
    if (question.includes("deadline") || question.includes("time") || question.includes("urgent")) {
      personalityTraits.deadlineFocused += isPositive ? 1 : -1;
    }
  });
  
  // Determine academic level and experience
  const yearMatch = (profileData.grade_or_year || "").match(/(\d+)(st|nd|rd|th)?\s*(year|yr)/i) || 
                     (profileData.grade_or_year || "").match(/(first|second|third|fourth|final)/i);
  let yearNumber = 0;
  if (yearMatch) {
    const yearStr = yearMatch[1] || yearMatch[0];
    if (yearStr.match(/1|first/i)) yearNumber = 1;
    else if (yearStr.match(/2|second/i)) yearNumber = 2;
    else if (yearStr.match(/3|third/i)) yearNumber = 3;
    else if (yearStr.match(/4|fourth|final/i)) yearNumber = 4;
  }
  
  const isPostgraduate = (profileData.education_type || "").match(/m\.?(tech|e|sc|ba|com|phd|ms)/i);
  const academicLevel = isPostgraduate ? "postgraduate" : `Year ${yearNumber} undergraduate`;
  
  return `You are an expert career counselor. Analyze this student's assessment results and profile to generate a personalized career report.

STUDENT PROFILE:
- Academic Level: ${academicLevel}
- Education Type: ${profileData.education_type || "Not specified"}
- Branch/Stream: ${profileData.branch || profileData.primary_domain || "Not specified"}
- Institution: ${profileData.school_or_college || "Not specified"}
- Experience Level: ${profileData.experience_level || "Student"}

APTITUDE ASSESSMENT ANALYSIS:
Answered Questions: ${aptitudeAnswers.length} (out of 50 total)
- Quantitative: ${quantitativeQuestions.length} answered
- Logical Reasoning: ${logicalQuestions.length} answered
- Verbal Ability: ${verbalQuestions.length} answered

Sample Aptitude (first 3):
${aptitudeAnswers.slice(0, 3).map((a: any, i: number) => `${i + 1}. ${a.question.substring(0, 80)}... → ${a.answer}`).join('\n')}

PERSONALITY TRAITS:
Team(${personalityTraits.teamOriented > 0 ? '+' : personalityTraits.teamOriented < 0 ? '-' : '='}) | Indep(${personalityTraits.independent > 0 ? '+' : personalityTraits.independent < 0 ? '-' : '='}) | Creative(${personalityTraits.creative > 0 ? '+' : personalityTraits.creative < 0 ? '-' : '='}) | Analy(${personalityTraits.analytical > 0 ? '+' : personalityTraits.analytical < 0 ? '-' : '='}) | Lead(${personalityTraits.leadership > 0 ? '+' : personalityTraits.leadership < 0 ? '-' : '='}) | Detail(${personalityTraits.detailOriented > 0 ? '+' : personalityTraits.detailOriented < 0 ? '-' : '='}) | Adapt(${personalityTraits.adaptable > 0 ? '+' : personalityTraits.adaptable < 0 ? '-' : '='})

Sample Personality (first 3):
${personalityAnswers.slice(0, 3).map((a: any, i: number) => `${i + 1}. ${a.question.substring(0, 60)}... → ${a.answer}`).join('\n')}

TASK: Analyze ONLY the answered questions (${aptitudeAnswers.length} aptitude + ${personalityAnswers.length} personality) + profile → Generate 3-5 personalized careers.

Key Analysis (based on answered questions only):
- Aptitude: ${aptitudeAnswers.length > 0 ? (quantitativeQuestions.length > logicalQuestions.length && quantitativeQuestions.length > verbalQuestions.length ? 'Strong in Quantitative' : logicalQuestions.length > verbalQuestions.length ? 'Strong in Logical' : 'Strong in Verbal') : 'Limited data'} reasoning
- Personality: ${personalityAnswers.length > 0 ? (personalityTraits.teamOriented > 0 ? 'Team player' : personalityTraits.independent > 0 ? 'Independent worker' : 'Balanced') + ', ' + (personalityTraits.analytical > 0 ? 'Analytical' : personalityTraits.creative > 0 ? 'Creative' : 'Balanced') + ' thinker' : 'Limited data'}
- Profile: ${profileData.branch || "General"} student, Year ${yearNumber}, ${academicLevel}

Generate report based ONLY on the ${aptitudeAnswers.length + personalityAnswers.length} answered questions provided. Do not assume unanswerered questions. Use the actual answers given to determine strengths and career fit.

Generate careers that match these traits + ${profileData.branch || "general"} background. India salary ranges (₹LPA). 2025-2026 market trends.

OUTPUT FORMAT (return ONLY valid JSON, no markdown):
{
  "careerReadinessScore": <number 0-100 based on assessment performance and profile alignment>,
  "summary": "<2-3 sentence personalized summary mentioning specific strengths from their answers and how they align with recommended careers>",
  "strengths": ["<specific strength 1 based on answers>", "<specific strength 2>", "<specific strength 3>", ...],
  "careerOptions": [
    {
      "id": "career-1",
      "title": "<career-title>",
      "match": <match-percentage-0-100 based on aptitude+personality+profile alignment>,
      "description": "<2-3 sentence description explaining WHY this career matches their assessment results and profile>",
      "salaryMin": <min-salary-in-lpa-for-india>,
      "salaryMax": <max-salary-in-lpa-for-india>,
      "keySkills": ["<skill1>", "<skill2>", "<skill3>", ...],
      "growthOutlook": "High" | "Medium" | "Low"
    },
    ... (3-5 career options)
  ]
}

CRITICAL REQUIREMENTS:
- Career options MUST be based on actual assessment answers, not generic
- Match percentages should reflect how well the career aligns with their specific answers
- Description should mention specific traits/answers that make this career suitable
- Provide 3-5 diverse career options
- Salary ranges must be realistic for India (₹LPA format)
- Skills should be specific and relevant to the career
- Growth outlook should reflect 2025-2026 market trends

Return ONLY the JSON object, no markdown, no explanations.`;
}

function parseCareerReportFromResponse(text: string): any {
  try {
    // Try to extract JSON from the response
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    
    // Try to find JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
    
    // If no match, try parsing the whole text
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("[Groq] Error parsing career report:", error);
    // Return default structure if parsing fails
    return {
      careerReadinessScore: 75,
      summary: "Based on your assessment results, you show potential in technology and analytical fields.",
      strengths: ["Analytical Thinking", "Problem Solving", "Fast Learner"],
      careerOptions: [
        {
          id: "1",
          title: "Software Engineer",
          match: 85,
          description: "Build and maintain software applications.",
          salaryMin: 6,
          salaryMax: 25,
          keySkills: ["Programming", "Problem Solving"],
          growthOutlook: "High",
        },
      ],
    };
  }
}

/**
 * Generate learning path using Groq AI based on selected career
 */
export async function generateLearningPathWithGroq(
  careerTitle: string,
  profileData?: any
): Promise<any> {
  console.log(`[Groq] Generating learning path for career: ${careerTitle}`);
  
  const prompt = buildLearningPathPrompt(careerTitle, profileData);
  console.log(`[Groq] Learning path prompt length: ${prompt.length} characters`);
  
  const systemMessage = "You are an expert career counselor and learning path designer. Generate structured, practical learning paths with specific skills, resources, and clear progression. Return only valid JSON.";
  
  try {
    const response = await generateWithGroq(prompt, "llama-3.3-70b-versatile", systemMessage);
    console.log(`[Groq] Learning path response length: ${response.length} characters`);
    
    const parsed = parseLearningPathFromResponse(response);
    console.log(`[Groq] Parsed learning path with ${parsed.skills?.length || 0} skills`);
    
    return parsed;
  } catch (error: any) {
    console.error("[Groq] Error generating learning path:", error);
    
    // Check if it's a rate limit error
    const isRateLimit = error?.status === 429 || error?.message?.includes("rate_limit") || error?.message?.includes("429");
    
    if (isRateLimit) {
      console.log("[Groq] Rate limit hit. Generating basic learning path...");
      return generateBasicLearningPath(careerTitle, profileData);
    }
    
    throw error;
  }
}

function buildLearningPathPrompt(careerTitle: string, profileData?: any): string {
  const branch = profileData?.branch || "";
  const year = profileData?.grade_or_year || "";
  const educationType = profileData?.education_type || "";
  const existingSkills = profileData?.existing_skills || [];
  const otherSkills = profileData?.other_skills || "";
  const experienceLevel = profileData?.experience_level || "";
  
  // Build skills context
  let skillsContext = "";
  if (existingSkills.length > 0 || otherSkills) {
    skillsContext = `\n\nEXISTING SKILLS & KNOWLEDGE:\n`;
    if (existingSkills.length > 0) {
      skillsContext += `- Technical Skills: ${existingSkills.join(", ")}\n`;
    }
    if (otherSkills) {
      skillsContext += `- Additional Skills/Experience: ${otherSkills}\n`;
    }
    skillsContext += `\nIMPORTANT: Consider these existing skills when creating the learning path. Skip or reduce coverage of skills the user already knows. Focus on building upon their existing foundation and filling knowledge gaps.`;
  }
  
  return `Generate a comprehensive, personalized learning path for becoming a ${careerTitle}.

STUDENT BACKGROUND:
${branch ? `- Branch/Field: ${branch.toUpperCase()}` : "- Branch: Not specified"}
${year ? `- Current Year/Grade: ${year}` : "- Year: Not specified"}
${educationType ? `- Education Type: ${educationType.toUpperCase()}` : ""}
${experienceLevel ? `- Experience Level: ${experienceLevel}` : ""}${skillsContext}

Create a structured learning path with 8-12 skills in logical progression order.

Format (JSON only):
{
  "title": "${careerTitle} Learning Path",
  "description": "Step-by-step path to become a ${careerTitle}",
  "estimated_duration_weeks": <number>,
  "skill_level": "Beginner → Intermediate",
  "skills": [
    {
      "skill_id": "skill-1",
      "name": "<Skill Name>",
      "description": "<2-3 sentence description of what to learn>",
      "skill_order": 1,
      "estimated_duration": "2 weeks",
      "youtube_videos": [
        {"title": "<Video Title>", "url": "<YouTube URL>"},
        {"title": "<Video Title>", "url": "<YouTube URL>"}
      ],
      "external_resources": [
        {"type": "Documentation", "title": "<Resource Title>", "url": "<URL>"},
        {"type": "Course", "title": "<Course Title>", "url": "<URL>"}
      ],
      "assignments": {
        "mcqs": <number>,
        "tasks": <number>
      }
    }
  ]
}

Requirements:
- Skills must be specific and practical (e.g., "JavaScript Fundamentals", "React Components", "API Development")
- Order skills from foundational to advanced
- Include 2-3 YouTube video links per skill (real, popular tutorials)
- Include 2-3 external resources (documentation, courses, tutorials)
- Assignments: 3-5 MCQs and 1-2 practical tasks per skill
- Duration: 1-3 weeks per skill
- Total path: 10-16 weeks

${branch ? `Focus on skills relevant to ${branch.toUpperCase()} background transitioning to ${careerTitle}.` : ""}
${existingSkills.length > 0 ? `\n\nSKILL ADJUSTMENT: The user already knows: ${existingSkills.join(", ")}. Adjust the learning path to:\n- Skip or briefly review skills they already have\n- Focus on advanced topics in areas they know\n- Bridge gaps between their current skills and ${careerTitle} requirements\n- Prioritize new skills they need to learn` : ""}

Return ONLY valid JSON, no markdown.`;
}

function parseLearningPathFromResponse(text: string): any {
  try {
    let jsonText = text.trim();
    jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("[Groq] Error parsing learning path:", error);
    return generateBasicLearningPath("", {});
  }
}

export function generateBasicLearningPath(careerTitle: string, profileData?: any): any {
  const branch = (profileData?.branch || "").toLowerCase();
  const isCSE = branch.includes("cse") || branch.includes("computer") || branch.includes("cs");
  const isECE = branch.includes("ece") || branch.includes("electronics");
  
  // Generate skills based on career title
  let skills: any[] = [];
  
  if (careerTitle.toLowerCase().includes("software") || careerTitle.toLowerCase().includes("developer") || isCSE) {
    skills = [
      {
        skill_id: "programming-fundamentals",
        name: "Programming Fundamentals",
        description: "Master core programming concepts, variables, data types, control structures, and functions",
        skill_order: 1,
        estimated_duration: "2 weeks",
        youtube_videos: [
          { title: "Programming Basics Tutorial", url: "https://www.youtube.com/watch?v=zOjov-2OZ0E" },
          { title: "Learn Programming Fundamentals", url: "https://www.youtube.com/watch?v=8mAITcNt710" }
        ],
        external_resources: [
          { type: "Documentation", title: "MDN Web Docs", url: "https://developer.mozilla.org" },
          { type: "Course", title: "FreeCodeCamp", url: "https://www.freecodecamp.org" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "data-structures",
        name: "Data Structures & Algorithms",
        description: "Learn arrays, linked lists, stacks, queues, trees, and basic algorithms",
        skill_order: 2,
        estimated_duration: "3 weeks",
        youtube_videos: [
          { title: "Data Structures Explained", url: "https://www.youtube.com/watch?v=RBSGKlAvoiM" },
          { title: "Algorithms Tutorial", url: "https://www.youtube.com/watch?v=8hly31xKli0" }
        ],
        external_resources: [
          { type: "Documentation", title: "GeeksforGeeks", url: "https://www.geeksforgeeks.org" },
          { type: "Course", title: "LeetCode Learn", url: "https://leetcode.com/explore" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "web-development",
        name: "Web Development Basics",
        description: "Build websites using HTML, CSS, and JavaScript. Create responsive and interactive web pages",
        skill_order: 3,
        estimated_duration: "2 weeks",
        youtube_videos: [
          { title: "HTML & CSS Tutorial", url: "https://www.youtube.com/watch?v=qz0aGYrrlhU" },
          { title: "JavaScript for Beginners", url: "https://www.youtube.com/watch?v=W6NZfCO5SIk" }
        ],
        external_resources: [
          { type: "Documentation", title: "MDN Web Docs", url: "https://developer.mozilla.org" },
          { type: "Course", title: "W3Schools", url: "https://www.w3schools.com" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "backend-development",
        name: "Backend Development",
        description: "Learn server-side programming, APIs, databases, and authentication",
        skill_order: 4,
        estimated_duration: "3 weeks",
        youtube_videos: [
          { title: "Node.js Tutorial", url: "https://www.youtube.com/watch?v=TlB_eWDSMt4" },
          { title: "REST API Development", url: "https://www.youtube.com/watch?v=7YcW25PHnAA" }
        ],
        external_resources: [
          { type: "Documentation", title: "Node.js Docs", url: "https://nodejs.org/docs" },
          { type: "Course", title: "Express.js Guide", url: "https://expressjs.com" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "database-management",
        name: "Database Management",
        description: "Work with SQL and NoSQL databases. Learn querying, relationships, and data modeling",
        skill_order: 5,
        estimated_duration: "2 weeks",
        youtube_videos: [
          { title: "SQL Tutorial", url: "https://www.youtube.com/watch?v=HXV3zeQKqGY" },
          { title: "Database Design", url: "https://www.youtube.com/watch?v=ztHopE5Wnpc" }
        ],
        external_resources: [
          { type: "Documentation", title: "PostgreSQL Docs", url: "https://www.postgresql.org/docs" },
          { type: "Course", title: "MongoDB University", url: "https://university.mongodb.com" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "version-control",
        name: "Git & Version Control",
        description: "Master Git commands, branching, merging, and collaboration workflows",
        skill_order: 6,
        estimated_duration: "1 week",
        youtube_videos: [
          { title: "Git Tutorial for Beginners", url: "https://www.youtube.com/watch?v=8JJ101D3knE" },
          { title: "GitHub Workflow", url: "https://www.youtube.com/watch?v=0fKg7e37bQE" }
        ],
        external_resources: [
          { type: "Documentation", title: "Git Documentation", url: "https://git-scm.com/doc" },
          { type: "Course", title: "GitHub Guides", url: "https://guides.github.com" }
        ],
        assignments: { mcqs: 3, tasks: 1 }
      },
      {
        skill_id: "testing-debugging",
        name: "Testing & Debugging",
        description: "Write unit tests, integration tests, and debug applications effectively",
        skill_order: 7,
        estimated_duration: "2 weeks",
        youtube_videos: [
          { title: "Software Testing Tutorial", url: "https://www.youtube.com/watch?v=u6gsspf7O44" },
          { title: "Debugging Techniques", url: "https://www.youtube.com/watch?v=7YcW25PHnAA" }
        ],
        external_resources: [
          { type: "Documentation", title: "Jest Documentation", url: "https://jestjs.io/docs" },
          { type: "Course", title: "Testing Best Practices", url: "https://testingjavascript.com" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "deployment",
        name: "Deployment & DevOps",
        description: "Deploy applications to cloud platforms and understand CI/CD pipelines",
        skill_order: 8,
        estimated_duration: "2 weeks",
        youtube_videos: [
          { title: "Deployment Tutorial", url: "https://www.youtube.com/watch?v=2jqok-WgelI" },
          { title: "CI/CD Basics", url: "https://www.youtube.com/watch?v=scEDHsr3APg" }
        ],
        external_resources: [
          { type: "Documentation", title: "AWS Documentation", url: "https://aws.amazon.com/documentation" },
          { type: "Course", title: "Heroku Guide", url: "https://devcenter.heroku.com" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      }
    ];
  } else if (careerTitle.toLowerCase().includes("data") || careerTitle.toLowerCase().includes("analyst")) {
    skills = [
      {
        skill_id: "data-analysis-basics",
        name: "Data Analysis Fundamentals",
        description: "Learn data collection, cleaning, and basic statistical analysis",
        skill_order: 1,
        estimated_duration: "2 weeks",
        youtube_videos: [
          { title: "Data Analysis Tutorial", url: "https://www.youtube.com/watch?v=8hly31xKli0" },
          { title: "Statistics for Data Science", url: "https://www.youtube.com/watch?v=Lb2tm2y5kKo" }
        ],
        external_resources: [
          { type: "Documentation", title: "Pandas Documentation", url: "https://pandas.pydata.org/docs" },
          { type: "Course", title: "DataCamp", url: "https://www.datacamp.com" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "sql-mastery",
        name: "SQL Mastery",
        description: "Master SQL queries, joins, aggregations, and database operations",
        skill_order: 2,
        estimated_duration: "2 weeks",
        youtube_videos: [
          { title: "SQL Tutorial", url: "https://www.youtube.com/watch?v=HXV3zeQKqGY" },
          { title: "Advanced SQL", url: "https://www.youtube.com/watch?v=7BjbOK3Y24E" }
        ],
        external_resources: [
          { type: "Documentation", title: "SQL Tutorial", url: "https://www.w3schools.com/sql" },
          { type: "Course", title: "Mode Analytics SQL", url: "https://mode.com/sql-tutorial" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "python-data",
        name: "Python for Data Analysis",
        description: "Use Python libraries (Pandas, NumPy) for data manipulation and analysis",
        skill_order: 3,
        estimated_duration: "3 weeks",
        youtube_videos: [
          { title: "Pandas Tutorial", url: "https://www.youtube.com/watch?v=vmEHCJofslg" },
          { title: "NumPy Basics", url: "https://www.youtube.com/watch?v=QUT1VHiLmmI" }
        ],
        external_resources: [
          { type: "Documentation", title: "Pandas Docs", url: "https://pandas.pydata.org" },
          { type: "Course", title: "Python Data Science", url: "https://www.kaggle.com/learn" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "data-visualization",
        name: "Data Visualization",
        description: "Create charts, graphs, and dashboards using visualization tools",
        skill_order: 4,
        estimated_duration: "2 weeks",
        youtube_videos: [
          { title: "Data Visualization Guide", url: "https://www.youtube.com/watch?v=3V3rQHU6rZk" },
          { title: "Tableau Tutorial", url: "https://www.youtube.com/watch?v=6mBtNblyGr4" }
        ],
        external_resources: [
          { type: "Documentation", title: "Matplotlib Guide", url: "https://matplotlib.org" },
          { type: "Course", title: "Tableau Training", url: "https://www.tableau.com/learn" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      }
    ];
  } else if (isECE || careerTitle.toLowerCase().includes("electronics") || careerTitle.toLowerCase().includes("hardware")) {
    skills = [
      {
        skill_id: "circuit-design",
        name: "Circuit Design Fundamentals",
        description: "Learn basic circuit design, components, and circuit analysis",
        skill_order: 1,
        estimated_duration: "3 weeks",
        youtube_videos: [
          { title: "Circuit Design Basics", url: "https://www.youtube.com/watch?v=8hly31xKli0" },
          { title: "Electronics Tutorial", url: "https://www.youtube.com/watch?v=7YcW25PHnAA" }
        ],
        external_resources: [
          { type: "Documentation", title: "Electronics Tutorial", url: "https://www.electronics-tutorials.ws" },
          { type: "Course", title: "Coursera Electronics", url: "https://www.coursera.org" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "embedded-systems",
        name: "Embedded Systems Programming",
        description: "Program microcontrollers and work with embedded systems",
        skill_order: 2,
        estimated_duration: "3 weeks",
        youtube_videos: [
          { title: "Embedded Systems Tutorial", url: "https://www.youtube.com/watch?v=8hly31xKli0" },
          { title: "Arduino Programming", url: "https://www.youtube.com/watch?v=7YcW25PHnAA" }
        ],
        external_resources: [
          { type: "Documentation", title: "Arduino Reference", url: "https://www.arduino.cc/reference" },
          { type: "Course", title: "Embedded Systems Course", url: "https://www.coursera.org" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "vlsi-design",
        name: "VLSI Design",
        description: "Learn Very Large Scale Integration design and chip architecture",
        skill_order: 3,
        estimated_duration: "4 weeks",
        youtube_videos: [
          { title: "VLSI Design Tutorial", url: "https://www.youtube.com/watch?v=8hly31xKli0" },
          { title: "Digital Design", url: "https://www.youtube.com/watch?v=7YcW25PHnAA" }
        ],
        external_resources: [
          { type: "Documentation", title: "VLSI Design Guide", url: "https://www.vlsifacts.com" },
          { type: "Course", title: "VLSI Course", url: "https://www.coursera.org" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      }
    ];
  } else if (careerTitle.toLowerCase().includes("quality") || careerTitle.toLowerCase().includes("qa") || careerTitle.toLowerCase().includes("testing") || careerTitle.toLowerCase().includes("test")) {
    // Quality Assurance / Testing careers
    skills = [
      {
        skill_id: "testing-fundamentals",
        name: "Software Testing Fundamentals",
        description: "Learn testing principles, types of testing, and test case design",
        skill_order: 1,
        estimated_duration: "2 weeks",
        youtube_videos: [
          { title: "Software Testing Tutorial", url: "https://www.youtube.com/watch?v=drQK8ciCAjY" },
          { title: "Testing Basics for Beginners", url: "https://www.youtube.com/watch?v=u6gsspf7O44" },
          { title: "Test Case Design", url: "https://www.youtube.com/watch?v=8hly31xKli0" }
        ],
        external_resources: [
          { type: "Documentation", title: "Software Testing Guide", url: "https://www.guru99.com/software-testing.html" },
          { type: "Course", title: "ISTQB Foundation", url: "https://www.istqb.org" },
          { type: "Tutorial", title: "Testing Tutorial", url: "https://www.tutorialspoint.com/software_testing" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "manual-testing",
        name: "Manual Testing",
        description: "Master manual testing techniques, bug reporting, and test documentation",
        skill_order: 2,
        estimated_duration: "2 weeks",
        youtube_videos: [
          { title: "Manual Testing Complete Course", url: "https://www.youtube.com/watch?v=drQK8ciCAjY" },
          { title: "Bug Life Cycle", url: "https://www.youtube.com/watch?v=8hly31xKli0" },
          { title: "Test Documentation", url: "https://www.youtube.com/watch?v=W6NZfCO5SIk" }
        ],
        external_resources: [
          { type: "Documentation", title: "Manual Testing Guide", url: "https://www.guru99.com/manual-testing.html" },
          { type: "Course", title: "Manual Testing Course", url: "https://www.udemy.com/topic/manual-testing" },
          { type: "Tutorial", title: "Test Case Writing", url: "https://www.tutorialspoint.com/software_testing" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "automation-testing",
        name: "Test Automation",
        description: "Learn automation testing tools like Selenium, Cypress, and TestNG",
        skill_order: 3,
        estimated_duration: "3 weeks",
        youtube_videos: [
          { title: "Selenium WebDriver Tutorial", url: "https://www.youtube.com/watch?v=zOjov-2OZ0E" },
          { title: "Cypress Testing Framework", url: "https://www.youtube.com/watch?v=8mAITcNt710" },
          { title: "TestNG Framework", url: "https://www.youtube.com/watch?v=W6NZfCO5SIk" }
        ],
        external_resources: [
          { type: "Documentation", title: "Selenium Documentation", url: "https://www.selenium.dev/documentation" },
          { type: "Course", title: "Selenium WebDriver Course", url: "https://www.udemy.com/topic/selenium-webdriver" },
          { type: "Tutorial", title: "Cypress Guide", url: "https://docs.cypress.io" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "api-testing",
        name: "API Testing",
        description: "Test REST APIs using Postman, REST Assured, and automation tools",
        skill_order: 4,
        estimated_duration: "2 weeks",
        youtube_videos: [
          { title: "Postman Tutorial for Beginners", url: "https://www.youtube.com/watch?v=VywxIQ2ZXw4" },
          { title: "REST API Testing", url: "https://www.youtube.com/watch?v=8hly31xKli0" },
          { title: "API Automation Testing", url: "https://www.youtube.com/watch?v=W6NZfCO5SIk" }
        ],
        external_resources: [
          { type: "Documentation", title: "Postman Learning Center", url: "https://learning.postman.com" },
          { type: "Course", title: "API Testing Course", url: "https://www.udemy.com/topic/api-testing" },
          { type: "Tutorial", title: "REST Assured Guide", url: "https://rest-assured.io" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "performance-testing",
        name: "Performance Testing",
        description: "Learn load testing, stress testing, and performance optimization",
        skill_order: 5,
        estimated_duration: "2 weeks",
        youtube_videos: [
          { title: "Performance Testing Tutorial", url: "https://www.youtube.com/watch?v=8hly31xKli0" },
          { title: "JMeter Load Testing", url: "https://www.youtube.com/watch?v=W6NZfCO5SIk" },
          { title: "Performance Optimization", url: "https://www.youtube.com/watch?v=7YcW25PHnAA" }
        ],
        external_resources: [
          { type: "Documentation", title: "JMeter Documentation", url: "https://jmeter.apache.org/usermanual" },
          { type: "Course", title: "Performance Testing Course", url: "https://www.udemy.com/topic/performance-testing" },
          { type: "Tutorial", title: "Load Testing Guide", url: "https://www.guru99.com/performance-testing.html" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "test-management",
        name: "Test Management & Tools",
        description: "Use test management tools like Jira, TestRail, and bug tracking systems",
        skill_order: 6,
        estimated_duration: "1 week",
        youtube_videos: [
          { title: "Jira for Testers", url: "https://www.youtube.com/watch?v=8hly31xKli0" },
          { title: "TestRail Tutorial", url: "https://www.youtube.com/watch?v=W6NZfCO5SIk" },
          { title: "Bug Tracking Best Practices", url: "https://www.youtube.com/watch?v=7YcW25PHnAA" }
        ],
        external_resources: [
          { type: "Documentation", title: "Jira Testing Guide", url: "https://www.atlassian.com/software/jira/guides" },
          { type: "Course", title: "Test Management Tools", url: "https://www.udemy.com/topic/test-management" },
          { type: "Tutorial", title: "TestRail Documentation", url: "https://docs.testrail.com" }
        ],
        assignments: { mcqs: 3, tasks: 1 }
      }
    ];
  } else {
    // Generic learning path - improved with more skills and resources
    skills = [
      {
        skill_id: "foundation-skills",
        name: "Foundation Skills",
        description: "Build core skills required for your chosen career path",
        skill_order: 1,
        estimated_duration: "2 weeks",
        youtube_videos: [
          { title: "Career Foundation Course", url: "https://www.youtube.com/watch?v=8hly31xKli0" },
          { title: "Getting Started Guide", url: "https://www.youtube.com/watch?v=W6NZfCO5SIk" },
          { title: "Essential Skills Tutorial", url: "https://www.youtube.com/watch?v=7YcW25PHnAA" }
        ],
        external_resources: [
          { type: "Documentation", title: "Career Development Guide", url: "https://www.coursera.org" },
          { type: "Course", title: "Professional Skills Course", url: "https://www.udemy.com" },
          { type: "Tutorial", title: "Learning Resources", url: "https://www.khanacademy.org" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "intermediate-skills",
        name: "Intermediate Skills",
        description: "Develop intermediate-level skills and practical knowledge",
        skill_order: 2,
        estimated_duration: "3 weeks",
        youtube_videos: [
          { title: "Intermediate Level Training", url: "https://www.youtube.com/watch?v=8hly31xKli0" },
          { title: "Practical Applications", url: "https://www.youtube.com/watch?v=W6NZfCO5SIk" },
          { title: "Advanced Concepts", url: "https://www.youtube.com/watch?v=7YcW25PHnAA" }
        ],
        external_resources: [
          { type: "Documentation", title: "Intermediate Guide", url: "https://www.coursera.org" },
          { type: "Course", title: "Intermediate Course", url: "https://www.udemy.com" },
          { type: "Tutorial", title: "Practice Resources", url: "https://www.khanacademy.org" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      },
      {
        skill_id: "advanced-skills",
        name: "Advanced Skills",
        description: "Master advanced techniques and industry best practices",
        skill_order: 3,
        estimated_duration: "3 weeks",
        youtube_videos: [
          { title: "Advanced Techniques", url: "https://www.youtube.com/watch?v=8hly31xKli0" },
          { title: "Expert Level Training", url: "https://www.youtube.com/watch?v=W6NZfCO5SIk" },
          { title: "Industry Best Practices", url: "https://www.youtube.com/watch?v=7YcW25PHnAA" }
        ],
        external_resources: [
          { type: "Documentation", title: "Advanced Guide", url: "https://www.coursera.org" },
          { type: "Course", title: "Advanced Course", url: "https://www.udemy.com" },
          { type: "Tutorial", title: "Expert Resources", url: "https://www.khanacademy.org" }
        ],
        assignments: { mcqs: 5, tasks: 2 }
      }
    ];
  }
  
  const totalWeeks = skills.reduce((sum, skill) => {
    const weeks = parseInt(skill.estimated_duration) || 2;
    return sum + weeks;
  }, 0);
  
  return {
    title: `${careerTitle} Learning Path`,
    description: `Step-by-step learning path to become a ${careerTitle}`,
    estimated_duration_weeks: totalWeeks,
    skill_level: "Beginner → Intermediate",
    skills: skills,
  };
}

/**
 * Generate student-specific industry insights using Groq
 * Includes education level, branch, year, skills, and career path
 */
export async function generateStudentInsightsWithGroq(
  branch: string,
  year?: string,
  educationType?: string,
  skills?: string[],
  careerPath?: string
): Promise<{ content: any; summary: string }> {
  try {
    console.log(`[Groq] Generating student-specific insights for branch: ${branch}, year: ${year}, education: ${educationType}, career: ${careerPath}`);
    
    const prompt = buildStudentInsightsPrompt(branch, year, educationType, skills, careerPath);
    const systemMessage = `You are an expert career counselor specializing in providing current, relevant, personalized industry insights for engineering students. 
Your insights should be:
- Current and relevant (as of ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
- Highly personalized to the student's education level, branch, year, skills, and career goals
- Actionable and practical for their specific stage (1st year vs final year vs fresher)
- Focused on career opportunities, skills in demand, industry trends, and growth areas relevant to their profile
- Written in a clear, engaging manner suitable for students
- Beginner-friendly if early years, industry-aware if final year/fresher`;

    console.log(`[Groq] Calling Groq API to generate student-specific insights...`);
    const response = await generateWithGroq(prompt, "llama-3.3-70b-versatile", systemMessage);
    console.log(`[Groq] Received response, length: ${response.length} characters`);
    
    const parsed = parseBranchInsightsFromResponse(response);
    console.log(`[Groq] Successfully parsed student insights. Trends: ${parsed.content?.trends?.length || 0}, Opportunities: ${parsed.content?.opportunities?.length || 0}`);

    return {
      content: parsed.content,
      summary: parsed.summary,
    };
  } catch (error: any) {
    console.error("[Groq] Error generating student insights:", error);
    console.log("[Groq] Falling back to basic insights...");
    // Return fallback insights
    return generateBasicBranchInsights(branch, year, educationType);
  }
}

/**
 * Build prompt for student-specific insights
 */
function buildStudentInsightsPrompt(
  branch: string,
  year?: string,
  educationType?: string,
  skills?: string[],
  careerPath?: string
): string {
  const yearContext = year ? ` (${year} student)` : "";
  const educationContext = educationType ? ` pursuing ${educationType}` : "";
  const skillsContext = skills && skills.length > 0 ? `\n\nCurrent Skills: ${skills.join(", ")}` : "";
  const careerContext = careerPath ? `\n\nChosen Career Path: ${careerPath}` : "";
  
  // Determine student stage
  let stageContext = "";
  if (year) {
    const yearLower = year.toLowerCase();
    if (yearLower.includes("1st") || yearLower.includes("first") || yearLower.includes("1")) {
      stageContext = "This is a FIRST YEAR student. Focus on foundational skills, exploration, and building a strong base.";
    } else if (yearLower.includes("2nd") || yearLower.includes("second") || yearLower.includes("2")) {
      stageContext = "This is a SECOND YEAR student. Focus on skill development, projects, and career exploration.";
    } else if (yearLower.includes("3rd") || yearLower.includes("third") || yearLower.includes("3")) {
      stageContext = "This is a THIRD YEAR student. Focus on specialization, internships, and industry preparation.";
    } else if (yearLower.includes("4th") || yearLower.includes("fourth") || yearLower.includes("final") || yearLower.includes("4")) {
      stageContext = "This is a FINAL YEAR student. Focus on job readiness, interview preparation, and entry-level opportunities.";
    } else if (yearLower.includes("fresher") || yearLower.includes("graduate")) {
      stageContext = "This is a FRESHER/GRADUATE. Focus on entry-level positions, skill gaps, and career transition.";
    }
  }
  
  return `Generate comprehensive, current, PERSONALIZED industry insights for a ${branch}${yearContext}${educationContext} engineering student.${skillsContext}${careerContext}

${stageContext}

Provide insights in the following JSON structure:
{
  "trends": [
    {
      "title": "Trend title",
      "description": "Detailed description",
      "impact": "How this affects students at this stage"
    }
  ],
  "opportunities": [
    {
      "title": "Opportunity title",
      "description": "What it is",
      "skills_needed": ["skill1", "skill2"],
      "growth_potential": "High/Medium/Low"
    }
  ],
  "skills_in_demand": [
    {
      "skill": "Skill name",
      "importance": "Why it's important for this student's stage",
      "learning_resources": "Where to learn"
    }
  ],
  "salary_trends": {
    "entry_level": "₹X-Y LPA",
    "mid_level": "₹X-Y LPA",
    "senior_level": "₹X-Y LPA",
    "growth_rate": "X% annually"
  },
  "top_companies": [
    {
      "name": "Company name",
      "why_relevant": "Why it's good for this student"
    }
  ],
  "emerging_technologies": [
    {
      "technology": "Tech name",
      "relevance": "Why it matters for this student",
      "career_impact": "How it affects their career path"
    }
  ]
}

Focus on:
1. Current market trends (2025) relevant to their education level
2. Skills they should focus on THIS WEEK based on their stage
3. Technologies they should learn NOW
4. Entry-level/internship/fresher opportunities (if applicable)
5. Short actionable advice for THIS WEEK
6. Career opportunities aligned with their chosen path (${careerPath || "general"})
7. Practical learning focus for the week

Make it HIGHLY PERSONALIZED to this specific student's profile, not generic.`;
}

/**
 * Generate mentorship plans for a skill using AI
 * Returns plans for basic, intermediate, and advanced levels
 */
export async function generateMentorshipPlansWithGroq(skillName: string, category: string): Promise<any[]> {
  try {
    const groq = initializeGroq();
    
    const prompt = `Generate mentorship plans for the skill "${skillName}" (Category: ${category}).

Create THREE plans: Basic, Intermediate, and Advanced.

For each plan, provide:
- plan_key: "basic", "intermediate", or "advanced"
- plan_title: A descriptive title (e.g., "Full Stack Web Development - Beginner Track")
- price: Suggested price in INR (basic: 2000-4000, intermediate: 4000-7000, advanced: 7000-12000)
- duration_weeks: Number of weeks (basic: 4-6, intermediate: 6-10, advanced: 10-16)
- sessions_per_week: Sessions per week (1-2 for all)
- description: A detailed description of what students will learn

Return JSON array:
[
  {
    "plan_key": "basic",
    "plan_title": "Title here",
    "price": 3000,
    "duration_weeks": 6,
    "sessions_per_week": 1,
    "description": "Detailed description..."
  },
  {
    "plan_key": "intermediate",
    ...
  },
  {
    "plan_key": "advanced",
    ...
  }
]

Focus on:
- Progressive learning path
- Practical, hands-on content
- Industry-relevant skills
- Real-world projects`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert educational content designer specializing in creating structured mentorship programs for technical skills.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(response);
    
    // Handle both direct array and wrapped object
    const plans = Array.isArray(parsed) ? parsed : parsed.plans || parsed.data || [];
    
    if (!Array.isArray(plans) || plans.length === 0) {
      throw new Error("Invalid plan structure from AI");
    }

    // Ensure we have exactly 3 plans
    const planKeys = ["basic", "intermediate", "advanced"];
    const result: any[] = [];
    
    for (const key of planKeys) {
      const plan = plans.find((p: any) => p.plan_key === key) || plans[planKeys.indexOf(key)] || {};
      result.push({
        plan_key: key,
        plan_title: plan.plan_title || `${skillName} - ${key.charAt(0).toUpperCase() + key.slice(1)} Track`,
        price: plan.price || (key === "basic" ? 3000 : key === "intermediate" ? 5000 : 8000),
        duration_weeks: plan.duration_weeks || (key === "basic" ? 6 : key === "intermediate" ? 8 : 12),
        sessions_per_week: plan.sessions_per_week || 1,
        description: plan.description || `Comprehensive ${key} level mentorship program for ${skillName}`,
      });
    }

    return result;
  } catch (error: any) {
    console.error("[Groq] Error generating mentorship plans:", error);
    // Return fallback plans
    return [
      {
        plan_key: "basic",
        plan_title: `${skillName} - Beginner Track`,
        price: 3000,
        duration_weeks: 6,
        sessions_per_week: 1,
        description: `Learn the fundamentals of ${skillName} through hands-on practice and guided mentorship.`,
      },
      {
        plan_key: "intermediate",
        plan_title: `${skillName} - Intermediate Track`,
        price: 5000,
        duration_weeks: 8,
        sessions_per_week: 1,
        description: `Build advanced skills in ${skillName} with real-world projects and expert guidance.`,
      },
      {
        plan_key: "advanced",
        plan_title: `${skillName} - Advanced Track`,
        price: 8000,
        duration_weeks: 12,
        sessions_per_week: 1,
        description: `Master ${skillName} with industry-level projects and personalized mentorship.`,
      },
    ];
  }
}

/**
 * Generate plan topics for a mentorship plan using AI
 */
export async function generatePlanTopicsWithGroq(
  skillName: string,
  planKey: string,
  planTitle: string,
  durationWeeks: number,
  sessionsPerWeek: number
): Promise<Array<{ week_number: number; session_number: number; topic_title: string }>> {
  try {
    const groq = initializeGroq();
    
    const totalSessions = durationWeeks * sessionsPerWeek;
    
    const prompt = `Generate structured topics for a mentorship plan:
- Skill: ${skillName}
- Level: ${planKey} (${planTitle})
- Duration: ${durationWeeks} weeks
- Sessions per week: ${sessionsPerWeek}
- Total sessions: ${totalSessions}

Create a progressive learning path with topics that:
1. Build from fundamentals to advanced concepts
2. Include practical, hands-on learning
3. Cover industry-relevant skills
4. Progress logically week by week

Return JSON array:
[
  {
    "week_number": 1,
    "session_number": 1,
    "topic_title": "Topic name here"
  },
  ...
]

Ensure topics are:
- Specific and actionable
- Progressive (each builds on previous)
- Industry-relevant
- Practical and hands-on`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert curriculum designer creating structured learning paths for technical mentorship programs.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(response);
    const topics = Array.isArray(parsed) ? parsed : parsed.topics || parsed.data || [];
    
    if (!Array.isArray(topics) || topics.length === 0) {
      throw new Error("Invalid topics structure from AI");
    }

    // Ensure topics are properly ordered and complete
    const result: Array<{ week_number: number; session_number: number; topic_title: string }> = [];
    let sessionCount = 0;
    
    for (let week = 1; week <= durationWeeks; week++) {
      for (let session = 1; session <= sessionsPerWeek; session++) {
        sessionCount++;
        const topic = topics.find(
          (t: any) => t.week_number === week && t.session_number === session
        ) || topics[sessionCount - 1] || {};
        
        result.push({
          week_number: week,
          session_number: session,
          topic_title: topic.topic_title || `Week ${week} - Session ${session}: ${skillName} Fundamentals`,
        });
      }
    }

    return result;
  } catch (error: any) {
    console.error("[Groq] Error generating plan topics:", error);
    // Return fallback topics
    const result: Array<{ week_number: number; session_number: number; topic_title: string }> = [];
    let sessionCount = 0;
    
    for (let week = 1; week <= durationWeeks; week++) {
      for (let session = 1; session <= sessionsPerWeek; session++) {
        sessionCount++;
        result.push({
          week_number: week,
          session_number: session,
          topic_title: `Week ${week} - Session ${session}: ${skillName} Learning Path`,
        });
      }
    }
    
    return result;
  }
}

/**
 * Generate skill test questions using AI
 */
export async function generateSkillTestQuestionsWithGroq(skillName: string, category: string): Promise<any> {
  try {
    const groq = initializeGroq();
    
    const prompt = `Generate a comprehensive skill test for "${skillName}" (Category: ${category}).

Create 20 questions that cover:
1. Conceptual understanding (40% - 8 questions)
2. Practical application (40% - 8 questions)
3. Scenario-based problem solving (20% - 4 questions)

For each question, provide:
- question_text: The question
- question_type: "conceptual", "practical", or "scenario"
- options: Array of 4 options (for MCQ)
- correct_answer: The correct answer (index or text)
- explanation: Brief explanation of the answer
- points: Points for this question (usually 1)

Return JSON:
{
  "questions": [
    {
      "question_text": "Question here",
      "question_type": "conceptual",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Explanation here",
      "points": 1
    },
    ...
  ]
}

Make questions:
- Industry-relevant
- Appropriate difficulty for mentor verification
- Clear and unambiguous
- Cover key concepts of ${skillName}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert test designer creating comprehensive skill assessments for technical mentors.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(response);
    const questions = parsed.questions || parsed.data || [];
    
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Invalid questions structure from AI");
    }

    return {
      questions: questions.slice(0, 20), // Ensure max 20 questions
      total_questions: Math.min(questions.length, 20),
    };
  } catch (error: any) {
    console.error("[Groq] Error generating skill test questions:", error);
    throw error;
  }
}

/**
 * Evaluate test answers using AI
 */
export async function evaluateTestAnswersWithGroq(
  skillName: string,
  questions: any[],
  answers: any[]
): Promise<{
  score: number;
  correct_answers: number;
  total_questions: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
}> {
  try {
    const groq = initializeGroq();
    
    // Prepare answer evaluation data
    const evaluationData = questions.map((q: any, idx: number) => ({
      question: q.question_text,
      correct_answer: q.correct_answer,
      user_answer: answers[idx] || null,
      is_correct: q.correct_answer === answers[idx],
    }));

    const correctCount = evaluationData.filter((e: any) => e.is_correct).length;
    const score = Math.round((correctCount / questions.length) * 100);

    const prompt = `Evaluate test answers for "${skillName}" skill test.

Test Results:
- Total Questions: ${questions.length}
- Correct Answers: ${correctCount}
- Score: ${score}%

Answer Details:
${JSON.stringify(evaluationData, null, 2)}

Provide:
1. strengths: Array of 3-5 areas where the mentor showed strong understanding
2. weaknesses: Array of 3-5 areas that need improvement
3. feedback: Comprehensive feedback (2-3 paragraphs) on overall performance

Return JSON:
{
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "feedback": "Detailed feedback here..."
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert evaluator providing detailed feedback on technical skill assessments.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(response);

    return {
      score,
      correct_answers: correctCount,
      total_questions: questions.length,
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      feedback: parsed.feedback || `Scored ${score}% on ${skillName} test. ${correctCount} out of ${questions.length} questions answered correctly.`,
    };
  } catch (error: any) {
    console.error("[Groq] Error evaluating test answers:", error);
    // Return basic evaluation
    const correctCount = questions.filter((q: any, idx: number) => q.correct_answer === answers[idx]).length;
    const score = Math.round((correctCount / questions.length) * 100);
    
    return {
      score,
      correct_answers: correctCount,
      total_questions: questions.length,
      strengths: ["Good understanding of core concepts"],
      weaknesses: ["Some areas need more practice"],
      feedback: `Scored ${score}% on ${skillName} test.`,
    };
  }
}
