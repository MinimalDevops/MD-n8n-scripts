# n8n-summarizer

This project provides tools to:
- Scrape and extract content from web pages (including logged-in/paid content) using Puppeteer and Node.js.
- Download and transcribe audio from YouTube/Instagram videos using Python and Whisper.
- Summarize transcribed text using LLMs (Ollama).

## Features
- **scraper.js**: Scrapes visible content from a web page using a logged-in Chrome session and saves the main content as a PDF (up to the "Written by" section for Medium articles).
- **get_transcript.py**: Downloads and transcribes audio from a video URL (YouTube/Instagram).
- **transcribe_audio_file.py**: Transcribes audio from local audio files (mp3, wav, m4a, etc.).
- **scrape_webpage.py**: Scrapes all visible text from a web page using Python (requests/BeautifulSoup).
- **run_medium_scraper-local.sh**: Helper script to launch Chrome in remote debug mode and run the Node.js scraper with a given URL.
- **run_audio_transcription.sh**: Helper script to transcribe local audio files with virtual environment activation.

## Setup

### 1. Python Environment
- Install [uv](https://github.com/astral-sh/uv) (or use `pip`):
  ```sh
  pip install uv
  ```
- Create and activate a virtual environment:
  ```sh
  uv venv .venv
  source .venv/bin/activate
  ```
- Install Python dependencies:
  ```sh
  uv pip install -r requirements.txt
  ```

### 2. Node.js Environment
- Install Node.js (v16+ recommended).
- Install dependencies for Puppeteer:
  ```sh
  npm install puppeteer
  ```

## Usage

### Scrape a Webpage and Save as PDF (Node.js)
1. Start Chrome in remote debug mode (the script will do this for you):
   ```sh
   ./run_medium_scraper-local.sh <URL>
   ```
   - Example:
     ```sh
     ./run_medium_scraper-local.sh https://medium.com/@minimaldevops/my-awesome-article-123
     ```
   - The PDF will be saved in the `tmp/` directory with a sanitized name (e.g., `tmp/my-awesome-article-123.pdf`).
   - The script will output the full, absolute path to the generated PDF, which can be used in other workflow steps.
   - The `tmp/` directory is automatically created if it doesn't exist, and is ignored by git (except for an optional `.gitkeep` file).

### Download and Transcribe Video (Python)
```sh
# For full output
python get_transcript.py <VIDEO_URL>

# For only the transcript (quiet mode)
python get_transcript.py <VIDEO_URL> --quiet
```
- Example:
  ```sh
  python get_transcript.py https://www.youtube.com/watch?v=example --quiet
  ```

### Transcribe Local Audio File (Python)
```sh
# For full output
python transcribe_audio_file.py <AUDIO_FILE_PATH>

# For only the transcript (quiet mode)
python transcribe_audio_file.py <AUDIO_FILE_PATH> --quiet
```
- Example:
  ```sh
  python transcribe_audio_file.py ~/Downloads/audio.mp3 --quiet
  python transcribe_audio_file.py "path/to/audio file.wav"
  ```
- Supported formats: mp3, wav, m4a, aac, and other formats supported by ffmpeg
- The original audio file is preserved (not deleted after transcription)
- **Output**: Transcription is printed to stdout AND saved to `tmp/transcribed_audio.txt`

### Scrape All Text from a Webpage (Python)
```sh
# For full output
python scrape_webpage.py <URL>

# For only the text (quiet mode)
python scrape_webpage.py <URL> --quiet
```

### Using Helper Scripts
```sh
# For web scraping with Chrome
./run_medium_scraper-local.sh <URL>

# For audio transcription with virtual environment
./run_audio_transcription.sh <AUDIO_FILE_PATH> [--quiet|-q]
```

## Notes
- **Chrome Profile for Logged-in Content**: The `run_medium_scraper-local.sh` script automatically uses a dedicated Chrome profile stored in `./chrome-profiles/automation`. The first time you run it, a new Chrome window will open. You must log in to the required websites (e.g., Medium) in *that specific window* to enable scraping of paid or logged-in content. Your session will be saved for future runs.
- The Node.js scraper is tailored for Medium articles but can be adapted for other sites. It now also:
  - Handles and removes common pop-ups and cookie banners automatically.
  - Expands "Read more" links on YouTube video and community posts to capture all visible text.
  - Scrolls slowly to ensure all images and lazy-loaded content are included in the PDF.
- **Audio Transcription**: The transcription scripts use OpenAI's Whisper model for high-quality audio transcription. Local audio files are preserved after transcription, while downloaded YouTube files are automatically cleaned up. The `transcribe_audio_file.py` script outputs transcription both to stdout (for n8n integration) and saves it to `tmp/transcribed_audio.txt` for file-based workflows.
- The Python scripts require the dependencies listed in `requirements.txt`.

## License
