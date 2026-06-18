---
title: "HTB: Silentium"
author: ["Dirk"]
date: 2026-06-14T09:26:00+02:00
lastmod: 2026-06-18T09:28:29+02:00
tags: ["git-hooks", "authentication-bypass", "detection-engineering"]
categories: ["htb", "vulnerability"]
draft: false
weight: 1001
---

## Note {#note}

I put this writeup in my security research section, thats just for
convince. Later on I will create a section for all my writeups to come.


## Overview {#overview}

| Attribute  | Value                         |
|------------|-------------------------------|
| OS         | Linux                         |
| Difficulty | Easy                          |
| Category   | Web + Privilege Escalation    |
| Key CVEs   | CVE-2026-40933, CVE-2025-8110 |
| Techniques | Auth Bypass, MCP RCE, Symlink |
|            | Abuse, Git Hooks              |

Silentium is a two-stage exploitation box combining web
application authentication weaknesses with a privilege
escalation chain through Git hook manipulation. The path to
user involves bypassing Flowise authentication and exploiting
an MCP (Model Context Protocol) server vulnerability. Root
escalation leverages Gogs repository management running with
elevated privileges.


## Reconnaissance {#reconnaissance}


### Port &amp; Service Discovery {#port-and-service-discovery}

A straightforward nmap scan reveals two services:

-   SSH (22/tcp) — OpenSSH 9.6p1 on Ubuntu
-   HTTP (80/tcp) — nginx serving the Silentium corporate site

The HTTP response redirects to `silentium.htb`, requiring
local DNS resolution or `/etc/hosts` entry.

Key observation: The main site exposes team member names
(Marcus Thorne, Ben, Elena Rossi), which become useful for
credential testing later.


### Virtual Host Enumeration {#virtual-host-enumeration}

Standard vhost scanning (gobuster or ffuf) against
`silentium.htb` uncovers:

-   `staging.silentium.htb` (200 OK, ~3KB response)

This staging environment hosts a different application
(Flowise) and becomes the primary attack surface.


## Foothold: Flowise Authentication Bypass {#foothold-flowise-authentication-bypass}


### Phase 1: Identify the Vulnerability {#phase-1-identify-the-vulnerability}

The staging vhost presents a login page for Flowise, a
visual LLM application builder. Rather than brute-forcing
credentials, examine the password reset functionality.

Flowise's password reset endpoint is a known attack vector.
The implementation leaks sensitive information in the
response, including:

-   Temporary password reset tokens
-   User metadata (ID, email, internal names, credential
    hashes)

Send a POST to `/api/v1/account/forgot-password` with a
target email (e.g., `ben@silentium.htb`, whose name
appeared on the public site). The response includes a
`tempToken` field.


### Phase 2: Exploit the Leaked Token {#phase-2-exploit-the-leaked-token}

The `tempToken` can be used to reset the password without
validating proper ownership. Use this token to establish
authenticated API access to Flowise.

This grants access to the Flowise canvas (chatflow builder)
and triggers the secondary vulnerability.


### Phase 3: MCP RCE Exploitation {#phase-3-mcp-rce-exploitation}

Flowise supports Custom MCP (Model Context Protocol) server
nodes. The vulnerability lies in how it handles the MCP
server configuration.

The key insight: MCP configurations accept a `command` and
`args` field. When the Flowise backend attempts to
instantiate the MCP server, it executes the command via
subprocess without sufficient input validation.

Configure a Custom MCP node with a malicious payload:

-   `command`: `npx`
-   `args`: Point to a URL that serves a package.json
    designed to execute arbitrary code

Trigger the MCP instantiation (either via the UI or by
re-submitting the API request through Burp). A reverse
shell callback is delivered to your listener.

Result: User-level access inside a Docker container running
the Flowise application.


### Accessing Host Credentials {#accessing-host-credentials}

Inside the container, environment variables expose:

-   `FLOWISE_USERNAME` and `FLOWISE_PASSWORD`
-   Additional credentials (SMTP, JWT secrets)

More importantly, check `/root/.flowise` and related paths
for database or configuration files that might contain
host-level credentials.

One specific credential pair from the environment can be
used for SSH authentication to the host system.

Result: SSH access as `ben` user. User flag obtained.


## Privilege Escalation: Gogs Git Hook Manipulation {#privilege-escalation-gogs-git-hook-manipulation}


### Discovery {#discovery}

Post-enumeration reveals a Gogs installation in `/opt`,
running as root. Gogs is a lightweight Git service, and
the root privilege here is significant.

The attack surface: Git repositories have hooks (pre-receive,
post-receive, update) that execute arbitrary scripts during
push events. If we can manipulate a hook, and the service
runs as root, we achieve RCE as root.


### Vulnerability Overview {#vulnerability-overview}

CVE-2025-8110 (referenced as CVE-2024-39930 in some sources)
exploits a symlink race condition combined with Git hook
handling in Gogs.

The attack chain:

1.  Create an empty Git repository via the Gogs API
2.  Push a symlink (named `evil_link`) pointing to the
    location of a Git hook (e.g., `.git/hooks/pre-receive`)
3.  Use the Gogs API to overwrite the symlink target with
    malicious script content
4.  Trigger the hook by pushing new commits to the
    repository


### Exploitation Steps {#exploitation-steps}

