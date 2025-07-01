// Resume parsing service for extracting structured data from resume text
export interface ResumeSection {
  id: string;
  type: string;
  title: string;
  content: string;
  order: number;
  subsections?: ResumeSubsection[];
}

export interface ResumeSubsection {
  id: string;
  type: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface ParsedResume {
  sections: ResumeSection[];
  metadata: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
  };
}

export class ResumeParsingService {
  private static sectionHeaders = {
    // Contact Information
    'contact': ['contact', 'contact information', 'personal information'],
    
    // Professional Summary
    'summary': ['professional summary', 'summary', 'objective', 'career objective', 'profile', 'about'],
    
    // Work Experience
    'experience': ['work experience', 'experience', 'employment', 'professional experience', 'career history', 'work history'],
    
    // Education
    'education': ['education', 'educational background', 'academic background', 'qualifications'],
    
    // Skills
    'skills': ['skills', 'technical skills', 'core competencies', 'competencies', 'expertise', 'proficiencies'],
    
    // Achievements
    'achievements': ['achievements', 'accomplishments', 'awards', 'honors', 'recognition'],
    
    // Projects
    'projects': ['projects', 'key projects', 'notable projects', 'project experience'],
    
    // Certifications
    'certifications': ['certifications', 'certificates', 'professional certifications', 'licenses'],
    
    // Additional sections
    'languages': ['languages', 'language skills'],
    'interests': ['interests', 'hobbies', 'personal interests'],
    'references': ['references', 'professional references'],
    'volunteer': ['volunteer experience', 'volunteer work', 'community service']
  };

  static parseResume(text: string): ParsedResume {
    const lines = text.split('\n').filter(line => line.trim());
    const sections: ResumeSection[] = [];
    const metadata = this.extractMetadata(text);
    
    let currentSectionType = 'summary';
    let currentContent: string[] = [];
    let sectionOrder = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if this line is a section header
      const detectedSection = this.detectSectionType(line);
      
      if (detectedSection && this.isLikelySectionHeader(line, lines, i)) {
        // Save previous section if it has content
        if (currentContent.length > 0) {
          sections.push({
            id: `section-${sectionOrder}`,
            type: currentSectionType,
            title: this.getSectionTitle(currentSectionType),
            content: currentContent.join('\n'),
            order: sectionOrder,
            subsections: this.parseSubsections(currentSectionType, currentContent)
          });
          sectionOrder++;
        }

        // Start new section
        currentSectionType = detectedSection;
        currentContent = [];
      } else {
        // Add line to current section
        currentContent.push(line);
      }
    }

    // Add final section
    if (currentContent.length > 0) {
      sections.push({
        id: `section-${sectionOrder}`,
        type: currentSectionType,
        title: this.getSectionTitle(currentSectionType),
        content: currentContent.join('\n'),
        order: sectionOrder,
        subsections: this.parseSubsections(currentSectionType, currentContent)
      });
    }

