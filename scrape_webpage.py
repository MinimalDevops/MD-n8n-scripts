import sys
import requests
from bs4 import BeautifulSoup

quiet = '--quiet' in sys.argv or '-q' in sys.argv
if quiet:
    sys.argv = [arg for arg in sys.argv if arg not in ('--quiet', '-q')]

if __name__ == "__main__":
    if len(sys.argv) < 2:
        if not quiet:
            print("Usage: python scrape_webpage.py <URL>")
        sys.exit(1)
    url = sys.argv[1]
    response = requests.get(url)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    # Extract visible text only
    for script in soup(["script", "style"]):
        script.decompose()
    text = soup.get_text(separator='\n', strip=True)
    print(text) 