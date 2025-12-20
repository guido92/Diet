#!/usr/bin/with-contenv bashio

# Read Config Options
GOOGLE_KEY=$(bashio::config 'google_api_key')

# Set Env Var for App
export GOOGLE_API_KEY="$GOOGLE_KEY"

echo "Starting Dieta AI App..."
echo "API Key length: ${#GOOGLE_API_KEY}"

# Start Next.js
npm start
