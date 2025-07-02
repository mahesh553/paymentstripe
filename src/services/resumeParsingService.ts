// types.ts (Assuming these types are defined elsewhere or inline)

/**
 * Represents the parsed metadata from a resume.
 */
export interface ResumeMetadata {
    name: string | null;
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    location: string | null; // Added location
    [key: string]: string | null; // Allow for other generic metadata
}

/**
 * Represents a section in the resume (e.g., "Experience", "Education").
 */
export interface ResumeSection {
    type: string; // e.g., 'summary', 'experience', 'education', 'skills', 'projects', 'awards', 'certifications', 'custom'
    title: string; // The actual header found in the resume
    content: string; // Raw text content of the section
    subsections?: ResumeSubsection[]; // Structured details within the section
}

/**
 * Represents a structured entry within a section (e.g., a single job, a single degree).
 */
export interface ResumeSubsection {
    id: string; // Unique identifier for the subsection
    rawText: string; // The original text chunk for this subsection
    type?: string; // e.g., 'job', 'degree', 'project_entry', 'skill_category', 'skill_item'
    title?: string; // e.g., Job Title, Degree Name, Project Name, Skill Category
    organization?: string; // e.g., Company Name, University Name
    location?: string;
    startDate?: string; // Standardized format (YYYY-MM or YYYY)
    endDate?: string; // Standardized format (YYYY-MM or YYYY or 'Present')
    description?: string | string[]; // Raw description or array of bullet points
    skills?: string[]; // Specific to project/experience/skills
    [key: string]: any; // Allow for other fields
}

/**
 * Represents the fully parsed resume.
 */
export interface ParsedResume {
    metadata: ResumeMetadata;
    sections: ResumeSection[];
    rawText: string;
}

// -----------------------------------------------------------------------------
// ResumeParsingService.ts
// -----------------------------------------------------------------------------

import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs for subsections

export class ResumeParsingService {

    private sectionHeaders: { [key: string]: string[] } = {
        'summary': ['summary', 'profile', 'professional summary', 'objective'],
        'experience': ['experience', 'work experience', 'professional experience', 'employment history'],
        'education': ['education', 'academic background'],
        'skills': ['skills', 'technical skills', 'core competencies', 'proficiencies', 'abilities'],
        'projects': ['projects', 'personal projects', 'portfolio'],
        'awards': ['awards', 'honors', 'recognitions'],
        'certifications': ['certifications', 'licenses', 'professional development'],
        'volunteer': ['volunteer experience', 'community involvement'],
        'publications': ['publications', 'research'],
        'interests': ['interests', 'hobbies'],
        'languages': ['languages'],
    };

    /**
     * Parses a raw resume text into a structured JSON object.
     * @param rawText The full text content of the resume.
     * @returns A ParsedResume object.
     */
    public parseResume(rawText: string): ParsedResume {
        const cleanedText = this.cleanResumeText(rawText);
        const lines = cleanedText.split('\n');

        const metadata = this.extractMetadata(lines);
        const sections = this.segmentSections(lines);

        // Enhance sections by parsing subsections
        const enhancedSections = sections.map(section => {
            let subsections: ResumeSubsection[] = [];
            switch (section.type) {
                case 'experience':
                    subsections = this.parseExperienceSubsections(section.content);
                    break;
                case 'education':
                    subsections = this.parseEducationSubsections(section.content);
                    break;
                case 'projects':
                    subsections = this.parseProjectSubsections(section.content);
                    break;
                case 'skills':
                    subsections = this.parseSkillsSubsections(section.content);
                    break;
                // Add more cases for other types if they need structured subsections
                default:
                    // For sections like summary, awards, etc., content might be enough,
                    // or you might send the whole content to an LLM for summarization/keyphrase extraction.
                    break;
            }
            return { ...section, subsections };
        });

        return {
            metadata,
            sections: enhancedSections,
            rawText: cleanedText,
        };
    }

