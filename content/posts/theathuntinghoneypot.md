---
title: "Threat hunting II: SSH Honeypot setup"
author: ["Dirk"]
date: 2025-07-13T07:38:00+02:00
lastmod: 2025-07-21T13:24:22+02:00
tags: ["threathunting", "honeypot"]
categories: ["threathunting"]
draft: false
weight: 1002
---

<div class="ox-hugo-toc toc">

<div class="heading">Inhaltsverzeichnis</div>

- [Introduction](#introduction)
- [What is Cowrie?](#what-is-cowrie)
- [Why Podman over Docker?](#why-podman-over-docker)
- [Install cowrie as container and adjust configuration](#install-cowrie-as-container-and-adjust-configuration)
    - [🐧 Create a Dedicated User for Cowrie (No Login Shell)](#create-a-dedicated-user-for-cowrie--no-login-shell)
    - [🐳 Pull and Configure Cowrie with Podman](#pull-and-configure-cowrie-with-podman)
    - [🛠 cowrie.cfg – Basic Overview](#cowrie-dot-cfg-basic-overview)
    - [🚀 Run Cowrie Container as 'cowrie' User](#run-cowrie-container-as-cowrie-user)
    - [🔁 Useful Commands](#useful-commands)
    - [🔒 Security Notes](#security-notes)
- [Log Forwarding with Filebeat](#log-forwarding-with-filebeat)
    - [📦 Install Filebeat on Ubuntu](#install-filebeat-on-ubuntu)
    - [⚙ Configure and test Filebeat](#configure-and-test-filebeat)
    - [🚀 Start and Enable Filebeat](#start-and-enable-filebeat)
- [🎯 TL;DR – What Did We Just Do?](#tl-dr-what-did-we-just-do)
- [Whats next](#whats-next)

</div>
<!--endtoc-->


## Introduction {#introduction}

This post provides a brief walkthrough of how to deploy a lightweight,
containerized SSH honeypot using Cowrie and Podman, with the goal of
capturing and analyzing malicious activity as part of my threat hunting
strategy.


## What is Cowrie? {#what-is-cowrie}

Cowrie is an interactive SSH and Telnet honeypot designed to emulate a
real system, capturing attacker behavior in a controlled environment.
It allows defenders and researchers to observe malicious activity without
exposing actual infrastructure.

<span class="underline">Key capabilities of Cowrie include</span>

-   **Full session logging**: Records all commands entered by the attacker,
    along with input/output streams and timing data. Sessions can be saved
    as plaintext or in formats suitable for replay.

-   **Fake file system and shell environment**: Emulates a basic Linux shell
    with a user-modifiable file system. Attackers can navigate directories,
    read/write fake files, or attempt to download/upload payloads.

-   **Command emulation**: Supports a large set of common Unix commands (\`ls\`,
    \`cat\`, \`wget\`, etc.), allowing attackers to interact naturally, as
    if on a real system. And can be extended with more commands

-   **Credential logging**: Captures usernames and passwords used in
    brute-force login attempts or interactive logins.

-   **File download capture**: Logs and optionally stores any files attackers
    attempt to retrieve via \`wget\`, \`curl\`, or similar tools.

-   **JSON-formatted logging and integration's**: Outputs structured logs that
    are easy to parse and ingest into systems like ELK, Splunk, or custom
    analysis pipelines.

Cowrie is widely used in research, threat intelligence, and proactive defense
efforts to gather Indicators of Compromise (IOCs) and understand attacker
tactics,techniques, and procedures (TTPs).


## Why Podman over Docker? {#why-podman-over-docker}

Podman offers several advantages over Docker, particularly in terms of security
and system integration. It supports rootless containers, allowing users to run
containers without elevated privileges, which reduces the attack surface.

Podman is daemon-less, integrating more seamlessly with systemd and existing
Linux workflows. Additionally, Podman is fully compatible with the Open
Container Initiative (OCI) standards, ensuring interoperability and
flexibility across container ecosystems.


## Install cowrie as container and adjust configuration {#install-cowrie-as-container-and-adjust-configuration}


### 🐧 Create a Dedicated User for Cowrie (No Login Shell) {#create-a-dedicated-user-for-cowrie--no-login-shell}

****1. Create the 'cowrie' user (no home directory, no login shell)****

```sh
sudo useradd --system --no-create-home --shell /usr/sbin/nologin cowrie
```

****2. Create necessary directories and set ownership****

```sh
sudo mkdir -p /opt/cowrie/etc
sudo mkdir -p /opt/cowrie/var
sudo chown -R cowrie:cowrie /opt/cowrie
```


### 🐳 Pull and Configure Cowrie with Podman {#pull-and-configure-cowrie-with-podman}

****3. As the cowrie user, pull the container image****

```bash
sudo -u cowrie podman pull cowrie/cowrie
```

****4. Copy default config file into persistent volume****

```bash
sudo -u cowrie podman run --rm cowrie/cowrie \
  cat /cowrie/cowrie-git/etc/cowrie.cfg.dist > /opt/cowrie/etc/cowrie.cfg
```


### 🛠 cowrie.cfg – Basic Overview {#cowrie-dot-cfg-basic-overview}

The \`cowrie.cfg\` file is the main configuration for ****Cowrie****, the SSH/Telnet
honeypot we use. It uses INI-style syntax and is divided into sections. Each section
begins with a header like **[section_name]**.

<!--list-separator-->

-  📁 Key Sections &amp; Settings

    ****[ssh] / [telnet]****

    -   Enable or disable SSH/Telnet and set the port to listen on::
        ```sh
        enabled = true
        listen_port = 2222
        ```

    ****[honeypot]****

    -   Set honeypot host name and logpath properties:
        ```sh
        hostname = cowrie-host

        # Directory where to save log files in.
        log_path = var/log/cowrie
        ```

    -   Define login behavior:
        ```sh
        auth_class = AuthRandom
        auth_class_parameters = 1, 5, 10
        ```
        I use AuthRandom here which causes to allow access after "randint(2,5)"
        attempts. This means the threat actor will fail with some logins and some
        will be logged in immediately.

    ****[output_jsonlog]****

    -   Configure logging and output plugins:
        ```sh
        [output_jsonlog]
        enabled = true
        logfile = ${honeypot:log_path}/cowrie.json
        epoch_timestamp = false
        ```
        Here I set the log file path, this is important so that file beat later can
        pickup on the juicy honeypot log files.

    This is the whole configuration needed to run the honeypot.

    <span class="underline">📌 Notes</span>

    -   Restart Cowrie after configuration changes.
    -   You can split configuration across multiple \`.cfg\` files in \`cowrie.cfg.d/\` for modular setup.


### 🚀 Run Cowrie Container as 'cowrie' User {#run-cowrie-container-as-cowrie-user}

****Start the Cowrie container (replace existing if needed)****

```bash
sudo -u cowrie podman run -d --name cowrie \
  -v /opt/cowrie/etc:/cowrie/cowrie-git/etc:Z \
  -v /opt/cowrie/var:/cowrie/cowrie-git/var:Z \
  -p 2222:2222 cowrie/cowrie
```


### 🔁 Useful Commands {#useful-commands}

-   ****View logs****
    ```bash
    sudo -u cowrie podman logs -f cowrie
    ```

-   ****Restart container****
    ```bash
    sudo -u cowrie podman restart cowrie
    ```

-   ****Stop container****
    ```bash
    sudo -u cowrie podman stop cowrie
    ```


### 🔒 Security Notes {#security-notes}

-   The \`cowrie\` user has no login shell (\`/usr/sbin/no login\`)
-   Running Cowrie isolated via Podman increases containment
-   All files are owned by \`cowrie\`, no root access required for normal operation


## Log Forwarding with Filebeat {#log-forwarding-with-filebeat}


### 📦 Install Filebeat on Ubuntu {#install-filebeat-on-ubuntu}

****1. Add Elastic’s GPG key and repository****

```bash
curl -fsSL https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elastic.gpg

echo "deb [signed-by=/usr/share/keyrings/elastic.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/elastic-8.x.list
```

****2. Update APT and install Filebeat****

```bash
sudo apt update
sudo apt install filebeat
```


### ⚙ Configure and test Filebeat {#configure-and-test-filebeat}

****3. Edit Filebeat config****

```bash
sudo mg /etc/filebeat/filebeat.yml
```

The filebeat config is straight forward. You have to write a filebeat.input
block which contains the path where the logfiles are you need to ingest. And
at the end the log-destination (logstash) so that filebeat knows where to send
the logs to:

```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /opt/cowrie/var/log/cowrie/cowrie.json
  json.keys_under_root: true
  json.add_error_key: true
  fields:
    source: cowrie
  fields_under_root: true

output.logstash:
  hosts: ["192.168.123.5:5044"]
```

****4. (Optional) Test Filebeat config****

```bash
sudo filebeat test config
```


### 🚀 Start and Enable Filebeat {#start-and-enable-filebeat}

****5. Enable and start Filebeat****

```bash
sudo systemctl enable filebeat
sudo systemctl daemon-reload
sudo systemctl start filebeat
```

****6. Check Filebeat status and logs****

```bash
sudo systemctl status filebeat
sudo journalctl -u filebeat -f
```


## 🎯 TL;DR – What Did We Just Do? {#tl-dr-what-did-we-just-do}

****1. We deployed Cowrie like pros.****

-   Ran it safely in a Podman container under a non-login user.
-   No mess, no root, no regrets.

****2. Logs? Sorted.****

-   Filebeat scooped up Cowrie’s logs and shipped them to Elasticsearch.
-   Now we can actually **see** who's knocking on the honeypot door.

****3. Everything’s persistent.****

-   Configs and logs live outside the container. Cowrie forgets nothing—even after a reboot.

****4. Setup is clean and modular.****

-   Each part (Cowrie, Filebeat, Elasticsearch) does its job.
-   Break one, fix one—no domino disasters.

****5. It’s nerdy, useful, and kinda fun.****

-   Now I built a mini threat intel system.
-   Now I can sit back, sip coffee, and watch the kiddies play.


## Whats next {#whats-next}

Next I had to build the HTTP honeypot, stay tuned for the follow up!

## Feedback and Comments
{{< giscus >}}
