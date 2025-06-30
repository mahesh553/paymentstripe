#!/bin/bash
# Quick database reset script

echo "🗄️ Resetting Supabase database..."
echo "⚠️  This will delete all data and re-run migrations"

read -p "Are you sure? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx supabase db reset
    echo "✅ Database reset complete!"
    echo "🚀 Restart your dev server with: npm run dev"
else
    echo "❌ Database reset cancelled"
fi