    return { sections, metadata };
  }

  private static extractMetadata(text: string): ParsedResume['metadata'] {
    const metadata: ParsedResume['metadata'] = {};
    
    // Email regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
      metadata.email = emailMatch[0];
    }

    // Phone regex (various formats)
    const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
      metadata.phone = phoneMatch[0];
    }

    // LinkedIn URL
    const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9-]+/g;
    const linkedinMatch = text.match(linkedinRegex);
    if (linkedinMatch) {
      metadata.linkedin = linkedinMatch[0];
    }

    // Website/Portfolio URL
    const websiteRegex = /(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+\.[A-Za-z]{2,}(?:\/[^\s]*)?/g;
    const websiteMatches = text.match(websiteRegex);
    if (websiteMatches) {
      // Filter out email domains and LinkedIn
      const websites = websiteMatches.filter(url => 
        !url.includes('linkedin.com') && 
        !url.includes('@') &&
        !url.includes('gmail.com') &&
        !url.includes('yahoo.com') &&
        !url.includes('outlook.com')
      );
      if (websites.length > 0) {
        metadata.website = websites[0];
      }
    }

    // Extract name (usually first non-contact line)
    const lines = text.split('\n').filter(line => line.trim());
    for (const line of lines.slice(0, 5)) {
      const trimmedLine = line.trim();
      if (
        trimmedLine.length > 2 &&
        trimmedLine.length < 50 &&
        !emailRegex.test(trimmedLine) &&
        !phoneRegex.test(trimmedLine) &&
        !linkedinRegex.test(trimmedLine) &&
        !websiteRegex.test(trimmedLine) &&
        !this.detectSectionType(trimmedLine)
      ) {
        metadata.name = trimmedLine;
        break;
      }
    }

    return metadata;
  }

  private static detectSectionType(line: string): string | null {
    const lowerLine = line.toLowerCase().trim();
    
    // Skip if line is too long to be a header
    if (line.length > 100) return null;
    
    for (const [sectionType, headers] of Object.entries(this.sectionHeaders)) {
      for (const header of headers) {
        if (lowerLine === header || lowerLine.includes(header)) {
          return sectionType;
        }
      }
    }
    
    return null;
  }

  private static isLikelySectionHeader(line: string, allLines: string[], index: number): boolean {
    // Check if line is formatted like a header
    const isAllCaps = line === line.toUpperCase();
    const isShort = line.length < 50;
    const hasColonOrDash = line.includes(':') || line.includes('-');
    const isStandalone = index === 0 || allLines[index - 1]?.trim() === '';
    
    // Additional checks
    const nextLineExists = index < allLines.length - 1;
    const nextLineIsContent = nextLineExists && allLines[index + 1]?.trim().length > 0;
    
    return (isAllCaps || hasColonOrDash || isStandalone) && isShort && nextLineIsContent;
  }

  private static parseSubsections(sectionType: string, content: string[]): ResumeSubsection[] {
    const subsections: ResumeSubsection[] = [];
    
    switch (sectionType) {
      case 'experience':
        return this.parseExperienceSubsections(content);
      case 'education':
        return this.parseEducationSubsections(content);
      case 'projects':
        return this.parseProjectSubsections(content);
      case 'skills':
        return this.parseSkillsSubsections(content);
      default:
        return [];
    }
  }

  private static parseExperienceSubsections(content: string[]): ResumeSubsection[] {
    const subsections: ResumeSubsection[] = [];
    let currentJob: string[] = [];
    let jobIndex = 0;

    for (const line of content) {
      // Detect job title/company lines (usually contain dates or company indicators)
      const hasDate = /\d{4}|\d{1,2}\/\d{4}|present|current/i.test(line);
      const looksLikeJobTitle = line.length < 100 && (hasDate || this.containsCompanyIndicators(line));
      
      if (looksLikeJobTitle && currentJob.length > 0) {
        // Save previous job
        subsections.push({
          id: `job-${jobIndex}`,
          type: 'job',
          content: currentJob.join('\n'),
          metadata: this.extractJobMetadata(currentJob)
        });
        jobIndex++;
        currentJob = [line];
      } else {
        currentJob.push(line);
      }
    }

    // Add final job
    if (currentJob.length > 0) {
      subsections.push({
        id: `job-${jobIndex}`,
        type: 'job',
        content: currentJob.join('\n'),
        metadata: this.extractJobMetadata(currentJob)
      });
    }

    return subsections;
  }

  private static parseEducationSubsections(content: string[]): ResumeSubsection[] {
    const subsections: ResumeSubsection[] = [];
    let currentEducation: string[] = [];
    let eduIndex = 0;

    for (const line of content) {
      const hasDate = /\d{4}|\d{1,2}\/\d{4}/i.test(line);
      const hasDegree = /bachelor|master|phd|doctorate|diploma|certificate|degree/i.test(line);
      
      if ((hasDate || hasDegree) && currentEducation.length > 0) {
        subsections.push({
          id: `education-${eduIndex}`,
          type: 'education',
          content: currentEducation.join('\n'),
          metadata: this.extractEducationMetadata(currentEducation)
        });
        eduIndex++;
        currentEducation = [line];
      } else {
        currentEducation.push(line);
      }
    }

    if (currentEducation.length > 0) {
      subsections.push({
        id: `education-${eduIndex}`,
        type: 'education',
        content: currentEducation.join('\n'),
        metadata: this.extractEducationMetadata(currentEducation)
      });
    }

    return subsections;
  }

  private static parseProjectSubsections(content: string[]): ResumeSubsection[] {
    const subsections: ResumeSubsection[] = [];
    let currentProject: string[] = [];
    let projectIndex = 0;

    for (const line of content) {
      // Project titles are usually short and may contain technologies or dates
      const looksLikeProjectTitle = line.length < 80 && 
        (line.includes('|') || line.includes('-') || /\d{4}/.test(line));
      
      if (looksLikeProjectTitle && currentProject.length > 0) {
        subsections.push({
          id: `project-${projectIndex}`,
          type: 'project',
          content: currentProject.join('\n'),
          metadata: this.extractProjectMetadata(currentProject)
        });
        projectIndex++;
        currentProject = [line];
      } else {
        currentProject.push(line);
      }
    }

    if (currentProject.length > 0) {
      subsections.push({
        id: `project-${projectIndex}`,
        type: 'project',
        content: currentProject.join('\n'),
        metadata: this.extractProjectMetadata(currentProject)
      });
    }

    return subsections;
  }

  private static parseSkillsSubsections(content: string[]): ResumeSubsection[] {
    const subsections: ResumeSubsection[] = [];
    
    // Try to identify skill categories
    let currentCategory: string[] = [];
    let categoryIndex = 0;

    for (const line of content) {
      const looksLikeCategory = line.includes(':') || 
        /^(technical|programming|languages|tools|frameworks|databases)/i.test(line);
      
      if (looksLikeCategory && currentCategory.length > 0) {
        subsections.push({
          id: `skill-category-${categoryIndex}`,
          type: 'skill_category',
          content: currentCategory.join('\n'),
          metadata: { category: currentCategory[0] }
        });
        categoryIndex++;
        currentCategory = [line];
      } else {
        currentCategory.push(line);
      }
    }

    if (currentCategory.length > 0) {
      subsections.push({
        id: `skill-category-${categoryIndex}`,
        type: 'skill_category',
        content: currentCategory.join('\n'),
        metadata: { category: currentCategory[0] }
      });
    }

    return subsections;
  }

  private static containsCompanyIndicators(line: string): boolean {
    const indicators = ['inc', 'llc', 'corp', 'company', 'ltd', 'technologies', 'systems', 'solutions'];
    const lowerLine = line.toLowerCase();
    return indicators.some(indicator => lowerLine.includes(indicator));
  }

  private static extractJobMetadata(jobLines: string[]): Record<string, any> {
    const metadata: Record<string, any> = {};
    const content = jobLines.join(' ');
    
    // Extract dates
    const dateRegex = /(\d{1,2}\/\d{4}|\d{4}|present|current)/gi;
    const dates = content.match(dateRegex);
    if (dates) {
      metadata.dates = dates;
    }

    // Extract job title (usually first line)
    if (jobLines.length > 0) {
      metadata.title = jobLines[0];
    }

    return metadata;
  }

  private static extractEducationMetadata(eduLines: string[]): Record<string, any> {
    const metadata: Record<string, any> = {};
    const content = eduLines.join(' ');
    
    // Extract degree
    const degreeRegex = /(bachelor|master|phd|doctorate|diploma|certificate|degree)[^,\n]*/i;
    const degreeMatch = content.match(degreeRegex);
    if (degreeMatch) {
      metadata.degree = degreeMatch[0];
    }

    // Extract institution
    if (eduLines.length > 0) {
      metadata.institution = eduLines[0];
    }

    return metadata;
  }

  private static extractProjectMetadata(projectLines: string[]): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    if (projectLines.length > 0) {
      metadata.title = projectLines[0];
    }

    // Extract technologies (look for common tech keywords)
    const content = projectLines.join(' ').toLowerCase();
    const techKeywords = ['javascript', 'python', 'react', 'node', 'sql', 'aws', 'docker', 'git'];
    const foundTech = techKeywords.filter(tech => content.includes(tech));
    if (foundTech.length > 0) {
      metadata.technologies = foundTech;
    }

    return metadata;
  }

  private static getSectionTitle(type: string): string {
    const titles: Record<string, string> = {
      contact: 'Contact Information',
      summary: 'Professional Summary',
      experience: 'Work Experience',
      education: 'Education',
      skills: 'Skills',
      achievements: 'Achievements',
      projects: 'Projects',
      certifications: 'Certifications',
      languages: 'Languages',
      interests: 'Interests',
      references: 'References',
      volunteer: 'Volunteer Experience'
    };
    
    return titles[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }
}