---
title: "Threat hunting II: SSH Honeypot setup"
author: ["Dirk"]
date: 2025-07-13T07:38:00+02:00
lastmod: 2025-07-23T09:43:40+02:00
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
- [Preconditions / System setup](#preconditions-system-setup)
    - [Ubuntu Installed on Raspberry Pi 4+](#ubuntu-installed-on-raspberry-pi-4-plus)
    - [System Fully Updated](#system-fully-updated)
    - [Podman installed and working:](#podman-installed-and-working)
    - [VLAN Tagging Configured on Network Interface](#vlan-tagging-configured-on-network-interface)
- [Setup environment, install cowrie as container and adjust configuration](#setup-environment-install-cowrie-as-container-and-adjust-configuration)
    - [🐧 Create a Dedicated User for Cowrie (No Login Shell)](#create-a-dedicated-user-for-cowrie--no-login-shell)
    - [🐳 Pull and Configure Cowrie with Podman](#pull-and-configure-cowrie-with-podman)
    - [🛠 cowrie.cfg – Basic Overview](#cowrie-dot-cfg-basic-overview)
    - [🚀 Run Cowrie Container as 'cowrie' User](#run-cowrie-container-as-cowrie-user)
    - [🎯 Operating the Honeypot](#operating-the-honeypot)
    - [🔄 Automatically Restart Cowrie Podman Container with systemd](#automatically-restart-cowrie-podman-container-with-systemd)
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


## Preconditions / System setup {#preconditions-system-setup}

Before I proceed with the cowrie setup, I made sure the following preconditions are met:


### Ubuntu Installed on Raspberry Pi 4+ {#ubuntu-installed-on-raspberry-pi-4-plus}

I am using a Raspberry Pi 4+ running Ubuntu


### System Fully Updated {#system-fully-updated}

After installation, I made sure system is up to date:

```bash
sudo apt update && sudo apt upgrade -y
```


### Podman installed and working: {#podman-installed-and-working}

```sh
# Ubuntu 20.10 and newer
sudo apt-get -y install podman
```

Run the Hello World Container.In this moment I did not had the cowrie user yet
setup so I used my system user to test

```bash
podman run hello-world
Trying to pull docker.io/library/hello-world:latest...
...
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

tho sometimes the pulling fails like that then I had to put \`docker.io\` in
front of the container name like:

```sh
podman run docker.io/hello-world
```

then it would work for sure.


### VLAN Tagging Configured on Network Interface {#vlan-tagging-configured-on-network-interface}

In my network setup for threathunting the honeypot requires VLAN tagging to
configured to reachable from the outside, VLAN210 is my restricted Network.
Therefore i needed to configure the vlan using `nmcli` so it's persistent across reboots.


#### Example: Create a VLAN interface (e.g., VLAN ID 210 on main if) {#example-create-a-vlan-interface--e-dot-g-dot-vlan-id-210-on-main-if}

```bash
sudo nmcli con add type vlan con-name vlan210 dev mainif id 210 ip4 192.168.210.3/24 gw4 192.168.210.1
sudo nmcli con up vlan210
```

-   `con-name vlan210`: Name of the new VLAN connection.
-   `dev mainif`: Physical interface to tag.
-   `id 210`: VLAN ID.
-   `ip4`, `gw4`: Optional IP and gateway assignment.

This will persist the configuration and activate the VLAN interface
immediately. Next I moved on to Install the honeypot.

---


## Setup environment, install cowrie as container and adjust configuration {#setup-environment-install-cowrie-as-container-and-adjust-configuration}


### 🐧 Create a Dedicated User for Cowrie (No Login Shell) {#create-a-dedicated-user-for-cowrie--no-login-shell}

Running the Podman container under a dedicated system user with no login shell
is a recommended security best practice. Reasons include:

-   ****Privilege Separation:****
    Isolates the container from other system processes and users, limiting
    the potential impact of a compromise.

-   ****Reduced Attack Surface:****
    The user has no login shell (e.g., `/usr/sbin/nologin`), meaning it can't be
    used to log into the system interactively.

-   ****Auditing &amp; Logging:****
    Helps distinguish container activity in system logs and process lists,
    making monitoring easier.

-   ****Least Privilege Principle:****
    The user has only the permissions necessary to run the container — nothing more.

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
sudo -u cowrie podman pull docker.io/cowrie/cowrie
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
        This sets the default log location in the file-system, this is important so that file beat later can
        pickup on the juicy honeypot log files.

    This is the whole configuration needed to run the honeypot.

    <span class="underline">📌 Notes</span>

    -   Restart Cowrie after configuration changes.
    -   The configuration can be split across multiple \`.cfg\` files in \`cowrie.cfg.d/\` for modular setup.


### 🚀 Run Cowrie Container as 'cowrie' User {#run-cowrie-container-as-cowrie-user}

Once I had created the dedicated system user (see earlier section), I
was able to run the Cowrie container with Podman using `sudo -u` and a secure UID mapping.


#### Step-by-Step Command explanation {#step-by-step-command-explanation}

```bash
sudo -u cowrie podman run -d --name cowrie \
  --uidmap 0:$(id -u cowrie):1 \
  -v /opt/cowrie/etc:/cowrie/cowrie-git/etc:Z \
  -v /opt/cowrie/var:/cowrie/cowrie-git/var:Z \
  -p 2222:2222 \
  cowrie/cowrie
```


#### Explanation {#explanation}

-   `sudo -u cowrie`: Runs the Podman command as the unprivileged `cowrie` user.
-   `--uidmap 0:$(id -u cowrie):1`: Maps root (UID 0) ****inside**** the container to the `cowrie` UID on the host.
-   `-v /opt/cowrie/etc` and `/opt/cowrie/var`: Mounts configuration and data volumes from the host with \`:Z\` to apply correct SELinux labels (optional on systems without SELinux).
-   `-p 2222:2222`: Forwards port 2222 from host to container (Cowrie's SSH honeypot port).
-   `cowrie/cowrie`: The container image name (use latest or specific tag as needed).


#### Benefits: {#benefits}

-   ****Container runs as non-root on the host:****
    Even if a process inside the container thinks it's root, it's actually limited to the unprivileged `cowrie` user outside the container.

-   ****Enhanced security:****
    If the container is compromised, the attacker only gets access as the `cowrie` user — not real root.

-   ****Avoids root-equivalent risks:****
    Prevents privilege escalation or access to sensitive host files and devices.


### 🎯 Operating the Honeypot {#operating-the-honeypot}

-   ****View logs****
    I think to know how to debug the container is important so we start first
    with the logs:
    ```sh
    sudo -u cowrie podman logs -f cowrie
    ...snip...
    [HoneyPotSSHTransport,14,10.0.2.100] Closing TTY Log: var/lib/cowrie/tty/e52d9c508c502347344d8c07ad91cbd6068afc75ff6292f062a09ca381c89e71 after 0.8 seconds
    [cowrie.ssh.connection.CowrieSSHConnection#info] sending close 0
    [cowrie.ssh.session.HoneyPotSSHSession#info] remote close
    [HoneyPotSSHTransport,14,10.0.2.100] Got remote error, code 11 reason: b'disconnected by user'
    [HoneyPotSSHTransport,14,10.0.2.100] avatar root logging out
    [cowrie.ssh.transport.HoneyPotSSHTransport#info] connection lost
    [HoneyPotSSHTransport,14,10.0.2.100] Connection lost after 2.8 seconds
    ...snip...
    ```

-   ****Restart container****
    If things go left just restart that thing:
    ```bash
    sudo -u cowrie podman restart cowrie
    ```
    In the logs you can see that cowrie is running and accepting SSH connections:
    ```sh
    ...snip...
    [-] CowrieSSHFactory starting on 2222
    [cowrie.ssh.factory.CowrieSSHFactory#info] Starting factory <cowrie.ssh.factory.CowrieSSHFactory object at 0x7fb66f26d0>
    [-] Ready to accept SSH connections
    ...snip...
    ```
    When the log says "Ready to accept SSH connections" I tested if I could login:
    ```sh
    ssh 192.168.210.3 -p 2222 -l root
    root@192.168.210.3 password:

    The programs included with the Debian GNU/Linux system are free software;
    the exact distribution terms for each program are described in the
    individual files in /usr/share/doc/*/copyright.

    Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
    permitted by applicable law.
    root@svr04:~# uname -a
    Linux svr04 3.2.0-4-amd64 #1 SMP Debian 3.2.68-1+deb7u1 x86_64 GNU/Linux
    root@svr04:~#
    ```

-   ****Stop container****
    Nothing special here:
    ```bash
    sudo -u cowrie podman stop cowrie
    ```

---


### 🔄 Automatically Restart Cowrie Podman Container with systemd {#automatically-restart-cowrie-podman-container-with-systemd}

To keep your Cowrie container running reliably and restart it if it stops, use a systemd service with restart policies.


#### Step 1: Generate a systemd Service File {#step-1-generate-a-systemd-service-file}

Create \`/etc/systemd/system/cowrie-container.service\` with the following content:

```sh
[Unit]
Description=Cowrie Honeypot Podman Container
After=network.target

[Service]
User=cowrie
Group=cowrie
Restart=on-failure
RestartSec=10s

ExecStart=/usr/bin/podman run -d --name cowrie \
  --uidmap 0:$(id -u cowrie):1 \
  -v /opt/cowrie/etc:/cowrie/cowrie-git/etc:Z \
  -v /opt/cowrie/var:/cowrie/cowrie-git/var:Z \
  -p 2222:2222 \
  cowrie/cowrie

ExecStop=/usr/bin/podman stop -t 10 cowrie
ExecStopPost=/usr/bin/podman rm cowrie

ExecReload=/usr/bin/podman restart cowrie
TimeoutStartSec=120

[Install]
WantedBy=multi-user.target
```

-   The \`--restart-policy=on-failure\` makes systemd restart the container if it exits with a failure.


#### Step 2: Enable the Service {#step-2-enable-the-service}

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now container-cowrie.service
```


#### Step 3: (Optional) Add a Health Check Script {#step-3--optional--add-a-health-check-script}

To detect if Cowrie stops accepting connections even if the container is still running, create a health check script running as `cowrie`:

Create \`/usr/local/bin/check_cowrie.sh\`:

```bash
#!/bin/bash
if ! nc -z localhost 2222; then
  echo "Cowrie not responding, restarting container"
  /usr/bin/podman restart cowrie
  /usr/local/bin/pushover.sh "Cowrie was restarted!"
fi
```

This restarts the service and sends out a notification via pushover.

Make it executable:

```bash
sudo chmod +x /usr/local/bin/check_cowrie.sh
sudo chown cowrie:cowrie /usr/local/bin/check_cowrie.sh
```

Create systemd service \`/etc/systemd/system/check_cowrie.service\`:

```ini
[Unit]
Description=Check Cowrie honeypot health

[Service]
User=cowrie
Group=cowrie
Type=oneshot
ExecStart=/usr/local/bin/check_cowrie.sh
```

Create systemd timer \`/etc/systemd/system/check_cowrie.timer\`:

```ini
[Unit]
Description=Run Cowrie health check every minute

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
Unit=check_cowrie.service

[Install]
WantedBy=timers.target
```

Enable and start the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now check_cowrie.timer
```

---


#### Summary {#summary}

-   Used Podman’s systemd integration for automatic restart on container failure.
-   Added a health check timer to detect if Cowrie stops accepting connections and restart proactively.


### 🔒 Security Notes {#security-notes}

-   The \`cowrie\` user has no login shell (\`/usr/sbin/no login\`)
-   Running Cowrie isolated via Podman increases containment
-   All files are owned by \`cowrie\`, no root access required for normal operation

    ---


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

---


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
