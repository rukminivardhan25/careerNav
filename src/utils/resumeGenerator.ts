/**
 * Generate markdown from structured resume data
 */

import { ResumeData } from "@/types/resume";

export function generateMarkdown(data: ResumeData): string {
  const { header, summary, skills, experience, projects, education, certifications } = data;

  let markdown = "";

  // Header
  markdown += `# ${header.fullName}\n`;
  if (header.targetRole) {
    markdown += `**${header.targetRole}**\n\n`;
  }

  // Contact
  const contactItems: string[] = [];
  if (header.email) contactItems.push(`📧 ${header.email}`);
  if (header.phone) contactItems.push(`📞 ${header.phone}`);
  if (header.linkedin) contactItems.push(`🔗 ${header.linkedin}`);
  if (header.github) contactItems.push(`💻 ${header.github}`);
  if (header.portfolio) contactItems.push(`🌐 ${header.portfolio}`);

  if (contactItems.length > 0) {
    markdown += `${contactItems.join("   |   ")}\n\n`;
  }

  // Professional Summary
  if (summary) {
    markdown += `## Professional Summary\n\n${summary}\n\n`;
  }

  // Skills
  if (skills.length > 0) {
    markdown += `## Skills\n\n`;
    markdown += `• ${skills.join(", ")}\n\n`;
  }

  // Experience
  if (experience.length > 0) {
    markdown += `## Experience\n\n`;
    experience.forEach((exp) => {
      markdown += `### ${exp.jobTitle} | ${exp.company}\n`;
      const dateRange = exp.isCurrent
        ? `${exp.startDate} - Present`
        : `${exp.startDate} - ${exp.endDate}`;
      markdown += `*${dateRange}*\n\n`;
      exp.bullets.forEach((bullet) => {
        if (bullet.trim()) {
          markdown += `- ${bullet}\n`;
        }
      });
      markdown += "\n";
    });
  }

  // Projects
  if (projects.length > 0) {
    markdown += `## Projects\n\n`;
    projects.forEach((project) => {
      markdown += `### ${project.title}\n`;
      if (project.techStack.length > 0) {
        markdown += `**Tech Stack:** ${project.techStack.join(", ")}\n\n`;
      }
      project.description.forEach((desc) => {
        if (desc.trim()) {
          markdown += `- ${desc}\n`;
        }
      });
      if (project.githubLink) {
        markdown += `- GitHub: ${project.githubLink}\n`;
      }
      if (project.liveLink) {
        markdown += `- Live: ${project.liveLink}\n`;
      }
      markdown += "\n";
    });
  }

  // Education
  if (education.degree || education.college) {
    markdown += `## Education\n\n`;
    markdown += `### ${education.degree}${education.branch ? ` in ${education.branch}` : ""}\n`;
    markdown += `*${education.college}${education.startYear && education.endYear ? ` | ${education.startYear} - ${education.endYear}` : ""}*\n`;
    if (education.cgpa) {
      markdown += `- GPA: ${education.cgpa}\n`;
    }
    markdown += "\n";
  }

  // Certifications
  if (certifications.length > 0) {
    markdown += `## Certifications\n\n`;
    certifications.forEach((cert) => {
      markdown += `- **${cert.title}** - ${cert.issuer}${cert.year ? ` (${cert.year})` : ""}\n`;
    });
    markdown += "\n";
  }

  return markdown;
}











