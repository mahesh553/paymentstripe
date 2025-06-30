#!/bin/bash
# Export complete database schema

SCHEMA_DIR="database-schema"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "📋 Exporting database schema..."

# Create schema directory if it doesn't exist
mkdir -p $SCHEMA_DIR

# Export schema only (no data)
echo "📤 Exporting schema structure..."
npx supabase db dump --schema-only > "${SCHEMA_DIR}/schema_${TIMESTAMP}.sql"

# Export current migrations
echo "📤 Copying migration files..."
cp -r supabase/migrations "${SCHEMA_DIR}/migrations_${TIMESTAMP}/"

# Create schema documentation
echo "📝 Creating schema documentation..."
cat > "${SCHEMA_DIR}/README_${TIMESTAMP}.md" << EOF
# Database Schema Export

**Export Date:** $(date)
**Git Commit:** $(git rev-parse HEAD 2>/dev/null || echo "Not in git repository")
**Git Branch:** $(git branch --show-current 2>/dev/null || echo "Not in git repository")

## Files Included

- \`schema_${TIMESTAMP}.sql\` - Complete database schema (structure only)
- \`migrations_${TIMESTAMP}/\` - All migration files
- This README file

## Tables Overview

### Core Tables
- \`xxpj_users\` - User profiles and settings
- \`xxpj_subscriptions\` - Subscription management
- \`xxpj_usage_tracking\` - Feature usage tracking
- \`xxpj_feature_flags\` - Feature flag management

### Resume Tables
- \`resumes\` - Resume file metadata
- \`analyses\` - Resume analysis results
- \`job_matches\` - Job matching results

### Audit Tables
- \`xxpj_subscription_history\` - Subscription change history
- \`xxpj_resume_history\` - Resume version history

## Key Functions

- \`get_user_subscription_status(uuid)\` - Get user subscription info
- \`track_feature_usage(uuid, text)\` - Track and limit feature usage
- \`get_feature_limits(uuid)\` - Get current usage limits
- \`check_user_subscription_type(uuid)\` - Detailed subscription status

## Restore Instructions

To restore this schema:

1. Reset your database: \`npx supabase db reset\`
2. Apply the schema: \`psql -f schema_${TIMESTAMP}.sql\`
3. Or apply migrations: Copy files from \`migrations_${TIMESTAMP}/\` to \`supabase/migrations/\`

EOF

# Create latest symlinks
ln -sf "schema_${TIMESTAMP}.sql" "${SCHEMA_DIR}/latest_schema.sql"
ln -sf "README_${TIMESTAMP}.md" "${SCHEMA_DIR}/latest_README.md"
ln -sf "migrations_${TIMESTAMP}" "${SCHEMA_DIR}/latest_migrations"

echo "✅ Schema export completed!"
echo "📁 Files created in: ${SCHEMA_DIR}/"
echo "📋 Schema file: schema_${TIMESTAMP}.sql"
echo "📂 Migrations: migrations_${TIMESTAMP}/"
echo "📖 Documentation: README_${TIMESTAMP}.md"