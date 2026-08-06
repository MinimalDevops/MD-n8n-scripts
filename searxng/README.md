# Local SearXNG search service

This folder provides a private, local SearXNG instance for the n8n AI Agent. It lets the local Ollama model use current web search without using Ollama's Web Search API.

SearXNG is a metasearch engine: it queries configured external search engines and returns aggregated results. The instance is bound to `127.0.0.1` by default and is not exposed publicly.

## Start

From this directory:

```sh
cp .env.example .env
openssl rand -hex 32
# Put the generated value in .env as SEARXNG_SECRET
docker-compose up -d
```

## Run under PM2

PM2 can supervise the foreground Compose process and restore it after a reboot:

```sh
cd /Users/tapindersingh/Documents/git/MD-n8n-scripts/searxng
chmod +x pm2-docker-compose.sh
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup` once, then check the service with:

```sh
pm2 status
pm2 logs md-searxng
```

To stop or restart it:

```sh
pm2 restart md-searxng
pm2 stop md-searxng
```

For a clean shutdown that also removes the containers:

```sh
pm2 delete md-searxng
docker-compose down
```

Check the service:

```sh
curl 'http://127.0.0.1:8082/search?q=latest+DevOps+news&format=json'
```

Open the UI at <http://127.0.0.1:8082>.

Stop it with:

```sh
docker-compose down
```

The Valkey volume is retained by `docker-compose down`. Remove it only when you intentionally want to discard the service state:

```sh
docker-compose down -v
```

## n8n AI Agent tool

Connect your existing Ollama Chat Model to an n8n AI Agent. Add an HTTP Request Tool named `Local Web Search` with:

- Method: `GET`
- URL: `http://127.0.0.1:8082/search`
- Query parameter `q`: the search query supplied by the agent
- Query parameter `format`: `json`

If n8n runs inside Docker, use `http://host.docker.internal:8082/search` instead of `127.0.0.1`.

Tell the agent to use this tool only for questions requiring current information, and to return the result URLs as sources. Add a separate page-fetching tool if the agent needs to inspect the full content behind a result.

## Security notes

- Do not expose this instance to the public internet without adding authentication and a reverse proxy.
- Keep `.env` local; it is ignored by the repository's root `.gitignore`.
- The search query is sent to the external engines enabled in SearXNG. SearXNG does not provide a single independent web index.
