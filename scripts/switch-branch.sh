#!/bin/bash
# Branch switching script with database reset

BRANCH=$1

if [ -z "$BRANCH" ]; then
    echo "Usage: ./scripts/switch-branch.sh <branch-name>"
    echo "Example: ./scripts/switch-branch.sh feature/new-feature"
    exit 1
fi

echo "🔄 Switching to branch: $BRANCH"

# Check if branch exists
if ! git show-ref --verify --quiet refs/heads/$BRANCH; then
    echo "❌ Branch '$BRANCH' does not exist locally"
    echo "Available branches:"
    git branch
    exit 1
fi

# Stash any uncommitted changes
echo "📦 Stashing uncommitted changes..."
git stash push -m "Auto-stash before switching to $BRANCH"

# Switch branch
echo "🌿 Switching to branch: $BRANCH"
git checkout $BRANCH

# Pull latest changes
echo "⬇️ Pulling latest changes..."
git pull origin $BRANCH

# Install dependencies (in case package.json changed)
echo "📦 Installing dependencies..."
npm install

# Reset database to match branch state
echo "🗄️ Resetting database to match branch state..."
npx supabase db reset

echo "✅ Successfully switched to branch: $BRANCH"
echo "🚀 You can now start your development server with: npm run dev"
echo ""
echo "💡 If you had uncommitted changes, restore them with: git stash pop"