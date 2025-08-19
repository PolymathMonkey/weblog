---
title: "Threathunting III: HTTP Honeypot develop and setup"
author: ["Dirk"]
date: 2025-08-13T06:35:00+02:00
lastmod: 2025-08-19T12:02:12+02:00
tags: ["threathunting", "honeypot"]
categories: ["forensic"]
draft: false
weight: 1003
---

<div class="ox-hugo-toc toc">

<div class="heading">Table of Contents</div>

- [Introduction](#introduction)
    - [Brief overview of the use case](#brief-overview-of-the-use-case)
- [Setting up HoneyPot HTTPD for Web Data](#setting-up-honeypot-httpd-for-web-data-ingestion)
    - [Containerizing the application to run inside docker](#containerizing-the-application-to-run-inside-docker)
    - [🚀 Code adjustments for our environment](#code-adjustments-for-our-environment)
    - [📝 Conclusion](#v-dot-conclusion)

</div>
<!--endtoc-->


## Introduction {#introduction}


### Brief overview of the use case {#brief-overview-of-the-use-case}

I recently set out to ingest web traffic data into my SIEM solution,
which requires data to be ingested in a specific format. After
researching various options, I sought an easy-to-use solution that could
integrate with our existing Elasticsearch setup. One tool that caught my
attention was HoneyPot HTTPD.

As I researched potential solutions, I realized that many of them
required manual configuration and scripting to ingest web data into
Elasticsearch. However, HoneyPot HTTPD offered a simple and elegant way
to do so through its built-in ingestion feature. This was especially
appealing since I wanted to integrate the web traffic data with our
existing SIEM setup that utilized Elasticsearch.

In particular, I needed a tool that could collect web traffic data and
forward it to a centralized location for analysis and processing.
Honeypot HTTPD's ability to ingest web data into Elasticsearch made it
an attractive choice, as it would allow me to leverage our existing
Elasticsearch infrastructure and integrate the data with our SIEM
solution seamlessly.

With this in mind, I set out to explore how to use HoneyPot HTTPD to
ingest web traffic data into Elasticsearch. In the following sections,
I'll walk you through the steps I took to configure HoneyPot HTTPD for
ingestion, including the Dockerfile used to build the container and any
additional configuration settings required.


## Setting up HoneyPot HTTPD for Web Data {#setting-up-honeypot-httpd-for-web-data-ingestion}


### Containerizing the application to run inside docker {#containerizing-the-application-to-run-inside-docker}

-   Creating a Dockerfile

    I started by creating a Dockerfile that would build the HoneHTTPD
    image. The Dockerfile included the following instructions:
    ```sh
    # Use python base image
    FROM python:3

    # Set environment
    ARG APP_NAME=honeyhttpd
    ENV APP_NAME=${APP_NAME}

    ARG USER_ID="10001"
    ARG GROUP_ID="app"
    ARG HOME="/app"

    ENV HOME=${HOME}

    # Create user and environment
    RUN groupadd --gid ${USER_ID} ${GROUP_ID} && \
        useradd --create-home --uid ${USER_ID} --gid ${GROUP_ID} --home-dir /app ${GROUP_ID}


    # Install dependencies
    RUN apt-get update && \
        apt-get install -y --no-install-recommends \
            file        \
            gcc         \
            libwww-perl curl unzip && \
        apt-get autoremove -y && \
        apt-get clean

    # Set workdir
    WORKDIR ${HOME}

    # Copy config files and certs into container
    COPY ./requirements.txt .
    COPY ./config.json .
    COPY ./server*.pem .
    COPY ./ca.crt .
    COPY honeyhttpd logs servers util .
    COPY start.py .

    # Upgrade python packages and install dependencies
    RUN pip3 install --upgrade pip
    RUN pip3 install virtualenv
    RUN python3 -m virtualenv ${HOME} && \
    virtualenv ${HOME}
    RUN pip3 install --no-cache-dir --upgrade pip setuptools wheel elasticsearch==8.13.0 && \
    pip3 install --no-cache-dir --upgrade -r ./requirements.txt && pip3 install -r ./requirements.txt

    ADD . ${HOME}

    # Remove compilers
    RUN apt-get remove gcc --purge -y

        # Drop root and change ownership of the application folder to the user
    RUN chown -R ${USER_ID}:${GROUP_ID} ${HOME}
    USER ${USER_ID}

    # Expose Honeypot ports to outside world
     EXPOSE 8443:8443

    # run cowrie with config
    CMD ["python3", "start.py", "--config", "config.json"]
    ```
    In this Dockerfile, I:

    -   Installed necessary dependencies, including Python and pip
    -   Installed the required packages, including HoneyPot HTTPD
    -   Set the working directory to /usr/local/bin to run the application
        from
    -   Exposed port 80 for HTTP traffic
    -   Copied the configuration file (config.yaml) into the container
    -   Specified the command to run HoneyPot HTTPD with the -c option,
        which points
    -   to the configuration file

-   Building and Running the Container

    Once I had created the Dockerfile, I built the image by running the
    following command:
    ```sh
    sudo docker build -t honeyhttpd .
    ```
    This command told Docker to create an image with the tag honeyhttpd
    using the instructions in the Dockerfile.To run the container, I used
    the following command:
    ```sh
    sudo docker run --hostname honeyhttpd -p 8443:8443 honeyhttpd
    ```
    This command started a new container from the honeyhttpd image and
    mapped port 8443 on the host machine to the port 8443 in the container.

-   Configuring the Container

    To configure the honeypot, I updated the config.yaml file to point to
    my Elasticsearch instance. Here's an example of what the configuration
    file might look like:
    ```json
    "loggers": {
        "ElasticSearchLogger": {
            "active": true,
            "config": {
                "server": "https://192.168.210.95:9200",
                "verify_certs": true,
                "username": "elastic",
                "password": "SecretPassword",
                "index": "cowrie.webhoneypot",
            }
        }
    ```
    the server config itself is quite simplistic:
    ```json
      "servers" : [
            {"handler": "ApachePasswordServer", "mode": "https", "port": 8443, "domain": "cooldomain.com", "timeout": 10, "cert_path": "server_cert.pem", "key_path": "server_key.pem"},
        ],
        "user": "nobody",
        "group": "nogroup"
    }
    ```
    This configuration told HoneyPot HTTPD to forward web traffic data to
    my Elasticsearch instance, where it could be processed and stored.

    For the cert_path and key_path we earlier copied the self signed cert and
    key to the container.

    With the container running and configured, I was now ready to test
    HoneyPot HTTPD's ability to ingest web traffic data into
    Elasticsearch.

    Which I did with just opening <https://honeypot.home.arpa:8443> in my
    webbrowser. Which gave me the htpasswd auth prompt.


### 🚀 Code adjustments for our environment {#code-adjustments-for-our-environment}

I started from the original ApachePasswordServer in honeyhttpd, which was
fairly minimal—it simply responded with a 401 on selected paths and captured
credentials in a rudimentary way. I overhauled it to better structure logging,
extract metadata, and sanitize inputs before sending logs to Elasticsearch.

Below, I explain each change with commentary.


#### 🔐 Improvements in ApachePasswordServer.py: {#improvements-in-apachepasswordserver-dot-py}

This update significantly extends the functionality of ApachePasswordServer.py.
It builds on the original honeyhttpd implementation by enhancing its ability to simulate
Basic Authentication, extract and decode credentials from the \`Authorization\` header,
and log structured metadata about each HTTP request and response.

It now integrates tightly with an \`ElasticSearchLogger\`, providing enriched, sanitized logs
for further analysis or visualization. Custom helper functions ensure safe parsing,
while connection and client metadata offer greater context to the captured events.

<!--list-separator-->

-  📊 Summary of Changes

    -   2 files changed: ApachePasswordServer.py and Elasticsearchlogger.py
    -   Key improvements:
        -   Simulation of Basic Auth (401 challenge on sensitive paths)
        -   Credential extraction and decoding from \`Authorization\` header
        -   Connection metadata collection (IP, port, useragent etc.)
        -   Header parsing with case-insensitive lookup
        -   Structured request and response logging
        -   Integration with \`ElasticSearchLogger\`
        -   Safer JSON serialization and error handling

    Here I describe how I extended the honeypot server to improve credential
    logging and integrate with Elasticsearch for structured logging.

    Starting from a basic server that simply issued 401 responses,
    I added features to parse HTTP requests, decode Basic Auth headers,
    and enrich logs with request and connection metadata. This makes the
    server far more useful for DFIR research and threat hunting.

    ---


#### Original baseline (for reference) {#original-baseline--for-reference}

Big thanks to the great ground wrok from bocajspear1
over at github with the [honeyHTTPD](https://github.com/bocajspear1/honeyhttpd) Server. That way
I did not had to write all from scratch. But I still had to
make some improvements in order to use the honeypot in my Environment.

```python
from servers.ApacheServer import ApacheServer
import honeyhttpd.lib.encode as encode

class ApachePasswordServer(ApacheServer):
    def on_request(self, handler):
        return None, None

    def on_GET(self, path, headers):
        if path == "/" or path == "/index.php" or path == "/admin":
            return 401, [],  "Basic realm=\"Secure Area\""
        return 404, [], ""

    def on_POST(self, path, headers, post_data):
        return 404, [], ""

    def on_error(self, code, headers, message):
        return code, [("Connection", "close"), ("Content-Type", "text/html; charset=iso-8859-1")], message

    def on_complete(self, client, code, req_headers, res_headers, request, response):
        extra = {}
        for header in req_headers:
            if header[0].lower() == "authorization":
                auth_split = header[1].split(" ")
                if len(auth_split) > 1:
                    auth_data = auth_split[1]
                    extra['creds'] = encode.decode_base64(auth_data)
        self.log(client, request, response, extra)

    def default_headers(self):
        return []
```


#### 🆕 Auto-Injection of ElasticSearchLogger in __init__() {#auto-injection-of-elasticsearchlogger-in-init}

To ensure consistent structured logging, \`ElasticSearchLogger\` is
now injected into the logger stack if not already present.

```diff
+ if loggers is None:
+     loggers = []
+ if not any(isinstance(logger, ElasticSearchLogger) for logger in loggers):
+     loggers.append(ElasticSearchLogger())
```

This avoids missing logs if the user forgets to pass a logger during instantiation.

---


#### 🔐 New GET Handler Simulates Apache Basic Auth Challenge {#new-get-handler-simulates-apache-basic-auth-challenge}

The server now returns \`401 Unauthorized\` and prompts for credentials on common admin paths.

```diff
+ def on_GET(self, path, headers):
+     if path in ["/", "/index.php", "/admin"]:
+         return 401, [], 'Basic realm="Secure Area"'
+     return 404, [], ""
```

This turns the honeypot into a credential trap for automated brute-forcers and scanners.

---


#### 🧰 New Helper Functions for Header Parsing and Auth Decoding {#new-helper-functions-for-header-parsing-and-auth-decoding}

I had to introduce two utility functions:

-   parse_to_json() transforms header tuples into a JSON dictionary.
-   decode_basic_auth() decodes Base64 credentials and validates them.

<!--listend-->

```python
def parse_to_json(data):
    return json.dumps({key: value for key, value in data})

def decode_basic_auth(b64_string):
    try:
        decoded_bytes = base64.b64decode(b64_string, validate=True)
        decoded_str = decoded_bytes.decode('utf-8')
        if ':' in decoded_str:
            return decoded_str
        else:
            return "[invalid format: missing colon]"
    except Exception as e:
        return f"[decode error: {e}]"
```

These enable safe and consistent parsing for incoming HTTP headers.

---


#### 📦 Structured Request Parsing &amp; Credential Extraction in on_complete() {#structured-request-parsing-and-credential-extraction-in-on-complete}

I had to completely rework the on_complete() method to:

-   Parse the HTTP request line
-   Convert headers to a JSON object
-   Extract relevant metadata and credentials
-   Store all data in \`req_dict\`, passed to the logger

<!--listend-->

```diff
-        extra = {}
+        req_dict = {}
...
+        lines = request.split('\n')
+        first_line = lines[0].strip()
+        parts = first_line.split()
+        requested_url = parts[1] if len(parts) > 1 else ""
+        method = parts[0] if len(parts) > 0 else ""
+        req_dict['request_body'] = requested_url
+        req_dict['method'] = method
+        req_dict['code'] = code
+
+        try:
+            req_output = parse_to_json(req_headers)
+            parsed_req = json.loads(req_output)
+        except Exception as e:
+            parsed_req = {}
+
+        for key in ['Host', 'User-Agent', 'Accept', 'Accept-Language',
+                    'Accept-Encoding', 'Authorization']:
+            req_dict[key] = parsed_req.get(key, '')
+
+        auth = parsed_req.get('Authorization', '')
+        if auth.startswith("Basic "):
+            try:
+                auth_data = auth.split(" ", 1)[1]
+                decoded_creds = encode.decode_base64(auth_data)
+                req_dict['creds'] = decoded_creds
+            except Exception as e:
+                req_dict['creds'] = f"[decode error: {e}]"
```

This prepares the logs to include useful hunting metadata for later analysis.

---


#### 🌐 Enriched Connection Metadata Logging {#enriched-connection-metadata-logging}

Additional context is logged to req_dict, including:

-   Remote IP and port
-   SSL usage
-   Listening port
-   HTTP response code
-   Response headers

<!--listend-->

```diff
+        remote_ip = client[0] if isinstance(client, tuple) else ''
+        remote_port = client[1] if isinstance(client, tuple) else ''
+        is_ssl = getattr(self, 'is_ssl', False)
+        port = getattr(self, 'port', '8843')
+
+        req_dict['remote_ip'] = remote_ip
+        req_dict['remote_port'] = remote_port
+        req_dict['is_ssl'] = is_ssl
+        req_dict['port'] = port
+        req_dict['response_headers'] = res_dict
+
+        self.log(client, request, response, res_dict, req_dict)
```

This provides rich forensic data for Elasticsearch or Splunk pipelines.

---


#### 🔑 Highlights {#highlights}

-   ****🆕 Auto-injection of \`ElasticSearchLogger\`****
    Ensures logs are never silently dropped, even if no logger is passed explicitly.

-   ****🔐 Basic Auth Simulation with 401 Challenge****
    Returns \`401 Unauthorized\` on suspicious paths to bait scanners.

-   ****🧰 Safe Parsing &amp; Decoding with Helpers****
    New functions parse_to_json() and decode_basic_auth() added for reliability.

-   ****📦 Structured Logging in on_complete()****
    Fully rewritten to extract metadata, decode credentials, and prepare logs.

-   ****🌐 Rich Connection Context****
    Logs IP, port, and full response headers for correlation.


#### 🧠 Use Case {#use-case}

These changes upgrade ApachePasswordServer.py from a toy honeypot to a serious
data source for threat hunting. It can now be safely deployed in research
environments, logging attack metadata in structured formats ideal for analysis
pipelines like Elasticsearch + Kibana or Splunk.


### 📝 Conclusion {#v-dot-conclusion}


#### 🔑 Key points about the changes in honeyhttpd {#recap-of-key-points-about-using-honeypot-httpd-to-ingest-web-data-into-elasticsearch}

This article detailed how I enhanced ApachePasswordServer.py and
ElasticSearchLogger to make the simple honeypot into a powerful
tool for capturing attacker behavior.

I added Structured parsing of HTTP requests and responses combined with
integration into ElasticSearchLogger allowed to generate rich, queryable logs,
complete with client metadata, HTTP headers, and decoded credentials.

This setup not only captures raw data but also organizes it in a way that
facilitates downstream analysis using Elasticsearch or similar log management
platforms.


#### 💡 Final thoughts {#final-thoughts}

Deploying this enhanced honeypot within your environment equips you with
detailed, actionable insights into attacker tactics and techniques.
The ability to collect and analyze credential attempts and associated metadata
improves detection and supports incident response efforts.

By bridging the gap between mere detection and detailed forensic logging, this
solution empowers proactive threat hunting and accelerates the identification
of emerging attack patterns. Integrating it into your security operations stack
can thus significantly boost your detection and defense capabilities.

<span class="underline">TODO</span> - Extensive testing of the honeypot, there will be an article coming up
how to do automated honeypot testing with Zap proxy, stay tuned!

<span class="underline">TODO</span> - Still need to deploy the honeypot to my honeypot server so that I can
see how it operates in a live scenario. If you faster than me let me know you
results

<span class="underline">TODO</span> - Upload the new honeyhttpd code to a git repo and ask honeyhttpd author
if they interessted in a merge request from my code.

Next, we will talk about Setting up the ELK Server and how to ingest data.
Stay tuned!
