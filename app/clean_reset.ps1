# Stop Docker containers
docker-compose down

# Remove Next.js artifacts
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
    Write-Host "Removed .next directory"
}

# Optional: Remove node_modules (uncomment if deep clean needed)
# if (Test-Path "node_modules") {
#     Remove-Item -Path "node_modules" -Recurse -Force
# }

Write-Host "Clean complete. Run 'docker-compose up -d --build' or 'npm run dev' to restart."
