/**
 * Skill Utility Functions
 * Handles skill name normalization and canonicalization
 */

/**
 * Normalize skill name to canonical form
 * - Trims whitespace
 * - Capitalizes first letter of each word
 * - Handles common variations
 */
export function normalizeSkillName(skillName: string): string {
  if (!skillName || typeof skillName !== "string") {
    throw new Error("Skill name must be a non-empty string");
  }

  // Trim and remove extra whitespace
  let normalized = skillName.trim().replace(/\s+/g, " ");

  // Capitalize first letter of each word
  normalized = normalized
    .split(" ")
    .map((word) => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  // Handle common variations
  const variations: Record<string, string> = {
    "Javascript": "JavaScript",
    "Javascript ": "JavaScript",
    "Js": "JavaScript",
    "Reactjs": "React",
    "React.js": "React",
    "Nodejs": "Node.js",
    "Node.js": "Node.js",
    "Ml": "Machine Learning",
    "Ai": "Artificial Intelligence",
    "Dsa": "Data Structures and Algorithms",
    "Data Structures": "Data Structures and Algorithms",
    "Algorithms": "Data Structures and Algorithms",
    "Web Dev": "Web Development",
    "Webdev": "Web Development",
    "Fullstack": "Full Stack",
    "Full-Stack": "Full Stack",
    "Backend": "Backend Development",
    "Frontend": "Frontend Development",
  };

  // Check for exact match (case-insensitive)
  const lowerNormalized = normalized.toLowerCase();
  for (const [variant, canonical] of Object.entries(variations)) {
    if (lowerNormalized === variant.toLowerCase()) {
      return canonical;
    }
  }

  return normalized;
}

/**
 * Check if two skill names are equivalent (case-insensitive)
 */
export function areSkillsEquivalent(skill1: string, skill2: string): boolean {
  return normalizeSkillName(skill1).toLowerCase() === normalizeSkillName(skill2).toLowerCase();
}

/**
 * Infer course category from skill name
 */
export function inferCourseCategory(skillName: string): string {
  const normalized = normalizeSkillName(skillName).toLowerCase();

  // Programming languages
  if (
    ["java", "python", "javascript", "typescript", "c++", "c#", "rust", "go", "ruby", "php", "swift", "kotlin"].some(
      (lang) => normalized.includes(lang)
    )
  ) {
    return "Programming";
  }

  // Web development
  if (
    ["react", "vue", "angular", "next.js", "node.js", "express", "django", "flask", "spring", "web development"].some(
      (tech) => normalized.includes(tech)
    )
  ) {
    return "Web Development";
  }

  // Data Science & ML
  if (
    [
      "machine learning",
      "deep learning",
      "data science",
      "artificial intelligence",
      "neural networks",
      "tensorflow",
      "pytorch",
      "data analysis",
    ].some((tech) => normalized.includes(tech))
  ) {
    return "Data Science";
  }

  // Mobile development
  if (["android", "ios", "react native", "flutter", "mobile development"].some((tech) => normalized.includes(tech))) {
    return "Mobile Development";
  }

  // DevOps & Cloud
  if (
    ["devops", "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "cloud", "infrastructure"].some((tech) =>
      normalized.includes(tech)
    )
  ) {
    return "DevOps";
  }

  // DSA
  if (["data structures", "algorithms", "dsa", "problem solving"].some((tech) => normalized.includes(tech))) {
    return "DSA";
  }

  // Database
  if (["sql", "database", "mongodb", "postgresql", "mysql", "redis"].some((tech) => normalized.includes(tech))) {
    return "Database";
  }

  // Default
  return "General";
}











