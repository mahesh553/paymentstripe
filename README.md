# Resume Analyzer

A modern web application for analyzing resumes using AI-powered insights. Built with React, TypeScript, Supabase, and Gemini AI.

## Features

- **Resume Upload**: Support for PDF, DOCX, and TXT files
- **AI Analysis**: Powered by Google's Gemini AI for comprehensive resume analysis
- **Job Matching**: Compare resumes against job descriptions
- **User Authentication**: Secure login and registration with Supabase
- **Resume History**: Track and manage previously analyzed resumes
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Real-time Processing**: Live analysis updates and progress tracking

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Supabase (Database, Auth, Storage)
- **AI**: Google Gemini API
- **File Processing**: React Dropzone
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google AI (Gemini) API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd resume-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_GEMINI_API_KEY`: Your Google AI API key

4. Set up Supabase:
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/`
   - Configure authentication settings

5. Start the development server:
```bash
npm run dev
```

## Project Structure

```
src/
├── components/          # React components
├── context/            # React context providers
├── lib/               # Utility libraries
├── services/          # API services
├── types/             # TypeScript type definitions
└── main.tsx          # Application entry point
```

## Key Components

- **LandingPage**: Main homepage with feature overview
- **UploadPage**: File upload and resume submission
- **AnalysisDashboard**: Results display and insights
- **AuthModal**: User authentication
- **UserMenu**: User profile and settings

## Database Schema

The application uses Supabase with the following main tables:
- `users`: User profiles and preferences
- `resumes`: Uploaded resume metadata
- `analyses`: AI analysis results
- `job_matches`: Job matching results

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.