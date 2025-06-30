# Resume Analyzer

A modern web application for analyzing resumes using AI-powered insights. Built with React, TypeScript, Supabase, and Gemini AI.

## 🚀 Features

- **Resume Upload**: Support for PDF, DOCX, and TXT files
- **AI Analysis**: Powered by Google's Gemini AI for comprehensive resume analysis
- **Job Matching**: Compare resumes against job descriptions
- **User Authentication**: Secure login and registration with Supabase
- **Resume History**: Track and manage previously analyzed resumes
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Real-time Processing**: Live analysis updates and progress tracking

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Supabase (Database, Auth, Storage)
- **AI**: Google Gemini API
- **File Processing**: React Dropzone
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google AI (Gemini) API key

## 🔧 Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd resume-analyzer
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_google_ai_api_key
```

4. **Set up Supabase:**
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/`
   - Configure authentication settings

5. **Start the development server:**
```bash
npm run dev
```

## 📁 Project Structure

```
src/
├── components/          # React components
├── context/            # React context providers
├── lib/               # Utility libraries
├── services/          # API services
├── types/             # TypeScript type definitions
└── main.tsx          # Application entry point

supabase/
├── migrations/        # Database migrations
└── config.toml       # Supabase configuration

scripts/
├── backup-database.sh    # Database backup script
├── export-schema.sh     # Schema export script
├── git-setup.sh        # Git repository setup
└── complete-backup.sh  # Complete project backup
```

## 🗄️ Database Schema

The application uses Supabase with the following main tables:

### Core Tables
- `xxpj_users` - User profiles and preferences
- `xxpj_subscriptions` - Subscription management
- `xxpj_usage_tracking` - Feature usage tracking
- `xxpj_feature_flags` - Feature flag management

### Resume Tables
- `resumes` - Uploaded resume metadata
- `analyses` - AI analysis results
- `job_matches` - Job matching results

### Audit Tables
- `xxpj_subscription_history` - Subscription change history

## 🔑 Key Features

### User Management
- **Free Tier**: 1 analysis per month for each feature
- **Premium Tier**: 20 analyses per day for each feature
- **Admin Users**: Unlimited access to all features

### Resume Analysis
- Overall quality scoring
- Section-by-section analysis
- ATS compatibility checking
- Keyword optimization
- Industry alignment scoring

### Job Matching
- Job-specific resume analysis
- Keyword gap identification
- Skills matching and recommendations
- ATS optimization suggestions

## 🚀 Deployment

### Database Backup
```bash
# Backup database
./scripts/backup-database.sh

# Export schema
./scripts/export-schema.sh

# Complete backup (code + database)
./scripts/complete-backup.sh
```

### Git Setup
```bash
# Initialize and push to GitHub
./scripts/git-setup.sh
```

### Production Deployment
1. Deploy to your preferred hosting platform (Vercel, Netlify, etc.)
2. Set up environment variables in your hosting platform
3. Configure Supabase for production use
4. Set up proper domain and SSL certificates

## 🔧 Development Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Database backup
./scripts/backup-database.sh

# Export database schema
./scripts/export-schema.sh

# Switch git branches safely
./scripts/switch-branch.sh <branch-name>

# Reset database
./scripts/reset-db.sh
```

## 🔒 Environment Variables

Required environment variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Gemini AI Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key

# Application Configuration
VITE_APP_ENV=development
VITE_MAX_FILE_SIZE_MB=10
VITE_SUPPORTED_FILE_TYPES=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain
```

## 📚 Documentation

- [Database Branch Management](docs/DATABASE_BRANCH_MANAGEMENT.md)
- [User Flow Analysis](docs/USER_FLOW_ANALYSIS.md)
- [Column Inconsistencies Fixed](docs/COLUMN_INCONSISTENCIES_FIXED.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Run tests and linting
5. Commit your changes: `git commit -m 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [documentation](docs/)
2. Review the [troubleshooting guide](docs/DATABASE_BRANCH_MANAGEMENT.md)
3. Create an issue on GitHub
4. Contact the development team

## 🎯 Roadmap

- [ ] Advanced AI analysis features
- [ ] Resume template suggestions
- [ ] Bulk resume processing
- [ ] Integration with job boards
- [ ] Mobile application
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features

---

**Built with ❤️ using React, TypeScript, and Supabase**