1.  ****Authentication****: Obtain Gogs API credentials (attacker
    account, or brute-force if available)

2.  ****Create Empty Repository****: Use the Gogs API endpoint
    `/api/v1/user/repos` with `auto_init: false` to create
    a repository without automatic initialization. This
    leaves the hooks directory manipulable.

3.  ****Push Symlink****:
    -   Initialize a local Git repository
    -   Add the target Gogs repo as remote
    -   Create a symlink named `evil_link` pointing to
        `.git/hooks/pre-receive`
    -   Commit and push to the empty repo
    -   Retrieve the SHA of the symlink object

4.  ****Overwrite via API****:
    -   Use `/api/v1/repos/{user}/{repo}/contents/evil_link`
        endpoint (PUT)
    -   Provide base64-encoded malicious script as the
        `content`
    -   The API treats the symlink as a file and overwrites
        its content

5.  ****Trigger Execution****:
    -   Make a final push (any content change)
    -   The `pre-receive` hook (now containing your malicious
        code) is executed as root
    -   Payload options: reverse shell or SUID binary
        creation

Result: RCE as root. Root flag obtained.


### Key Technical Details {#key-technical-details}

-   The vulnerability relies on Gogs not properly validating
    symlink targets in its API file editor
-   The hooks directory permissions allow the unprivileged
    Git user to indirectly execute code as root
-   The force push (`-f`) is necessary because the local repo
    history does not match the remote state


## Detection &amp; Lessons Learned {#detection-and-lessons-learned}


### What Went Wrong (Defense Perspective) {#what-went-wrong--defense-perspective}

1.  ****Flowise Auth Bypass****: Password reset endpoints should:
    -   Verify email ownership via token sent to registered
        address
    -   Not leak tokens or user metadata in response bodies
    -   Implement rate limiting and token expiration

2.  ****MCP RCE****: Custom tool execution should:
    -   Sandbox subprocess calls (chroot, seccomp,
        containers)
    -   Implement an allow-list for commands
    -   Validate URLs/sources before execution

3.  ****Gogs Hook Manipulation****:
    -   Disable symlink writes via API in file editor
    -   Validate hook target paths; prevent traversal
        outside `/hooks/`
    -   Run Git hooks with minimal privilege (not as root)


### Mitigations for Similar Environments {#mitigations-for-similar-environments}

-   Implement centralized authentication (OAuth2, SAML) to
    bypass application-level auth flaws
-   Use container security scanning (Trivy, Grype) to
    identify vulnerable dependencies
-   Enforce privilege separation: never run SCM services
    as root
-   Apply code review to API endpoints handling sensitive
    operations


## Tools &amp; References {#tools-and-references}


### CVEs Referenced {#cves-referenced}

-   [CVE-2026-40933](https://www.obsidiansecurity.com/blog/when-is-stdio-mcp-actually-a-vulnerability): Flowise Custom MCP Server stdio RCE
-   [CVE-2025-8110](https://github.com/BridgerAlderson/CVE-2025-81110-PoC): Gogs Symlink + Hook Manipulation


### Tools Used {#tools-used}

-   ffuf / gobuster (vhost enumeration)
-   Burp Suite (request inspection &amp; modification)
-   Git (local repo initialization &amp; pushing)
-   netcat (reverse shell listener)


### Detection Resources {#detection-resources}

-   MITRE ATT&amp;CK: [
    Exploit Public-Facing Application](https://attack.mitre.org/techniques/T1190/)
-   MITRE ATT&amp;CK: [
    Boot or Logon Autostart Execution: Hooks](https://attack.mitre.org/techniques/T1547/013/)
    (pre-receive hooks)


## Timeline {#timeline}

| Stage    | Method                        | Result          |
|----------|-------------------------------|-----------------|
| Recon    | nmap, vhost scanning          | staging vhost   |
| Auth     | forgot-password token leak    | API access      |
| Foothold | MCP RCE via Custom node       | Container shell |
| Host     | Env var credentials + SSH     | ben user access |
| PrivEsc  | Gogs symlink + hook overwrite | root access     |


## Appendix: Manual Exploitation (No PoC Script) {#appendix-manual-exploitation--no-poc-script}

If running the Gogs exploit manually:

```bash
# 1. Create local test repo
mkdir /tmp/gogs_test && cd /tmp/gogs_test
git init
git remote add origin \
  http://attacker:password@gogs.target/attacker/test_repo.git

# 2. Create symlink to target hook
ln -s /root/gogs-repositories/attacker/test_repo.git/hooks/pre-receive \
  evil_link

# 3. Commit & push
git add .
git commit -m "init"
git push -u origin master

# 4. Retrieve symlink SHA
# Use Gogs API: GET /api/v1/repos/attacker/test_repo/contents?ref=master

# 5. Overwrite with malicious payload
# Use Gogs API: PUT /api/v1/repos/attacker/test_repo/contents/evil_link
# Payload: {"message":"update", "content":"BASE64_ENCODED_SCRIPT",
#           "sha":"...", "branch":"master"}

# 6. Trigger by pushing a new file
touch dummy && git add dummy && git commit -m "trigger"
git push -f origin master
```

---

**Note: This writeup avoids direct flag values. It assumes
the reader understands basic Linux/Git concepts and has a
testable environment.**
