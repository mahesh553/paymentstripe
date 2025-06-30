#!/bin/bash
# Complete backup script - database + code

echo "🔄 Creating complete backup of project and database..."

BACKUP_ROOT="complete-backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_ROOT}/backup_${TIMESTAMP}"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "1️⃣ Backing up database schema..."
./scripts/export-schema.sh

echo "2️⃣ Backing up database data..."
./scripts/backup-database.sh

echo "3️⃣ Creating code archive..."
# Create code backup (excluding node_modules and other unnecessary files)
tar -czf "${BACKUP_DIR}/code_backup.tar.gz" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.env' \
    --exclude='database-backups' \
    --exclude='database-schema' \
    --exclude='complete-backup' \
    .

echo "4️⃣ Copying database files..."
cp -r database-schema "${BACKUP_DIR}/"
cp -r database-backups "${BACKUP_DIR}/"

echo "5️⃣ Creating backup manifest..."
cat > "${BACKUP_DIR}/BACKUP_MANIFEST.md" << EOF
# Complete Project Backup

**Backup Date:** $(date)
**Git Commit:** $(git rev-parse HEAD 2>/dev/null || echo "Not in git repository")
**Git Branch:** $(git branch --show-current 2>/dev/null || echo "Not in git repository")

## Contents

### Code Backup
- \`code_backup.tar.gz\` - Complete source code (excluding node_modules, .git, dist)

### Database Backup
- \`database-schema/\` - Database schema and migrations
- \`database-backups/\` - Database data dumps

### Project Structure
\`\`\`
$(tree -L 2 -I 'node_modules|.git|dist' . 2>/dev/null || find . -maxdepth 2 -type d | head -20)
\`\`\`

## Restore Instructions

### 1. Restore Code
\`\`\`bash
tar -xzf code_backup.tar.gz
npm install
\`\`\`

### 2. Restore Database
\`\`\`bash
# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Restore schema
npx supabase db reset
# Or manually apply: psql -f database-schema/latest_schema.sql
\`\`\`

### 3. Start Application
\`\`\`bash
npm run dev
\`\`\`

## Environment Variables Required
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY  
- VITE_GEMINI_API_KEY

EOF

# Create latest backup symlink
ln -sf "backup_${TIMESTAMP}" "${BACKUP_ROOT}/latest"

echo "✅ Complete backup created: ${BACKUP_DIR}"
echo "📁 Contents:"
ls -la "${BACKUP_DIR}"

echo ""
echo "🔗 Latest backup symlink: ${BACKUP_ROOT}/latest"
echo "📖 Backup manifest: ${BACKUP_DIR}/BACKUP_MANIFEST.md"