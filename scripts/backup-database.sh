#!/bin/bash
# Database backup script

BACKUP_DIR="database-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/database_backup_${TIMESTAMP}.sql"

echo "🗄️ Creating database backup..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Export database schema and data
echo "📤 Exporting database schema and data..."
npx supabase db dump --data-only > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✅ Database backup created: ${BACKUP_FILE}"
    
    # Create a latest backup symlink
    ln -sf "database_backup_${TIMESTAMP}.sql" "${BACKUP_DIR}/latest.sql"
    echo "🔗 Latest backup symlink updated"
    
    # Keep only last 10 backups
    echo "🧹 Cleaning up old backups (keeping last 10)..."
    ls -t ${BACKUP_DIR}/database_backup_*.sql | tail -n +11 | xargs -r rm
    
    echo "📊 Current backups:"
    ls -la ${BACKUP_DIR}/database_backup_*.sql 2>/dev/null || echo "No previous backups found"
else
    echo "❌ Database backup failed!"
    exit 1
fi