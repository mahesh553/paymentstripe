import { GoogleGenerativeAI } from '@google/generative-ai';



const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;



if (!API_KEY) {

  console.error('VITE_GEMINI_API_KEY is not set in environment variables');

}



const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;



// Existing functions: analyzeResume, generateRestructureSuggestions, compareWithJobDescription

// ... (keeping your existing code unchanged)



export const generateTailoredBullets = async (

  resumeText: string,

  jobDescription: string,

  matchingSkills: string[],

  missingSkills: string[],

  missingKeywords: string[]

) => {

  if (!genAI) {

    // Fallback data if API key is unavailable

    return {

      bullet_points: [

        `- Sped up project delivery by 25% using ${matchingSkills[0] || 'JavaScript'} and ${

          missingSkills[0] || 'TypeScript'

        }, improving team efficiency.`,

        `- Collaborated with teams to enhance workflows, incorporating ${

          missingKeywords[0] || 'team collaboration'

        }, boosting productivity by 20%.`,

        `- Built scalable APIs with ${matchingSkills[1] || 'Node.js'}, reducing response times by 30% for ${

          missingKeywords[1] || 'performance optimization'

        }.`,

        `- Debugged critical issues in ${missingSkills[1] || 'GraphQL'} queries, cutting error rates by 15%.`,

        `- Led adoption of ${missingSkills[0] || 'TypeScript'} in projects, improving code reliability by 20%.`

      ]

    };

  }



  try {

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });



    const prompt = `

      Generate 5 resume bullet points using the STAR method (Situation-Task-Action-Result) based on:

      - Job requirements: ${jobDescription}

      - Candidate's existing skills: ${matchingSkills.join(', ')}

      - Missing skills to include: ${missingSkills.join(', ')}

      - Missing keywords to include: ${missingKeywords.join(', ')}



      Guidelines:

      1. Use the STAR method for each bullet point.

      2. Quantify results with realistic metrics (e.g., %, $, time saved).

      3. Use conversational, confident, human-like language (avoid formal or robotic tone).

      4. Blend in 2-3 missing skills or keywords subtly per bullet.

      5. Keep each bullet under 2 lines.

      6. Return ONLY a markdown bullet list.



      Example:

      - Improved case resolution time by 30% by implementing Salesforce Service Cloud workflows, leveraging data analysis for efficiency.

      - Led team of 5 to deliver 10 projects on time using Agile methodology, increasing client satisfaction by 25%.

    `;



    const result = await model.generateContent(prompt);

    const response = await result.response;

    let text = response.text();



    // Extract markdown bullet list

    const bulletMatch = text.match(/(?:-\s.*?\n)+/g);

    if (!bulletMatch) {

      throw new Error('Invalid response format from AI');

    }



    let bullets = bulletMatch[0].split('\n').filter((line: string) => line.trim().startsWith('-'));



    // Humanize the bullet points

    bullets = bullets.map((bullet: string) => {

      // Replace formal or robotic terms

      bullet = bullet.replace(/utilized/gi, 'used');

      bullet = bullet.replace(/implemented/gi, 'set up');

      bullet = bullet.replace(/facilitated/gi, 'helped');

      bullet = bullet.replace(/achieved/gi, 'pulled off');

      bullet = bullet.replace(/optimized/gi, 'sped up');



      // Ensure missing skills/keywords are subtly included if missing

      if (!missingSkills.some((skill) => bullet.includes(skill)) && missingSkills.length > 0) {

        const randomSkill = missingSkills[Math.floor(Math.random() * missingSkills.length)];

        bullet = bullet.replace(/using\s\w+/i, `using ${randomSkill}`);

      }

      if (!missingKeywords.some((keyword) => bullet.includes(keyword)) && missingKeywords.length > 0) {

        const randomKeyword = missingKeywords[Math.floor(Math.random() * missingKeywords.length)];

        bullet = bullet.replace(/for\s\w+/i, `for ${randomKeyword}`);

      }



      // Tone down exaggerated metrics

      bullet = bullet.replace(/100%/g, '90%');

      bullet = bullet.replace(/50%/g, '40%');



      return bullet;

    });



    return {

      bullet_points: bullets

    };

  } catch (error) {

    console.error('Error generating tailored bullet points:', error);

    // Fallback data

    return {

      bullet_points: [

        `- Sped up project delivery by 25% using ${matchingSkills[0] || 'JavaScript'} and ${

          missingSkills[0] || 'TypeScript'

        }, improving team efficiency.`,

        `- Collaborated with teams to enhance workflows, incorporating ${

          missingKeywords[0] || 'team collaboration'

        }, boosting productivity by 20%.`,

        `- Built scalable APIs with ${matchingSkills[1] || 'Node.js'}, reducing response times by 30% for ${

          missingKeywords[1] || 'performance optimization'

        }.`,

        `- Debugged critical issues in ${missingSkills[1] || 'GraphQL'} queries, cutting error rates by 15%.`,

        `- Led adoption of ${missingSkills[0] || 'TypeScript'} in projects, improving code reliability by 20%.`

      ]

    };

  }

};