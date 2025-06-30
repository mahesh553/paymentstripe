#!/bin/bash
# Git repository setup and push script

echo "🚀 Setting up Git repository and pushing code..."

# Check if we're already in a git repository
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
else
    echo "📦 Git repository already exists"
fi

# Add all files
echo "📁 Adding files to Git..."
git add .

# Check if there are any changes to commit
if git diff --staged --quiet; then
    echo "ℹ️ No changes to commit"
else
    # Commit changes
    echo "💾 Committing changes..."
    git commit -m "feat: Complete resume analyzer with database schema

- Add comprehensive user management system
- Implement subscription and usage tracking
- Create resume analysis and job matching features
- Set up proper database schema with xxpj_ tables
- Add migration files and database functions
- Implement feature gating and usage limits
- Add comprehensive documentation

Database Schema:
- xxpj_users: User profiles and settings
- xxpj_subscriptions: Subscription management  
- xxpj_usage_tracking: Feature usage tracking
- xxpj_feature_flags: Feature flag management
- resumes: Resume file metadata
- analyses: Resume analysis results

Features:
- AI-powered resume analysis using Gemini API
- Job-specific resume matching
- Keyword analysis and optimization
- Resume restructure guide
- User authentication and authorization
- Subscription management (free/premium/admin)
- Usage tracking and limits
- File upload and processing (PDF, DOCX, TXT)

Tech Stack:
- Frontend: React 18, TypeScript, Tailwind CSS
- Backend: Supabase (PostgreSQL, Auth, Storage)
- AI: Google Gemini API
- Build: Vite"
fi

# Check if remote origin exists
if git remote get-url origin >/dev/null 2>&1; then
    echo "🌐 Remote origin already configured"
    
    # Push to existing remote
    echo "⬆️ Pushing to remote repository..."
    git push origin main 2>/dev/null || git push origin master 2>/dev/null || {
        echo "⚠️ Push failed. You may need to set up the remote repository first."
        echo "💡 To add a remote repository:"
        echo "   git remote add origin https://github.com/yourusername/your-repo.git"
        echo "   git push -u origin main"
    }
else
    echo "⚠️ No remote repository configured"
    echo "💡 To add a remote repository and push:"
    echo "   git remote add origin https://github.com/yourusername/your-repo.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
fi

echo "✅ Git setup completed!"