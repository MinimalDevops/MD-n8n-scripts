#!/usr/bin/env python3
"""
Audio File Transcription Script

This script accepts an audio file as input and returns its transcription.
Supports various audio formats (mp3, wav, m4a, etc.) through ffmpeg conversion.

Usage:
    python transcribe_audio_file.py <audio_file_path> [--quiet|-q]

Examples:
    python transcribe_audio_file.py audio.mp3
    python transcribe_audio_file.py "path/to/audio file.wav" --quiet
    python transcribe_audio_file.py recording.m4a -q
"""

import sys
import os
from media_transcription_utils import transcribe_audio

def main():
    # Handle quiet mode
    quiet = '--quiet' in sys.argv or '-q' in sys.argv
    if quiet:
        sys.argv = [arg for arg in sys.argv if arg not in ('--quiet', '-q')]
        os.environ['QUIET'] = '1'
    
    # Check command line arguments
    if len(sys.argv) < 2:
        if not quiet:
            print("Usage: python transcribe_audio_file.py <audio_file_path> [--quiet|-q]")
            print("\nExamples:")
            print("  python transcribe_audio_file.py audio.mp3")
            print("  python transcribe_audio_file.py \"path/to/audio file.wav\" --quiet")
            print("  python transcribe_audio_file.py recording.m4a -q")
        sys.exit(1)
    
    audio_file_path = sys.argv[1]
    
    # Check if file exists
    if not os.path.exists(audio_file_path):
        if not quiet:
            print(f"Error: Audio file '{audio_file_path}' not found.")
        sys.exit(2)
    
    # Check if it's actually a file (not a directory)
    if not os.path.isfile(audio_file_path):
        if not quiet:
            print(f"Error: '{audio_file_path}' is not a file.")
        sys.exit(3)
    
    # Transcribe the audio file
    if not quiet:
        print(f"Transcribing audio file: {audio_file_path}")
    
    transcription = transcribe_audio(audio_file_path)
    
    if not transcription:
        if not quiet:
            print("Failed to transcribe audio file")
        sys.exit(4)
    
    # Save transcription to local tmp/transcribed_audio.txt
    tmp_dir = "tmp"
    # Create tmp directory if it doesn't exist
    if not os.path.exists(tmp_dir):
        os.makedirs(tmp_dir)
    
    output_file = os.path.join(tmp_dir, "transcribed_audio.txt")
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(transcription)
        
        if not quiet:
            print(f"Transcription saved to: {output_file}")
            
    except Exception as e:
        if not quiet:
            print(f"Warning: Could not save to file: {e}")
    
    # Output the transcription to stdout
    print(transcription)

if __name__ == "__main__":
    main() 