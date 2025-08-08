---
title: "Threathunting III: HTTP Honeypot develop and setup"
author: ["Dirk"]
date: 2019-01-11T16:00:00-05:00
lastmod: 2025-08-01T18:02:01+02:00
tags: ["threathunting", "honeypot"]
categories: ["threathunting"]
draft: true
weight: 1003
---

<div class="ox-hugo-toc toc">

<div class="heading">Table of Contents</div>

- [Introduction](#introduction)
    - [Brief overview of the use case](#brief-overview-of-the-use-case)
- [Setting up HoneyPot HTTPD for Web Data Ingestion and adjust code for our needs](#setting-up-honeypot-httpd-for-web-data-ingestion)
    - [Containerizing the application to run inside docker](#containerizing-the-application-to-run-inside-docker)
    - [Code adjustments for our environment](#code-adjustments-for-our-environment)
- [Ingesting Web Data into Elasticsearch with HoneyPot HTTPD](#iii-dot-ingesting-web-data-into-elasticsearch-with-honeypot-httpd)
    - [Explanation of how to use the honeyhttpd command-line tool to ingest web data into Elasticsearch](#explanation-of-how-to-use-the-honeyhttpd-command-line-tool-to-ingest-web-data-into-elasticsearch)
    - [Example of how to configure the honeyhttpd output to match your desired Elasticsearch index structure](#example-of-how-to-configure-the-honeyhttpd-output-to-match-your-desired-elasticsearch-index-structure)
- [Benefits and Use Cases](#iv-dot-benefits-and-use-cases)
    - [Discussion of the benefits of using HoneyPot HTTPD for ingesting web data into Elasticsearch (e.g., improved threat detection, enhanced visibility)](#discussion-of-the-benefits-of-using-honeypot-httpd-for-ingesting-web-data-into-elasticsearch--e-dot-g-dot-improved-threat-detection-enhanced-visibility)
    - [Real-world examples of use cases where this setup can be particularly effective (e.g., logging web traffic, monitoring online activity)](#real-world-examples-of-use-cases-where-this-setup-can-be-particularly-effective--e-dot-g-dot-logging-web-traffic-monitoring-online-activity)
- [Conclusion](#v-dot-conclusion)
    - [Recap of key points about using HoneyPot HTTPD to ingest web data into Elasticsearch](#recap-of-key-points-about-using-honeypot-httpd-to-ingest-web-data-into-elasticsearch)
    - [Final thoughts on the value of this setup for your organization's threat hunting or security operations.](#final-thoughts-on-the-value-of-this-setup-for-your-organization-s-threat-hunting-or-security-operations-dot)

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


## Setting up HoneyPot HTTPD for Web Data Ingestion and adjust code for our needs {#setting-up-honeypot-httpd-for-web-data-ingestion}


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
    RUN pip3 install --no-cache-dir --upgrade pip setuptools wheel elasticsearch && \
    pip3 install --no-cache-dir --upgrade -r ./requirements.txt && pip3 install -r ./requirements.txt

    ADD . ${HOME}

    # Remove compilers
    RUN apt-get remove gcc --purge -y

        # Drop root and change ownership of the application folder to the user
    RUN chown -R ${USER_ID}:${GROUP_ID} ${HOME}
    USER ${USER_ID}

    # Expose Honeypot ports to outside world
    EXPOSE 8888:8888
    EXPOSE 8889:8889
    EXPOSE 8443:8443

    # run cowrie with config
    CMD ["python3", "start.py", "--config", "config.json"]
    ```
    In this Dockerfile, I:

    -   Used the official Ubuntu image as the base image
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
    docker build -t honeyhttpd .
    ```
    This command told Docker to create an image with the tag honeyhttpd
    using the instructions in the Dockerfile.To run the container, I used
    the following command:
    ```sh
    docker run -p 80:80 honeyhttpd
    ```
    This command started a new container from the honeyhttpd image and
    mapped port 80 on the host machine to port 80 in the container.

-   Configuring the Container

    To configure the container, I updated the config.yaml file to point to
    my Elasticsearch instance. Here's an example of what the configuration
    file might look like:
    ```sh
    -ingest:
    es_host: "localhost:9200"
    es_index: "logstash-2019.04"
    es_type: "log"
    ```
    This configuration told HoneyPot HTTPD to forward web traffic data to
    my Elasticsearch instance, where it could be processed and stored.

    With the container running and configured, I was now ready to test
    HoneyPot HTTPD's ability to ingest web traffic data into
    Elasticsearch.


### Code adjustments for our environment {#code-adjustments-for-our-environment}


#### 🔐 Major Improvements in \`ApachePasswordServer.py\`: Credential Capture, Logging, and Header Parsing {#major-improvements-in-apachepasswordserver-dot-py-credential-capture-logging-and-header-parsing}

This update significantly enhances \`ApachePasswordServer.py\` by simulating Basic Authentication, extracting credentials from the \`Authorization\` header, and enriching log data with structured request and response metadata. It also ensures integration with \`ElasticSearchLogger\` and introduces helper functions for safer parsing and decoding.

<!--list-separator-->

-  📊 Summary of Changes

    -   1 file changed: \`ApachePasswordServer.py\`
    -   ~120 insertions, ~10 deletions
    -   Key improvements:
        -   Basic Auth simulation (401 challenge)
        -   Credential harvesting from Authorization header
        -   Integration with \`ElasticSearchLogger\`
        -   Structured logging with metadata (IP, method, headers)

    ---

<!--list-separator-->

-  🆕 Auto-Injection of \`ElasticSearchLogger\` in \`\__init__()\`

    To ensure consistent structured logging, \`ElasticSearchLogger\` is now injected into the logger stack if not already present.

    ```diff
    + if loggers is None:
    +     loggers = []
    + if not any(isinstance(logger, ElasticSearchLogger) for logger in loggers):
    +     loggers.append(ElasticSearchLogger())
    ```

    This avoids missing logs if the user forgets to pass a logger during instantiation.

    ---

<!--list-separator-->

-  🔐 New GET Handler Simulates Apache Basic Auth Challenge

    The server now returns \`401 Unauthorized\` and prompts for credentials on common admin paths.

    ```diff
    + def on_GET(self, path, headers):
    +     if path in ["/", "/index.php", "/admin"]:
    +         return 401, [], 'Basic realm="Secure Area"'
    +     return 404, [], ""
    ```

    This turns the honeypot into a credential trap for automated brute-forcers and scanners.

    ---

<!--list-separator-->

-  🧰 New Helper Functions for Header Parsing and Auth Decoding

    Two utility functions were introduced:

    -   \`parse_to_json()\` transforms header tuples into a JSON dictionary.
    -   \`decode_basic_auth()\` decodes Base64 credentials and validates them.

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

<!--list-separator-->

-  📦 Structured Request Parsing &amp; Credential Extraction in \`on_complete()\`

    The \`on_complete()\` method has been completely reworked to:

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

    This prepares your logs to include useful hunting metadata for later analysis.

    ---

<!--list-separator-->

-  🌐 Enriched Connection Metadata Logging

    Additional context is logged to \`req_dict\`, including:

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

<!--list-separator-->

-  ✅ Result

    These changes turn \`ApachePasswordServer\` into a more useful honeypot component for DFIR or threat hunting research.

    It now supports:

    -   Credential collection from Basic Auth attacks
    -   Well-structured logs for easy ingestion
    -   Full IP/session/request context per event
    -   Easier extensibility for new headers or paths

    You’re now well-positioned to integrate this into a broader threat hunting or research stack.


## Ingesting Web Data into Elasticsearch with HoneyPot HTTPD {#iii-dot-ingesting-web-data-into-elasticsearch-with-honeypot-httpd}


### Explanation of how to use the honeyhttpd command-line tool to ingest web data into Elasticsearch {#explanation-of-how-to-use-the-honeyhttpd-command-line-tool-to-ingest-web-data-into-elasticsearch}


### Example of how to configure the honeyhttpd output to match your desired Elasticsearch index structure {#example-of-how-to-configure-the-honeyhttpd-output-to-match-your-desired-elasticsearch-index-structure}


## Benefits and Use Cases {#iv-dot-benefits-and-use-cases}


### Discussion of the benefits of using HoneyPot HTTPD for ingesting web data into Elasticsearch (e.g., improved threat detection, enhanced visibility) {#discussion-of-the-benefits-of-using-honeypot-httpd-for-ingesting-web-data-into-elasticsearch--e-dot-g-dot-improved-threat-detection-enhanced-visibility}


### Real-world examples of use cases where this setup can be particularly effective (e.g., logging web traffic, monitoring online activity) {#real-world-examples-of-use-cases-where-this-setup-can-be-particularly-effective--e-dot-g-dot-logging-web-traffic-monitoring-online-activity}


## Conclusion {#v-dot-conclusion}


### Recap of key points about using HoneyPot HTTPD to ingest web data into Elasticsearch {#recap-of-key-points-about-using-honeypot-httpd-to-ingest-web-data-into-elasticsearch}


### Final thoughts on the value of this setup for your organization's threat hunting or security operations. {#final-thoughts-on-the-value-of-this-setup-for-your-organization-s-threat-hunting-or-security-operations-dot}
