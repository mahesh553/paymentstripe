# Database Branch Management Guide

## Problem
When switching between Git branches, Supabase database migrations can fail due to:
- Conflicting migration files
- Different schema states between branches
- Missing or duplicate migrations

## Solutions

### 1. Reset Database to Clean State (Recommended for Development)

```bash
# Reset your local Supabase database
npx supabase db reset

# This will:
# - Drop all tables and data
# - Re-run all migrations from scratch
# - Ensure clean state matching your current branch
```

### 2. Branch-Specific Database Management

#### Option A: Use Different Supabase Projects per Branch
```bash
# Create separate .env files for different branches
cp .env .env.main
cp .env .env.feature-branch

# Switch environment based on branch
git checkout main
cp .env.main .env

git checkout feature-branch
cp .env.feature-branch .env
```

#### Option B: Use Supabase CLI with Local Development
```bash
# Start local Supabase (recommended for development)
npx supabase start

# This creates an isolated local database that won't conflict
# with your production/staging environments
```

### 3. Migration Conflict Resolution

#### If you encounter migration errors:

1. **Check migration status:**
```bash
npx supabase migration list
```

2. **Reset and re-apply migrations:**
```bash
npx supabase db reset
```

3. **Or manually fix conflicts:**
```bash
# Remove conflicting migration files
rm supabase/migrations/conflicting_migration.sql

# Reset database
npx supabase db reset
```

### 4. Best Practices for Team Development

#### A. Migration Naming Convention
- Use descriptive names: `add_user_preferences.sql`
- Include ticket numbers: `TICKET-123_add_analytics.sql`
- Coordinate with team on migration order

#### B. Branch Strategy
```bash
# Before switching branches:
git stash  # Save any uncommitted changes
git checkout target-branch
npx supabase db reset  # Clean database state

# After switching:
npm run dev  # Restart your application
```

#### C. Environment Isolation
```bash
# Use local development database
npx supabase start

# Connect to local instance
# Update .env to point to local Supabase:
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_local_anon_key
```

### 5. Quick Fix Script

Create a script to automate branch switching:

```bash
#!/bin/bash
# save as scripts/switch-branch.sh

BRANCH=$1

if [ -z "$BRANCH" ]; then
    echo "Usage: ./switch-branch.sh <branch-name>"
    exit 1
fi

echo "Switching to branch: $BRANCH"

# Stash changes
git stash

# Switch branch
git checkout $BRANCH

# Reset database to match branch state
npx supabase db reset

# Restart development server
echo "Database reset complete. Restart your dev server with: npm run dev"
```

Make it executable:
```bash
chmod +x scripts/switch-branch.sh
```

Use it:
```bash
./scripts/switch-branch.sh feature-branch
```

## Immediate Fix for Current Issue

Run this command to fix your current database state:

```bash
npx supabase db reset
```

This will:
1. Drop all existing tables and data
2. Re-run all migrations in your current branch
3. Ensure your database matches your current codebase

## Prevention

1. **Use local development:** `npx supabase start`
2. **Reset on branch switch:** Always run `npx supabase db reset` after switching branches
3. **Coordinate migrations:** Ensure team members don't create conflicting migrations
4. **Use descriptive migration names:** Makes it easier to identify and resolve conflicts