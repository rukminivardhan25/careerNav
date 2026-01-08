/**
 * Resume data types
 */

export interface ResumeHeader {
  fullName: string;
  targetRole: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

export interface Experience {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bullets: string[]; // Max 4
}

export interface Project {
  id: string;
  title: string;
  techStack: string[];
  description: string[];
  githubLink: string;
  liveLink: string;
}

export interface Education {
  degree: string;
  branch: string;
  college: string;
  startYear: string;
  endYear: string;
  cgpa: string;
}

export interface Certification {
  id: string;
  title: string;
  issuer: string;
  year: string;
}

export interface ResumeData {
  header: ResumeHeader;
  summary: string;
  skills: string[];
  experience: Experience[];
  projects: Project[];
  education: Education;
  certifications: Certification[];
}








