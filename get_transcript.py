import sys
import os
from media_transcription_utils import convert_shorts_url, download_audio, transcribe_audio

quiet = '--quiet' in sys.argv or '-q' in sys.argv
if quiet:
    sys.argv = [arg for arg in sys.argv if arg not in ('--quiet', '-q')]
    os.environ['QUIET'] = '1'

if __name__ == "__main__":
    if len(sys.argv) < 2:
        if not quiet:
            print("Usage: python get_transcript.py <URL>")
        sys.exit(1)
    url = sys.argv[1]
    youtube_url = convert_shorts_url(url)
    audio_path, sanitized_title = download_audio(youtube_url)
    if not audio_path:
        if not quiet:
            print("Failed to download audio")
        sys.exit(2)
    transcription = transcribe_audio(audio_path)
    if not transcription:
        if not quiet:
            print("Failed to transcribe audio")
        sys.exit(3)
    print(transcription) 