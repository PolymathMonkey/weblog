---
title: "Threat Hunting III: HTTP Honeypot"
author: ["Dirk"]
date: 2026-04-21T08:39:00+02:00
lastmod: 2026-04-22T07:09:35+02:00
tags: ["forensicwheels", "honeypot"]
categories: ["threathunting"]
draft: false
weight: 1003
---

<div class="ox-hugo-toc toc">

<div class="heading">Table of Contents</div>

- [Introduction](#introduction)
- [Architecture Overview](#architecture-overview)
- [Containerizing with Docker](#containerizing-with-docker)
- [Configuration](#configuration)
- [Code Improvements](#code-improvements)
    - [ApachePasswordServer.py](#apachepasswordserver-dot-py)
    - [ElasticSearchLogger.py](#elasticsearchlogger-dot-py)
- [Advantages Over the Original](#advantages-over-the-original)
- [Testing](#testing)
- [Next Steps](#next-steps)
- [Summary](#summary)

</div>
<!--endtoc-->


## Introduction {#introduction}

I set out to build a honeypot that captures HTTP attack traffic and forwards it directly to Elasticsearch for analysis. Instead of reinventing the wheel, I built on top of `honeyhttpd` by bocajspear1 and added structured logging, credential extraction, and proper sanitization.

The result is a production-ready honeypot that simulates an Apache server protected by HTTP Basic Authentication, capturing attacker credentials and request metadata in queryable Elasticsearch documents.


## Architecture Overview {#architecture-overview}

The honeypot works in three layers:

1.  `ApachePasswordServer` — Demands Basic Auth on every request, parses HTTP headers, and collects metadata
2.  `ElasticSearchLogger` — Sanitizes logs and indexes them into Elasticsearch
3.  Docker Container — Runs the entire stack in an isolated environment


## Containerizing with Docker {#containerizing-with-docker}

I packaged the honeypot as a Docker container for easy deployment:

```dockerfile
FROM python:3

ARG APP_NAME=honeyhttpd
ARG USER_ID="10001"
ARG GROUP_ID="app"
ARG HOME="/app"

ENV HOME=${HOME}

# Create unprivileged user
RUN groupadd --gid ${USER_ID} ${GROUP_ID} && \
    useradd --create-home --uid ${USER_ID} --gid ${GROUP_ID} --home-dir /app ${GROUP_ID}

# Install dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        file gcc libwww-perl curl unzip && \
    apt-get clean && apt-get autoremove -y

WORKDIR ${HOME}

# Copy application files
COPY ./requirements.txt .
COPY ./config.json .
COPY ./server*.pem .
COPY ./ca.crt .
COPY honeyhttpd logs servers util .
COPY start.py .

# Install Python dependencies
RUN pip3 install --upgrade pip setuptools wheel && \
    pip3 install --no-cache-dir elasticsearch==8.13.0 && \
    pip3 install --no-cache-dir -r ./requirements.txt

# Remove build tools to reduce image size
RUN apt-get remove gcc --purge -y

# Set permissions and drop root
RUN chown -R ${USER_ID}:${GROUP_ID} ${HOME}
USER ${USER_ID}

EXPOSE 8443

CMD ["python3", "start.py", "--config", "config.json"]
```

Build and run:

```bash
docker build -t honeyhttpd .
docker run --hostname honeyhttpd -p 8443:8443 honeyhttpd
```


## Configuration {#configuration}

Point the honeypot at your Elasticsearch instance via `config.json`:

```json
{
  "loggers": {
    "ElasticSearchLogger": {
      "active": true,
      "config": {
        "server": "https://elasticsearch.example.com:9200",
        "verify_certs": true,
        "username": "elastic",
        "password": "your-password",
        "index": "honeypot-http"
      }
    }
  },
  "servers": [
    {
      "handler": "ApachePasswordServer",
      "mode": "https",
      "port": 8443,
      "domain": "target.example.com",
      "timeout": 10,
      "cert_path": "server_cert.pem",
      "key_path": "server_key.pem"
    }
  ]
}
```


## Code Improvements {#code-improvements}


### ApachePasswordServer.py {#apachepasswordserver-dot-py}

The server now properly simulates HTTP Basic Authentication and captures credentials in a structured way.

**Key features:**

-   `on_request()` — Enforces Basic Auth on every request. Returns 401 if Authorization header is missing
-   `on_POST()` — Stashes POST bodies for logging (critical for capturing login attempts)
-   `on_complete()` — Parses HTTP metadata: method, URL, request/response headers, and decodes Basic Auth credentials

Helper functions:

```python
def _decode_basic_auth(b64_string):
    """Decode Base64 Basic-Auth credentials into 'user:pass'."""
    try:
        decoded_bytes = base64.b64decode(b64_string, validate=True)
        decoded_str = decoded_bytes.decode('utf-8')
        return decoded_str if ':' in decoded_str else "[invalid format]"
    except Exception as e:
        return f"[decode error: {e}]"

def _extract_post_body(raw_request):
    """Extract POST body from raw HTTP request."""
    try:
        if '\r\n\r\n' in raw_request:
            return raw_request.split('\r\n\r\n', 1)[1].strip()
        if '\n\n' in raw_request:
            return raw_request.split('\n\n', 1)[1].strip()
    except Exception:
        pass
    return ''
```

The `on_complete()` method collects:

-   HTTP method and URL
-   Request/response headers (User-Agent, Accept, Content-Type, etc.)
-   HTTP status code
-   Decoded credentials (username:password)
-   POST body (for form submissions)


### ElasticSearchLogger.py {#elasticsearchlogger-dot-py}

The logger sanitizes all input before indexing to prevent injection attacks and ensure clean Elasticsearch documents.

**Sanitization functions:**

```python
def sanitize_string(s, max_length=1000):
    """Remove control characters and truncate strings."""
    if not isinstance(s, str):
        s = str(s)
    s = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', s)
    if len(s) > max_length:
        s = s[:max_length] + "...[cut]..."
    return s

def sanitize_dict(d, max_length=1000):
    """Recursively sanitize dictionaries and lists."""
    # ... sanitizes nested structures
```

**Elasticsearch indexing:**

```python
log_entry = {
    "@timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "remote_ip": remote_ip,
    "remote_port": remote_port,
    "protocol": "https" if is_ssl else "http",
    "port": port,
    "request": request,
    "response": response,
    "http.response.status_code": status_code,
    "http.request.method": method,
    "user_agent.original": user_agent,
    "http.request.body.content": post_body,
    "creds": decoded_credentials,
    "host.name": hostname
}
```

These fields are compatible with Elasticsearch's ECS (Elastic Common Schema), making queries and alerts straightforward.


## Advantages Over the Original {#advantages-over-the-original}

| Feature                   | Original             | Improved                         |
|---------------------------|----------------------|----------------------------------|
| Credential Capture        | Basic string parsing | Base64 decoding + validation     |
| POST Body Handling        | Not captured         | Properly extracted and logged    |
| Input Sanitization        | None                 | Removes control chars, truncates |
| Error Handling            | Minimal              | Comprehensive logging            |
| Elasticsearch Integration | Manual logging       | Direct indexing with ECS schema  |


## Testing {#testing}

Once deployed, test the honeypot:

```bash
curl -k -u attacker:password https://localhost:8443/
```

This should trigger a Basic Auth challenge. When credentials are provided, they get captured and indexed in Elasticsearch.

Query Elasticsearch:

```bash
curl -X GET "elasticsearch:9200/honeypot-http/_search?q=creds:*" \
  -u elastic:password
```


## Next Steps {#next-steps}

-   <span class="underline">TODO</span>: Automated testing with OWASP ZAP or similar tools
-   <span class="underline">TODO</span>: Deploy to production honeypot server for live monitoring
-   <span class="underline">TODO</span>: Submit improvements as pull request to original honeyhttpd project
-   <span class="underline">TODO</span>: ELK Stack setup guide for visualization and alerting


## Summary {#summary}

This enhanced honeypot transforms a simple HTTP challenge responder into a structured threat hunting tool. By capturing credentials, request metadata, and response data in Elasticsearch, you gain visibility into attack patterns and attacker behavior.

The honeypot is production-ready: it handles edge cases, sanitizes malicious input, and integrates seamlessly with existing SIEM infrastructure.
