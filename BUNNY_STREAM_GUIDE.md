# VELORA — Bunny Stream Complete Guide

> **Your setup**: Bunny Stream Library `628904` → CDN `vz-f3b830f6-306.b-cdn.net`
> **Admin panel**: `https://admin-seven-puce-32.vercel.app`
> **Bunny Dashboard**: `https://dash.bunny.net` → Stream → CineVault Stream

---

## How It Works (The Big Picture)

```
You upload a video (1080p MP4)
         ↓
Bunny Stream receives it
         ↓
Bunny automatically creates:
  • 1080p version
  • 720p version
  • 480p version
  • 360p version
  • 240p version
  • HLS playlist.m3u8 (master file that switches between qualities)
  • Thumbnail image
         ↓
Your app plays playlist.m3u8
         ↓
ExoPlayer auto-switches quality based on user's internet speed
```

**You upload ONE file → Bunny does ALL the work → Users get adaptive streaming.**

No Google Drive. No quota limits. No expired links. No manual quality conversion.

---

---

## PART 1: MOVIE UPLOAD (Step by Step)

---

### Step 1: Create the Movie in Admin Panel

1. Open your admin panel → **Movies** → **Add Movie**
2. Fill in: Title, Synopsis, Poster URL, Banner URL, Genres, etc.
3. Set Status to **Draft** (you'll publish after video is ready)
4. Click **Save** (creates the movie in your database)

### Step 2: Upload Video to Bunny Stream

After saving, you'll be on the **Edit Movie** page. Scroll down to the purple section:

**"Bunny Stream — Adaptive Streaming"**

You have **two options**:

#### Option A: Upload from URL (Recommended for large files)

1. Paste the video URL into the text box
   - This can be a Google Drive link, a direct MP4 URL, or any public video URL
   - If you already added a streaming source when creating the movie, leave the box **empty** — it will use that URL automatically
2. Click **"Upload to Bunny"**
3. You'll see: `"Video sent to Bunny Stream for transcoding!"`
4. The status changes to **"Transcoding... (X%)"** with a purple progress bar

#### Option B: Upload File Directly (From your computer)

1. Click **"Upload File Directly"**
2. Select a video file from your computer (MP4 recommended, max 5GB)
3. Wait for upload to complete
4. Transcoding starts automatically

### Step 3: Wait for Transcoding

- Status shows **"Transcoding... (45%)"** with progress bar
- The page auto-refreshes every 5 seconds
- Typical times:
  - 30 min movie → ~5-10 minutes
  - 2 hour movie → ~15-30 minutes
- When done: Status shows **"Completed (240p,360p,480p,720p,1080p)"**

### Step 4: Verify It Works

Once completed:
1. The **HLS URL** is displayed (looks like: `https://vz-f3b830f6-306.b-cdn.net/VIDEO_ID/playlist.m3u8`)
2. This URL is **automatically saved** to the movie's streaming sources
3. You can test it by:
   - Copying the HLS URL → Opening it in VLC Media Player
   - Or opening it in the VELORA Android app

### Step 5: Publish the Movie

1. Change Status from **Draft** to **Published**
2. Click **Save**
3. The movie is now live in the app with adaptive streaming

### Best Practices for Movies

| Setting | Recommendation |
|---------|---------------|
| **File Format** | MP4 (H.264 video, AAC audio) — most compatible |
| **Upload Quality** | 1080p (Full HD) — Bunny creates all lower qualities from this |
| **Max File Size** | 5GB per file |
| **Naming** | `Movie-Name-1080p.mp4` (clear, no special characters) |

---

---

## PART 2: WEB SERIES / ANIME — SINGLE SEASON

---

### Step 1: Create the Series in Admin Panel

1. Go to **Series** page → **Add Series**
2. Fill in: Title, Synopsis, Poster URL, Content Type (web_series / anime)
3. Click **Save**

### Step 2: Create a Season

1. Click the series card to open the **Season Manager**
2. Click **"Add Season"**
3. Fill in: Season Number = `1`, Title = `Season 1`
4. Click **Create Season**

### Step 3: Upload Episodes via Bunny Stream

Click the **purple "Bunny Stream"** button on the season row. You'll see 3 tabs:

#### Tab: "Import Folder" (Best for new uploads)

This is for when you have a **Google Drive folder** with all episodes:

1. Make sure your Drive folder is shared as **"Anyone with the link"**
2. Your folder should look like:
   ```
   Season 1/
     ├── EP01.mp4
     ├── EP02.mp4
     ├── EP03.mp4
     └── ...
   ```
3. Paste the Google Drive folder URL into the box
4. Click **"Import to Bunny"**
5. The system:
   - Scans the folder for all video files
   - Sorts them by episode number (extracted from filename)
   - Creates each episode in the database
   - Uploads each episode to Bunny Stream
   - Bunny auto-transcodes each to 5 quality levels
6. Watch the **purple progress bar** — shows current episode and progress
7. When done, all episodes appear in the season with **purple "HLS" badges**

#### Tab: "Migrate Existing" (For episodes already in your DB)

Use this if episodes were previously added with Google Drive/CDN URLs and you want to **upgrade them to Bunny Stream**:

1. Click **"Migrate All Episodes to Bunny Stream"**
2. The system re-downloads each episode from its current URL and uploads to Bunny
3. Watch the progress bar
4. When done, all episodes have HLS adaptive streaming

#### Tab: "Transcoding Status" (Check progress)

Shows a real-time dashboard:
- **Total** / **Finished** / **Processing** / **Failed** count
- Per-episode progress bars with encode percentage
- Available resolutions for completed episodes
- Click **"Refresh"** to update

---

---

## PART 3: BULK UPLOAD — MULTIPLE SEASONS AT ONCE

---

This is the workflow for uploading **5 seasons at once** (like you did with anime before).

### Preparation: Organize Your Google Drive

Create a folder structure like this on Google Drive:

```
Naruto Shippuden/
  ├── Season 1/
  │     ├── EP01 - Homecoming.mp4
  │     ├── EP02 - The Akatsuki Makes Its Move.mp4
  │     ├── EP03 - The Results of Training.mp4
  │     └── ... (all episodes)
  ├── Season 2/
  │     ├── EP01 - The Secret of Jinchuriki.mp4
  │     ├── EP02 - The Two Bells.mp4
  │     └── ...
  ├── Season 3/
  │     └── ...
  ├── Season 4/
  │     └── ...
  └── Season 5/
        └── ...
```

**Important**: Each season folder must be shared as **"Anyone with the link"**.

### Step-by-Step: 5 Seasons Bulk Upload

#### 1. Create the Series

- Admin → Series → Add Series → Fill details → Save

#### 2. Create All 5 Seasons

- Click the series card → Season Manager
- Click "Add Season" → Season 1
- Click "Add Season" → Season 2
- Click "Add Season" → Season 3
- Click "Add Season" → Season 4
- Click "Add Season" → Season 5

#### 3. Import Season 1

1. Expand Season 1 → Click **"Bunny Stream"** button
2. Go to **"Import Folder"** tab
3. Paste the Google Drive URL of the **Season 1 folder**
4. Click **"Import to Bunny"**
5. Wait for the progress bar to complete
6. Check the **"Transcoding Status"** tab — wait until all episodes show **"Finished"**

#### 4. Import Season 2

1. **After Season 1 is done importing** (not transcoding — importing is the quick part)
2. Click Bunny Stream on Season 2
3. Paste Season 2 folder URL
4. Click "Import to Bunny"
5. Wait for import to finish

#### 5. Repeat for Seasons 3, 4, 5

Same process for each season. One at a time for the import step.

> **Why one at a time?** The import process is a background task on the server. Only one import can run at a time. If you try to start a second while one is running, it will show "An import is already in progress". Wait for the current one to finish, then start the next.

#### 6. Monitor All Transcoding

After all 5 seasons are imported, go to each season's **"Transcoding Status"** tab to monitor:
- Bunny transcodes all episodes across all seasons simultaneously in the background
- So even while you're importing Season 3, Season 1's episodes are being transcoded by Bunny
- You'll see progress bars and encode percentages

#### 7. Verify Everything

For each season:
1. Open the season → Check that all episodes have the purple **"HLS"** badge
2. Click "Transcoding Status" → All episodes show **"Finished"** with resolutions like `240p,360p,480p,720p,1080p`
3. Test one episode in the VELORA app — should play with quality switching

#### 8. Publish the Series

Set the series status to **Published** in the edit form.

---

---

## PART 4: MULTI-QUALITY STREAMING — How It Works

---

### Does it happen automatically?

**YES, 100% automatic.** You upload ONE file in 1080p, and Bunny creates:

| Quality | Resolution | When Used |
|---------|-----------|-----------|
| 1080p | 1920×1080 | Fast WiFi / Broadband |
| 720p | 1280×720 | Good mobile data |
| 480p | 854×480 | Average connection |
| 360p | 640×360 | Slow 3G/4G |
| 240p | 426×240 | Very slow connection |

### Do you need to enable anything?

**No.** Your Bunny Stream Library already has all resolutions enabled:
`EnabledResolutions: 240p, 360p, 480p, 720p, 1080p`

This was configured when the library was created. Every video you upload gets all 5 qualities.

### What quality should you upload?

| Upload Quality | Result |
|---------------|--------|
| **1080p (recommended)** | Best. Bunny creates 1080p + all lower qualities |
| 720p | OK. Bunny creates 720p + lower, but no 1080p option |
| 480p | Bad. Only 480p and lower available. Users see poor quality |
| 4K / 2160p | Works but wastes upload time. Bunny scales down to 1080p max |

**Always upload in 1080p.** It's the sweet spot.

### How does the app switch quality?

1. App requests `playlist.m3u8` (the master HLS file)
2. This file contains links to all quality variants
3. ExoPlayer reads the viewer's bandwidth in real-time
4. Automatically picks the best quality:
   - On fast WiFi → Plays 1080p
   - Connection drops → Instantly switches to 480p or 360p
   - No buffering, no manual selection needed
5. Users can also manually select quality in the player

### How to verify multi-quality is working

**Method 1: Bunny Dashboard**
1. Go to `https://dash.bunny.net` → Stream → CineVault Stream
2. Click any video → Check "Available Resolutions"
3. Should show: `240p, 360p, 480p, 720p, 1080p`

**Method 2: Admin Panel**
1. Open any season → "Bunny Stream" → "Transcoding Status" tab
2. Each episode shows available resolutions

**Method 3: VLC Player**
1. Copy an HLS URL: `https://vz-f3b830f6-306.b-cdn.net/VIDEO_ID/playlist.m3u8`
2. Open VLC → Media → Open Network Stream → Paste URL
3. Go to Playback → Program → You'll see multiple quality options

**Method 4: VELORA App**
1. Play any video → Tap the quality settings icon
2. Should show: Auto, 1080p, 720p, 480p, 360p options

---

---

## PART 5: BEST LONG-TERM SETUP

---

### Why Bunny Stream is stable (no future issues)

| Problem | Google Drive | Bunny Stream |
|---------|-------------|--------------|
| Quota limits | "Too many downloads" error | Unlimited bandwidth (pay per GB) |
| Link expiration | Links break randomly | Permanent URLs, never expire |
| Quality options | Single quality only | 5 adaptive qualities |
| Speed | Slow, single server | Global CDN (112+ locations) |
| Reliability | Google can block anytime | Your own CDN, you control it |

### Best Architecture

```
Your Video Files (1080p MP4)
         ↓
Admin Panel → "Upload to Bunny" button
         ↓
Bunny Stream (auto-transcodes to 5 qualities)
         ↓
HLS playlist.m3u8 URL saved in database
         ↓
Android app → ExoPlayer plays HLS → adaptive streaming
```

**No Google Drive in the chain. No proxies. No workers needed for streaming.**

### Best Upload Method

| Method | When to Use |
|--------|------------|
| **Import Folder** (Drive → Bunny) | Bulk episodes already on Google Drive |
| **Upload from URL** | Single video from any public URL |
| **Upload File Directly** | Video on your computer, smaller files (<2GB) |

For bulk season uploads, **Import Folder** is the fastest because:
- You just paste a folder URL
- System auto-detects all episodes
- Creates everything automatically
- No manual work per episode

### Best Folder Structure on Google Drive

```
Shows/
  ├── [Series Name]/
  │     ├── Season 1/
  │     │     ├── EP01.mp4
  │     │     ├── EP02.mp4
  │     │     └── EP03.mp4
  │     ├── Season 2/
  │     │     ├── EP01.mp4
  │     │     └── EP02.mp4
  │     └── Season 3/
  │           └── ...
  └── [Another Series]/
        └── ...
```

**Naming rules for auto-detection:**
- `EP01.mp4`, `EP02.mp4` ✅ (best)
- `Episode 1.mp4`, `Episode 2.mp4` ✅
- `E01 - Title.mp4`, `E02 - Title.mp4` ✅
- `01.mp4`, `02.mp4` ✅ (numbers only also works)
- `random-name.mp4` ⚠️ (falls back to file order)

### Best CDN Configuration

Your Bunny Stream is already configured optimally:
- **Pull Zone**: `vz-f3b830f6-306.b-cdn.net` (auto-created with library)
- **Enabled Resolutions**: 240p, 360p, 480p, 720p, 1080p
- **MP4 Fallback**: Enabled (for devices that don't support HLS)
- **Direct Play**: Enabled
- **Keep Original Files**: Enabled

**You don't need to change anything.** It's production-ready.

---

---

## PART 6: FULL EXAMPLE — Anime with 5 Seasons

---

Let's say you want to upload **"Demon Slayer"** with 5 seasons.

### Step 1: Prepare on Google Drive

```
Demon Slayer/
  ├── Season 1/   (26 episodes)
  │     ├── EP01 - Cruelty.mp4
  │     ├── EP02 - Trainer Sakonji Urokodaki.mp4
  │     └── ... (all 26 episodes)
  ├── Season 2/   (18 episodes)
  │     ├── EP01 - Sound Hashira.mp4
  │     └── ...
  ├── Season 3/   (11 episodes)
  ├── Season 4/   (8 episodes)
  └── Season 5/   (12 episodes)
```

Share each season folder → "Anyone with the link" → Copy each folder's URL.

### Step 2: Create the Anime

1. Admin → **Anime** → **Add Anime**
2. Fill in:
   - Title: `Demon Slayer: Kimetsu no Yaiba`
   - Content Type: `Anime`
   - Synopsis, Poster URL, Banner URL, Genres: Action, Fantasy
   - Status: Draft
3. Save

### Step 3: Create 5 Seasons

1. Go to **Series** page
2. Click the Demon Slayer card
3. Add Season → Season 1, Season 2, Season 3, Season 4, Season 5

### Step 4: Import Season 1

1. Click **"Bunny Stream"** on Season 1
2. Tab: **"Import Folder"**
3. Paste: `https://drive.google.com/drive/folders/SEASON_1_FOLDER_ID`
4. Click **"Import to Bunny"**
5. Watch progress: `"Importing 26 episodes to Bunny Stream"`
6. Progress bar fills up: Episode 1... Episode 2... Episode 3...
7. Wait until complete (the import step, which sends files to Bunny)

### Step 5: Import Seasons 2-5

Repeat for each season:
1. Wait for previous import to finish (progress bar gone)
2. Click "Bunny Stream" on next season
3. Paste that season's folder URL
4. Click "Import to Bunny"
5. Wait for completion
6. Move to next season

### Step 6: Monitor Transcoding

While you're importing later seasons, Bunny is already transcoding earlier episodes. Check progress:

1. Click on Season 1 → Bunny Stream → **"Transcoding Status"** tab
2. You'll see:
   ```
   Total: 26  |  Finished: 18  |  Processing: 5  |  Failed: 0

   E01  ██████████████████████ Finished  240p,360p,480p,720p,1080p
   E02  ██████████████████████ Finished  240p,360p,480p,720p,1080p
   E03  ██████████████████  Transcoding  87%
   E04  ████████████        Processing   52%
   ...
   ```
3. Click **"Refresh"** to update

### Step 7: Verify

After all transcoding finishes (could be 1-2 hours for 75+ episodes):

For each season:
1. ✅ All episodes show purple **"HLS"** badge
2. ✅ Transcoding Status: All "Finished" with `240p,360p,480p,720p,1080p`
3. ✅ Episode thumbnails auto-generated by Bunny

### Step 8: Test Playback

1. Open VELORA app on your phone
2. Find Demon Slayer → Season 1 → Episode 1
3. Play → Video should start
4. Check quality icon → Shows: Auto, 1080p, 720p, 480p, 360p
5. Switch between WiFi and mobile data → Quality should auto-adjust

### Step 9: Publish

1. Admin → Edit Demon Slayer → Status: **Published** → Save
2. The anime is now live for all users

---

---

## QUICK REFERENCE CARD

---

### Movie Upload (30 seconds)
```
Admin → Add Movie → Save → Scroll to "Bunny Stream" → Upload to Bunny → Wait → Publish
```

### Single Season (2 minutes)
```
Admin → Series → Create Season → Bunny Stream → Import Folder → Paste URL → Wait → Done
```

### 5 Seasons (10 minutes of your time + background transcoding)
```
Create Series → Create 5 Seasons → Import Season 1 folder → Wait →
Import Season 2 folder → Wait → Import Season 3 folder → Wait →
Import Season 4 folder → Wait → Import Season 5 folder → Wait →
Check Transcoding Status → All Finished → Publish
```

### URL Format
```
HLS:       https://vz-f3b830f6-306.b-cdn.net/{videoId}/playlist.m3u8
Thumbnail: https://vz-f3b830f6-306.b-cdn.net/{videoId}/thumbnail.jpg
MP4 720p:  https://vz-f3b830f6-306.b-cdn.net/{videoId}/play_720.mp4
```

### Transcoding Status Codes
```
0 = Created (waiting for upload)
1 = Uploaded (waiting for processing)
2 = Processing (starting transcoding)
3 = Transcoding (creating quality variants — shows %)
4 = Finished ✅ (all qualities ready)
5 = Error ❌ (something went wrong — retry)
```

### Troubleshooting

| Issue | Solution |
|-------|---------|
| "An import is already in progress" | Wait for current import to finish, then start next |
| Transcoding stuck at 0% | Wait 1-2 minutes, Bunny queue may be busy |
| Episode shows "Error" status | Click "Migrate Existing" to retry that episode |
| Video plays but no quality options | Check Transcoding Status — it may still be processing |
| Thumbnail not showing | Bunny generates thumbnails after transcoding completes |
| "No video URL available" | Make sure the episode has at least one streaming source url |

---

## Cost Estimate (Bunny Stream)

- **Storage**: $0.01/GB per month (1TB of videos ≈ $10/month)
- **Encoding**: $0.006/minute of video
- **Streaming**: $0.01/GB delivered

Example: 100 episodes × 25 min = 2500 min encoding = **$15 one-time**
Storage for 100 episodes (~200GB) = **$2/month**
Streaming to 100 daily viewers = **~$5-10/month**

Very affordable for an OTT platform.