    /**
     * Cleans the raw resume text for better parsing.
     * - Normalizes line endings.
     * - Removes excessive whitespace.
     * - Trims leading/trailing whitespace from each line.
     * @param text The raw resume text.
     * @returns Cleaned text.
     */
    private cleanResumeText(text: string): string {
        return text
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/\t/g, '    ') // Replace tabs with spaces
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0) // Remove empty lines
            .join('\n');
    }

    /**
     * Extracts personal metadata from the initial lines of the resume.
     * This uses rule-based (regex) extraction.
     * @param lines An array of resume lines.
     * @returns ResumeMetadata object.
     */
    private extractMetadata(lines: string[]): ResumeMetadata {
        const rawTextSample = lines.slice(0, Math.min(20, lines.length)).join('\n'); // Look at top 20 lines

        const metadata: ResumeMetadata = {
            name: null,
            email: null,
            phone: null,
            linkedin: null,
            location: null,
        };

        // Name (usually first non-empty line, often uppercase or very prominent)
        // This is a heuristic and might need fine-tuning for specific resume styles.
        if (lines.length > 0) {
            let potentialName = lines[0].trim();
            // Try to find the most prominent line in the first few as the name
            for (let i = 0; i < Math.min(5, lines.length); i++) {
                const line = lines[i].trim();
                if (line.length > 0 && line === line.toUpperCase() && line.length > 2 && !this.isLikelySectionHeader(line)) {
                    potentialName = line;
                    break;
                }
            }
            // Basic heuristic: if it contains many words and looks like a name
            if (potentialName.split(/\s+/).length >= 1 && potentialName.length < 50) {
                 metadata.name = potentialName;
            }
        }
        
        // Email (common patterns)
        const emailMatch = rawTextSample.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) metadata.email = emailMatch[0];

        // Phone (common international and national patterns, allowing various delimiters)
        const phoneMatch = rawTextSample.match(/(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?){2,}\d{2,4}(?:x\d+)?/);
        if (phoneMatch) metadata.phone = phoneMatch[0];

        // LinkedIn (common patterns)
        const linkedinMatch = rawTextSample.match(/(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/);
        if (linkedinMatch) metadata.linkedin = 'https://' + linkedinMatch[0];

        // Location (City, State, Country, or combinations)
        // This is highly variable and often needs broader patterns
        const locationMatch = rawTextSample.match(
            /\b([A-Za-z]+(?:[\s-][A-Za-z]+)*),\s*([A-Za-z]{2,}(?:\s+[A-Za-z]+)*)\s*(?:\d{5}(?:-\d{4})?)?\b|\b([A-Za-z]+(?:[\s-][A-Za-z]+)*),\s*([A-Za-z]+)\b/ // City, State/Country, Zip or City, Country
        );
        if (locationMatch) {
            // Pick the most likely match from the groups
            metadata.location = (locationMatch[1] && locationMatch[2]) ? `${locationMatch[1]}, ${locationMatch[2].trim()}` :
                                (locationMatch[3] && locationMatch[4]) ? `${locationMatch[3]}, ${locationMatch[4].trim()}` :
                                null;
        }


        // IMPORTANT: For more accurate and flexible metadata extraction,
        // especially for names and locations which are highly unstructured,
        // you would often send the first ~10-20 lines to an LLM (like Gemini).
        // Example LLM prompt idea:
        // "From the following text, extract the candidate's full name, email, phone number, LinkedIn URL, and current location.
        // Return null if not found. Format as JSON: {name: '...', email: '...', ...}"
        // const llmMetadata = await callGeminiAPI(rawTextSample, "extract personal info");
        // Object.assign(metadata, llmMetadata); // Merge or replace rule-based findings

        return metadata;
    }

    /**
     * Segments the resume into major sections based on identified headers.
     * @param lines An array of resume lines.
     * @returns An array of ResumeSection objects.
     */
    private segmentSections(lines: string[]): ResumeSection[] {
        const sections: ResumeSection[] = [];
        let currentSectionType: string = 'summary'; // Assume first content is summary if no header
        let currentSectionTitle: string = 'Summary';
        let currentSectionContent: string[] = [];

        // Pre-process lines to detect section boundaries more reliably
        const processedLines: { text: string; isHeader: boolean; headerType: string | null; headerTitle: string | null }[] = lines.map(line => {
            const lowerLine = line.toLowerCase();
            for (const type in this.sectionHeaders) {
                for (const header of this.sectionHeaders[type]) {
                    if (lowerLine === header || (lowerLine.startsWith(header) && (line.length - header.length < 5))) { // Allow slight variations
                        return { text: line, isHeader: true, headerType: type, headerTitle: line };
                    }
                }
            }
            return { text: line, isHeader: false, headerType: null, headerTitle: null };
        });

        // Add an implicit 'summary' section if the first lines are not a header
        if (processedLines.length > 0 && !processedLines[0].isHeader) {
            sections.push({ type: 'summary', title: 'Summary', content: '' }); // Placeholder, content added below
        }


        processedLines.forEach((pLine, index) => {
            const line = pLine.text;

            if (pLine.isHeader) {
                // If it's a new header, push the previous section
                if (currentSectionContent.length > 0 || sections.length === 0) { // Ensure content before pushing
                     if (sections.length > 0 && sections[sections.length - 1].type === currentSectionType) {
                        // If it's the first section or a subsequent section of the same type, append content
                        sections[sections.length - 1].content += '\n' + currentSectionContent.join('\n');
                     } else {
                        sections.push({
                            type: currentSectionType,
                            title: currentSectionTitle,
                            content: currentSectionContent.join('\n'),
                        });
                     }
                }
                currentSectionType = pLine.headerType!;
                currentSectionTitle = pLine.headerTitle!;
                currentSectionContent = [];
            } else {
                currentSectionContent.push(line);
            }
        });

        // Add the last section
        if (currentSectionContent.length > 0) {
            if (sections.length > 0 && sections[sections.length - 1].type === currentSectionType) {
                sections[sections.length - 1].content += '\n' + currentSectionContent.join('\n');
            } else {
                sections.push({
                    type: currentSectionType,
                    title: currentSectionTitle,
                    content: currentSectionContent.join('\n'),
                });
            }
        }

        // Clean up empty summary if no content was added to it
        if (sections.length > 0 && sections[0].type === 'summary' && sections[0].content.trim() === '') {
            // Remove the placeholder if real content started with a header
            const actualContentStart = processedLines.findIndex(pl => !pl.isHeader);
            if (actualContentStart !== -1 && processedLines[actualContentStart].text.trim() !== '') {
                 sections[0].content = processedLines.slice(0, processedLines.findIndex(pl => pl.isHeader && pl.headerType !== 'summary')).map(pl => pl.text).join('\n').trim();
            } else {
                // If the very first content line is actually part of a *real* first section
                // after metadata and before any explicit header, it could be a summary
                // Let's ensure if summary is *empty* at start, it either gets content or removed
                if (sections[0].content.trim() === '' && sections.length > 1) {
                     sections.shift(); // Remove empty summary if a real section followed immediately
                }
            }
        }


        return sections.filter(s => s.content.trim().length > 0); // Filter out truly empty sections
    }


    /**
     * Helper to detect if a line is likely a section header.
     * This is a simple rule-based approach. LLMs are much better at this.
     * @param line The line to check.
     * @returns True if it's likely a header.
     */
    private isLikelySectionHeader(line: string): boolean {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) return false;

        const lowerLine = trimmedLine.toLowerCase();
        for (const type in this.sectionHeaders) {
            for (const header of this.sectionHeaders[type]) {
                if (lowerLine === header) {
                    return true;
                }
                // Allow for headers with trailing punctuation like a colon, or slightly different casing
                if (lowerLine.startsWith(header) && (lowerLine.length - header.length <= 2) && (lowerLine.endsWith(':') || lowerLine.endsWith('.'))) {
                    return true;
                }
            }
        }

        // Heuristic: Fully capitalized words, short length, no typical content punctuation
        const isAllCaps = trimmedLine === trimmedLine.toUpperCase() && trimmedLine !== trimmedLine.toLowerCase();
        const isShort = trimmedLine.split(/\s+/).length <= 4 && trimmedLine.length < 30; // Max 4 words, <30 chars
        const hasNoPunctuation = !/[.,!?;]/.test(trimmedLine); // No sentence-ending punctuation

        // Avoid common abbreviations that might look like headers
        const isCommonAbbrev = /^(inc|llc|co|corp|ltd|mfg|assoc)\.?$/.test(lowerLine);

        return isAllCaps && isShort && hasNoPunctuation && !isCommonAbbrev;
    }


    /**
     * Parses the content of the "Experience" section into individual job entries.
     * This is where a rule-based approach can become complex and where LLMs excel.
     * @param content The raw text content of the experience section.
     * @returns An array of ResumeSubsection for jobs.
     */
    private parseExperienceSubsections(content: string): ResumeSubsection[] {
        const subsections: ResumeSubsection[] = [];
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        let currentJobLines: string[] = [];
        let newJobDetected = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Heuristic for new job entry:
            // 1. Line contains a date range (YYYY - YYYY or YYYY - Present)
            // 2. Line looks like a job title/company (often bold or distinct)
            // 3. Significant indentation change or blank line followed by new text.
            const isDateRange = this.looksLikeDateRange(line);
            const isCompanyNameOrTitle = line.length < 80 && line.split(/\s+/).length <= 10 && (line.includes(',') || line.includes(' at ') || line === line.toUpperCase() || line.startsWith('• ')); // Simplified

            if (currentJobLines.length > 0 && (isDateRange || isCompanyNameOrTitle)) {
                 // Check if the current line is *significantly* different from the previous job's start
                 // This is tricky with rules; LLMs shine here.
                 // For now, if we found a strong indicator of a new job, push the old one.
                newJobDetected = true;
            } else if (currentJobLines.length > 0 && line.match(/^\s*•/)) {
                // If it's a bullet point, it's likely part of the current job
                newJobDetected = false;
            } else if (currentJobLines.length > 0 && lines[i - 1]?.trim() === '' && line.length > 0) {
                 // Blank line followed by content might also signify new entry
                 newJobDetected = true;
            }

            if (newJobDetected && currentJobLines.length > 0) {
                const rawText = currentJobLines.join('\n');
                subsections.push({
                    id: uuidv4(),
                    rawText: rawText,
                    type: 'job',
                    ...this.extractJobMetadata(rawText)
                });
                currentJobLines = [line]; // Start new job with current line
                newJobDetected = false;
            } else {
                currentJobLines.push(line);
            }
        }

        // Add the last job entry
        if (currentJobLines.length > 0) {
            const rawText = currentJobLines.join('\n');
            subsections.push({
                id: uuidv4(),
                rawText: rawText,
                type: 'job',
                ...this.extractJobMetadata(rawText)
            });
        }

        // LLM Integration Point:
        // For more accurate job title, company, dates, and bullet point parsing,
        // you would send the `content` of the *entire* experience section to an LLM.
        // Prompt example: "Parse the following work experience section into an array of job objects.
        // Each object should have title, company, location, startDate (YYYY-MM), endDate (YYYY-MM or 'Present'),
        // and description (array of bullet points). Return JSON."
        // The LLM would handle the segmentation and detailed extraction much better.

        return subsections;
    }

    /**
     * Extracts metadata for a single job entry.
     * @param jobText The text for a single job entry.
     */
    private extractJobMetadata(jobText: string): Partial<ResumeSubsection> {
        const metadata: Partial<ResumeSubsection> = {};

        // Dates (e.g., "YYYY - YYYY", "MM/YYYY - MM/YYYY", "Month YYYY - Present")
        const dateRangeMatch = jobText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})[.,\s-]*\d{4})\s*[-–—]\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})[.,\s-]*\d{4}|Present|Current|Now)|(\d{4})\s*[-–—]\s*(\d{4}|Present|Current|Now)/i);
        if (dateRangeMatch) {
            metadata.startDate = this.normalizeDate(dateRangeMatch[1] || dateRangeMatch[3]);
            metadata.endDate = this.normalizeDate(dateRangeMatch[2] || dateRangeMatch[4]);
            // Remove dates from the text for easier extraction of other fields
            jobText = jobText.replace(dateRangeMatch[0], '').trim();
        }

        const lines = jobText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Job Title (often first prominent line after dates, or before company)
        // Company Name (often bold, or after title)
        // Location (City, State/Country)
        // This is highly heuristic and can fail. LLMs are excellent for this.
        if (lines.length > 0) {
            let potentialTitleOrCompany = lines[0];
            let potentialLocation = lines[1];

            // Heuristic for Title/Company/Location based on typical resume ordering
            // Example: "Software Engineer | Google | Mountain View, CA"
            // Or: "Google - Software Engineer, Mountain View, CA"
            const firstLineParts = potentialTitleOrCompany.split(/[\s|,-]/).map(p => p.trim()).filter(p => p.length > 0);
            if (firstLineParts.length >= 2) {
                // Simple assumption: first part is title, second is company, or vice-versa
                metadata.title = firstLineParts[0]; // Could be title or company
                metadata.organization = firstLineParts[1]; // Could be company or title
            } else {
                metadata.title = potentialTitleOrCompany; // Fallback
            }

            // Try to find a company name if not clearly identified
            const companyMatch = jobText.match(/(at|@)\s+([A-Z][a-zA-Z\s.-]+(?:Inc|LLC|Corp|Ltd|\b))\b/i);
            if (companyMatch) {
                metadata.organization = companyMatch[2];
            } else {
                // Fallback to second line if it looks like a company or organization
                const orgCandidate = lines.find(l => l.length < 50 && l.match(/[A-Z][a-zA-Z\s.-]*(?:University|College|School|Inc|LLC|Corp|Ltd|Group|Solutions)\b/));
                if (orgCandidate) metadata.organization = orgCandidate;
            }


            // Location
            const locationMatch = jobText.match(/\b([A-Za-z]+(?:[\s-][A-Za-z]+)*),\s*([A-Za-z]{2,}(?:\s+[A-Za-z]+)*)\s*(?:\d{5}(?:-\d{4})?)?\b|\b([A-Za-z]+(?:[\s-][A-Za-z]+)*),\s*([A-Za-z]+)\b/);
            if (locationMatch) {
                metadata.location = (locationMatch[1] && locationMatch[2]) ? `${locationMatch[1]}, ${locationMatch[2].trim()}` :
                                    (locationMatch[3] && locationMatch[4]) ? `${locationMatch[3]}, ${locationMatch[4].trim()}` :
                                    null;
            }
        }


        // Description (bullet points)
        // Split by lines that start with a bullet point or significant indentation
        const bulletPoints = jobText.split('\n')
                                    .filter(line => line.trim().length > 0)
                                    .map(line => line.replace(/^[\s•*-]+\s*/, '').trim()) // Remove common bullet chars
                                    .filter(line => line.length > 0); // Remove any lines that became empty after cleaning

        if (bulletPoints.length > 0) {
            metadata.description = bulletPoints;
        }


        return metadata;
    }

    private looksLikeDateRange(line: string): boolean {
        // Examples: "2020 - 2022", "Jan 2020 - Dec 2022", "01/2020 - Present"
        return /((\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\d{1,2})[.,\s-]*\d{4})\s*[-–—]\s*((\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\d{1,2})[.,\s-]*\d{4}|Present|Current|Now)/i.test(line) ||
               /(\d{4})\s*[-–—]\s*(\d{4}|Present|Current|Now)/i.test(line);
    }

    private normalizeDate(dateStr: string | undefined): string | undefined {
        if (!dateStr) return undefined;
        dateStr = dateStr.trim().replace(/[,.]/g, '');

        if (/present|current|now/i.test(dateStr)) return 'Present';

        const monthMap: { [key: string]: string } = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
            'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };

        const parts = dateStr.split(/[\s/-]/);

        if (parts.length === 2) { // e.g., "Jan 2020", "01/2020"
            let month = parts[0];
            let year = parts[1];
            if (isNaN(parseInt(month))) { // Month name
                month = monthMap[month.toLowerCase().substring(0, 3)];
            } else if (month.length === 1) { // Single digit month
                month = `0${month}`;
            }
            if (month && year) return `${year}-${month}`;
        } else if (parts.length === 1 && !isNaN(parseInt(parts[0])) && parts[0].length === 4) { // e.g., "2020"
            return parts[0];
        }

        return dateStr; // Return original if cannot normalize
    }


    /**
     * Parses the content of the "Education" section into individual education entries.
     * @param content The raw text content of the education section.
     * @returns An array of ResumeSubsection for education.
     */
    private parseEducationSubsections(content: string): ResumeSubsection[] {
        const subsections: ResumeSubsection[] = [];
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        let currentEducationLines: string[] = [];
        let newEntryDetected = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Heuristic for new education entry:
            // 1. Contains a degree or institution name
            // 2. Contains a year range
            const isDegreeOrInstitution = line.match(/(Bachelor|Master|Ph\.?D|Associate|Diploma|Certificat)/i) || line.length < 80 && (line.includes('University') || line.includes('College') || line.includes('Institute'));
            const isYear = /\b\d{4}\b/.test(line); // Looks like a year

            if (currentEducationLines.length > 0 && (isDegreeOrInstitution || isYear) && !currentEducationLines.some(l => l.includes(line))) {
                newEntryDetected = true;
            }

            if (newEntryDetected && currentEducationLines.length > 0) {
                const rawText = currentEducationLines.join('\n');
                subsections.push({
                    id: uuidv4(),
                    rawText: rawText,
                    type: 'degree',
                    ...this.extractEducationMetadata(rawText)
                });
                currentEducationLines = [line];
                newEntryDetected = false;
            } else {
                currentEducationLines.push(line);
            }
        }

        if (currentEducationLines.length > 0) {
            const rawText = currentEducationLines.join('\n');
            subsections.push({
                id: uuidv4(),
                rawText: rawText,
                type: 'degree',
                ...this.extractEducationMetadata(rawText)
            });
        }

        // LLM Integration Point:
        // You can send the raw content of the education section to Gemini for more robust parsing.
        // Prompt example: "Extract education entries from this text. Each entry should have
        // 'degree', 'institution', 'location', 'startDate' (YYYY-MM), 'endDate' (YYYY-MM). Return JSON."
        return subsections;
    }

    /**
     * Extracts metadata for a single education entry.
     * @param educationText The text for a single education entry.
     */
    private extractEducationMetadata(educationText: string): Partial<ResumeSubsection> {
        const metadata: Partial<ResumeSubsection> = {};

        // Dates (e.g., "YYYY - YYYY", "YYYY")
        const yearRangeMatch = educationText.match(/(\d{4})\s*[-–—]\s*(\d{4}|Present|Current|Expected)|\b(\d{4})\b/i);
        if (yearRangeMatch) {
            metadata.startDate = yearRangeMatch[1] || yearRangeMatch[3];
            metadata.endDate = yearRangeMatch[2];
            educationText = educationText.replace(yearRangeMatch[0], '').trim();
        }

        // Institution (University, College, School names)
        const institutionMatch = educationText.match(/(?:University|College|School|Institute|Academy)\b([^,\n]*)/i);
        if (institutionMatch) {
            metadata.organization = institutionMatch[0].trim();
            educationText = educationText.replace(institutionMatch[0], '').trim();
        } else {
            // Fallback to the first line as institution if not explicitly found
            const firstLine = educationText.split('\n')[0]?.trim();
            if (firstLine && firstLine.length < 100) {
                metadata.organization = firstLine;
                educationText = educationText.replace(firstLine, '').trim();
            }
        }


        // Degree (e.g., Bachelor of Science, Master of Arts)
        const degreeMatch = educationText.match(/(Bachelor\s*of\s*[\w\s\.]+|(?:B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|Ph\.?D\.?|J\.?D\.?|M\.?D\.?|MBA)\b)/i);
        if (degreeMatch) {
            metadata.title = degreeMatch[0].trim();
            educationText = educationText.replace(degreeMatch[0], '').trim();
        }

        // Location (City, State/Country)
        const locationMatch = educationText.match(/\b([A-Za-z]+(?:[\s-][A-Za-z]+)*),\s*([A-Za-z]{2,}(?:\s+[A-Za-z]+)*)\s*(?:\d{5}(?:-\d{4})?)?\b|\b([A-Za-z]+(?:[\s-][A-Za-z]+)*),\s*([A-Za-z]+)\b/);
        if (locationMatch) {
            metadata.location = (locationMatch[1] && locationMatch[2]) ? `${locationMatch[1]}, ${locationMatch[2].trim()}` :
                                (locationMatch[3] && locationMatch[4]) ? `${locationMatch[3]}, ${locationMatch[4].trim()}` :
                                null;
        }

        // Remaining text as description
        metadata.description = educationText.split('\n').filter(line => line.trim().length > 0);

        return metadata;
    }

    /**
     * Parses the content of the "Projects" section into individual project entries.
     * This is highly dependent on how projects are formatted in the resume.
     * @param content The raw text content of the projects section.
     * @returns An array of ResumeSubsection for projects.
     */
    private parseProjectSubsections(content: string): ResumeSubsection[] {
        const subsections: ResumeSubsection[] = [];
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        let currentProjectLines: string[] = [];
        let newProjectDetected = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Heuristic for new project entry:
            // 1. Line starts with a common project title indicator (e.g., bolded, all caps)
            // 2. Contains a date or year for the project
            // 3. Follows a blank line and looks like a title
            const isProjectTitleCandidate = line.length < 80 && (line.includes(':') || line === line.toUpperCase() || line.startsWith('• '));
            const isYear = /\b\d{4}\b/.test(line); // Looks like a year

            if (currentProjectLines.length > 0 && (isProjectTitleCandidate || isYear) && !currentProjectLines.some(l => l.includes(line))) {
                newProjectDetected = true;
            } else if (currentProjectLines.length > 0 && lines[i - 1]?.trim() === '' && line.length > 0) {
                 newProjectDetected = true;
            }


            if (newProjectDetected && currentProjectLines.length > 0) {
                const rawText = currentProjectLines.join('\n');
                subsections.push({
                    id: uuidv4(),
                    rawText: rawText,
                    type: 'project_entry',
                    ...this.extractProjectMetadata(rawText)
                });
                currentProjectLines = [line];
                newProjectDetected = false;
            } else {
                currentProjectLines.push(line);
            }
        }

        if (currentProjectLines.length > 0) {
            const rawText = currentProjectLines.join('\n');
            subsections.push({
                id: uuidv4(),
                rawText: rawText,
                type: 'project_entry',
                ...this.extractProjectMetadata(rawText)
            });
        }

        // LLM Integration Point:
        // For project details, LLMs are much better at extracting project names, technologies used, descriptions, and links.
        return subsections;
    }

    /**
     * Extracts metadata for a single project entry.
     * @param projectText The text for a single project entry.
     */
    private extractProjectMetadata(projectText: string): Partial<ResumeSubsection> {
        const metadata: Partial<ResumeSubsection> = {};
        const lines = projectText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Project Title (often the first line, especially if it contains a URL or technologies)
        if (lines.length > 0) {
            metadata.title = lines[0]; // Heuristic: first line is title
        }

        // Technologies/Skills (often listed with "Technologies:", "Stack:", or just comma-separated)
        const techMatch = projectText.match(/(?:Technologies|Tech Stack|Tools|Skills):\s*([^\n]+)/i);
        if (techMatch) {
            metadata.skills = techMatch[1].split(/[\s,;]+/).map(s => s.trim()).filter(s => s.length > 0);
        } else {
            // Fallback: look for common tech terms in parenthesis or at end of lines
            const inlineSkills = projectText.match(/\(([^)]+)\)|\b(?:JavaScript|Python|Java|React|Node\.js|AWS|Azure|Docker|Kubernetes|SQL|NoSQL)\b/ig);
            if (inlineSkills) {
                metadata.skills = [...new Set(inlineSkills.flatMap(s => s.replace(/[()]/g, '').split(/[\s,;]+/).map(t => t.trim())).filter(t => t.length > 0))];
            }
        }

        // Description (bullet points or remaining text)
        const descriptionLines = lines.slice(1).map(line => line.replace(/^[\s•*-]+\s*/, '').trim()).filter(line => line.length > 0);
        if (descriptionLines.length > 0) {
            metadata.description = descriptionLines;
        }

        return metadata;
    }

    /**
     * Parses the content of the "Skills" section into individual skill categories and items.
     * This is one of the more challenging rule-based tasks due to varied formats.
     * @param content The raw text content of the skills section.
     * @returns An array of ResumeSubsection representing skill categories/items.
     */
    private parseSkillsSubsections(content: string): ResumeSubsection[] {
        const subsections: ResumeSubsection[] = [];
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        let currentCategory: string | null = null;
        let currentSkills: string[] = [];

        const commitCategory = () => {
            if (currentCategory && currentSkills.length > 0) {
                subsections.push({
                    id: uuidv4(),
                    rawText: `${currentCategory}: ${currentSkills.join(', ')}`, // Reconstruct for rawText
                    type: 'skill_category',
                    title: currentCategory,
                    skills: currentSkills,
                });
            } else if (currentSkills.length > 0) {
                 // Ungrouped skills, treat as a single "General Skills" category
                 subsections.push({
                    id: uuidv4(),
                    rawText: currentSkills.join('\n'),
                    type: 'skill_category',
                    title: 'General Skills', // Default category
                    skills: currentSkills,
                 });
            }
            currentCategory = null;
            currentSkills = [];
        };


        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Heuristic for new skill category:
            // 1. Line ends with a colon (e.g., "Languages:")
            // 2. Line is bold or all caps and short (e.g., "PROGRAMMING LANGUAGES")
            const isCategoryHeader = line.endsWith(':') ||
                                     (line === line.toUpperCase() && line.length < 40) ||
                                     (line.split(/\s+/).length <= 3 && /[A-Z][a-zA-Z\s]+/.test(line));


            if (isCategoryHeader) {
                commitCategory(); // Commit previous category if any
                currentCategory = line.replace(':', '').trim();
            } else {
                // If no current category, and it's not a category header, it's a general skill list
                // Split skills by common delimiters (comma, semicolon, bullet points)
                const skillsInLine = line.split(/[,;\s•*-]+/).map(s => s.trim()).filter(s => s.length > 0);
                currentSkills.push(...skillsInLine);
            }
        }

        commitCategory(); // Commit any remaining category/skills

        // LLM Integration Point:
        // Skills sections have highly varied formats. LLMs are excellent at
        // categorizing and extracting individual skills, even from free-form text.
        // Prompt example: "From this text, extract all skills. Group them by categories
        // like 'Programming Languages', 'Tools', 'Frameworks', 'Databases'. Return JSON
        // with categories as keys and arrays of skills as values."
        return subsections;
    }

    // You can add similar parsing methods for other section types as needed
    // e.g., `parseAwardsSubsections`, `parseCertificationsSubsections` etc.
}