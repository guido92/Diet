# Docker Deployment Instructions 🐳

## 1. Setup Data Folder
To keep your current meal plans and data, you need to copy your existing data file into a new `data` folder inside the app directory.

**Run these commands (Powershell):**
```powershell
# Create data directory
mkdir data

# Copy existing data
copy ..\tracker_data.json .\data\tracker_data.json
```

## 2. Environment Variables
You need to provide your Google API Key. You can create a `.env` file in this directory:

**File: `.env`**
```
GOOGLE_API_KEY=your_actual_key_here
```

## 3. Build and Run
Start the application with Docker Compose:

```bash
docker-compose up -d --build
```

The app will be available at: http://localhost:3000

## Notes
- The data is persisted in the `./data` folder.
- If you update the code, run `docker-compose up -d --build` again to apply changes.
