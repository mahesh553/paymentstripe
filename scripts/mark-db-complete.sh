#!/bin/bash
# Mark database as complete to stop migration prompts

echo "🔧 Marking database as complete..."

# Create a marker file to indicate database is set up
mkdir -p .bolt
echo "$(date)" > .bolt/db-complete.marker

# Create a schema lock file
echo "SCHEMA_LOCKED=true" > .bolt/schema.lock
echo "LAST_MIGRATION=$(date)" >> .bolt/schema.lock

echo "✅ Database marked as complete!"
echo "🚫 Bolt should stop suggesting migrations now"