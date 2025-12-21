#!/bin/bash

# Stop Docker containers
docker-compose down

# Remove Next.js artifacts
if [ -d ".next" ]; then
    rm -rf .next
    echo "Removed .next directory"
fi

# Optional: Remove node_modules (uncomment if deep clean needed)
# if [ -d "node_modules" ]; then
#     rm -rf node_modules
# fi

echo "Clean complete. Run 'docker-compose up -d --build' to restart."
