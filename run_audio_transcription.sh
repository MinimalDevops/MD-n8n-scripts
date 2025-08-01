#!/bin/bash

# Usage: ./run_audio_transcription.sh <audio_file_path> [--quiet|-q]

if [ -z "$1" ]; then
  echo "Usage: $0 <audio_file_path> [--quiet|-q]"
  echo ""
  echo "Examples:"
  echo "  $0 audio.mp3"
  echo "  $0 \"path/to/audio file.wav\" --quiet"
  echo "  $0 recording.m4a -q"
  exit 1
fi

AUDIO_FILE="$1"
QUIET=""
if [[ "$2" == "--quiet" || "$2" == "-q" ]]; then
  QUIET="$2"
fi

# Activate virtual environment and run the transcription script
source .venv/bin/activate && python transcribe_audio_file.py "$AUDIO_FILE" $QUIET 