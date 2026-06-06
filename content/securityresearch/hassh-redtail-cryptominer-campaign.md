+++
title = "Tracking a credential scanner"
author = ["Dirk"]
date = 2026-06-06T10:00:00+02:00
lastmod = 2026-06-06T13:27:31+02:00
tags = ["forensicwheels", "honeypot", "threathunting", "hassh", "misp", "malware", "cryptominer"]
categories = ["securityresearch"]
draft = false
weight = 1001
+++

## The Alert {#the-alert}

At 10:23 on June 5th, ElastAlert fired a Pushover notification:

```nil
MISP Hit: Known Threat Actor
IP: 130.12.180.51 | Canada
Feed: Maltrail IOC for 2026-06-01 | Level: Medium
```

What followed was a two-day investigation that started with a medium-severity
feed match on a Canadian IP and ended with confirmed cryptominer deployment,
SSH key persistence, and a second infrastructure node that the feed had
never seen.

This is a writeup of that hunt, in two parts.


## Part I: The Credential Validator (130.12.180.51) {#part-i-the-credential-validator--130-dot-12-dot-180-dot-51}


### What is HASSH? {#what-is-hassh}

HASSH is a network fingerprinting method for SSH clients, analogous to
JA3 for TLS. During the SSH key exchange, the client advertises its
supported algorithms, KEX algorithms, encryption ciphers, MACs,
compression methods, in a specific order that reflects the library and
version used to build the client. HASSH takes that ordered list and
produces an MD5 hash.

The result is a stable, tool-specific identifier that persists across
IP changes, VPN rotations, and infrastructure churn. The same tool
running from a different exit node produces the same HASSH. Cowrie
captures the full `client.kex` event and our Logstash pipeline indexes
it under `ssh.client`.


### The Evidence {#the-evidence}

Pulling the session history for 130.12.180.51 reveals a clean,
repetitive pattern across 13 sessions spanning 98 days:

| Timestamp (UTC)     | Outcome       | Username | Password |
|---------------------|---------------|----------|----------|
| 2026-02-27 15:10:08 | login.success | root     | P        |
| 2026-02-28 08:45:11 | login.success | root     | P        |
| 2026-02-28 11:06:10 | login.success | root     | P        |
| 2026-02-28 23:23:10 | login.success | root     | P        |
| 2026-03-01 04:29:06 | login.success | root     | P        |
| 2026-03-01 07:36:54 | login.success | root     | P        |
| 2026-03-01 17:08:27 | login.success | root     | P        |
| 2026-03-01 17:56:49 | login.success | root     | P        |
| 2026-03-02 04:24:55 | login.success | root     | P        |
| 2026-03-02 22:42:24 | login.success | root     | P        |
| 2026-03-03 11:37:35 | login.success | root     | P        |
| 2026-06-04 14:56:27 | login.success | admin    | admin    |
| 2026-06-05 05:39:26 | login.success | admin    | admin    |

No commands. No file transfers. No post-login activity. The session
opens, authenticates, and terminates within half a second. Every time.

This is a credential validator, not an intrusion attempt, but a
verification pass. The tool logs working credentials and moves on.
The wordlist rotation after three months (`root/P` → `admin/admin`)
confirms active maintenance of the scanning campaign.


### HASSH as a Pivot {#hassh-as-a-pivot}

The HASSH fingerprint for this IP is `5f904648ee8964bef0e8834012e26003`.

| Field       | Value                                                                     |
|-------------|---------------------------------------------------------------------------|
| HASSH       | `5f904648ee8964bef0e8834012e26003`                                        |
| KEX         | curve25519-sha256, ecdh-sha2-nistp256, diffie-hellman-group14-sha256/sha1 |
| Encryption  | aes128-gcm, aes256-gcm, chacha20-poly1305, aes128/192/256-ctr             |
| MAC         | hmac-sha2-256-etm, hmac-sha2-256, hmac-sha1                               |
| Compression | none                                                                      |

This is the default profile of a modern OpenSSH client, not a
purpose-built scanner. Standard OpenSSH, scripted automation.

Querying the HASSH across all indexed sessions:

| IP              | Sessions | In MISP feed |
|-----------------|----------|--------------|
| 130.12.180.51   | 13       | Yes          |
| 213.209.159.158 | 2        | No           |

213.209.159.158 was not in any feed. Two sessions, both recent. Same
HASSH, same tool, different address. The fingerprint gave us attribution
the IP feed missed entirely.

Both IPs were added to MISP, cross-referenced to Event 2058.


## Part II: The Attack (213.209.159.158) {#part-ii-the-attack--213-dot-209-dot-159-dot-158}

The second IP didn't stay in credential validation mode for long.


### The Session {#the-session}

On June 5th at 19:10 UTC, 213.209.159.158 returned — this time with
a different intent. The session lasted 43 seconds and contained the
complete redtail deployment chain.

**Phase 1: Credential access**

The credential `root/ts3server` worked. The honeypot logged two
`login.success` events in rapid succession, the first a validation
pass, the second the actual intrusion session.

**Phase 2: Command execution**

```nil
chmod +x setup.sh; sh setup.sh; rm -rf setup.sh;
mkdir -p ~/.ssh;
chattr -ia ~/.ssh/authorized_keys;
echo "ssh-rsa AAAAB3NzaC1yc2E[...]" > ~/.ssh/authorized_keys;
chattr +ai ~/.ssh/authorized_keys;
uname -a
```

Three things happening simultaneously: deploying the malware, establishing
SSH key persistence, and checking the system architecture. The `chattr +ai`
on `authorized_keys` is particularly deliberate — it sets the immutable
flag, preventing the key from being removed even by root without first
running `chattr -i`.

**Phase 3: File upload**

Five files uploaded via SFTP in under a second:

| Filename         | SHA256 (truncated) | VT Detections | Classification              |
|------------------|--------------------|---------------|-----------------------------|
| `clean.sh`       | `d46555af...`      | 26/75         | trojan.multiverze/vsnw01j24 |
| `redtail.arm7`   | `3625d068...`      | 36/75         | CoinMiner / XMRMiner        |
| `redtail.arm8`   | `dbb7ebb9...`      | —             | CoinMiner variant           |
| `redtail.i686`   | `048e374b...`      | —             | CoinMiner variant           |
| `redtail.x86_64` | `59c29436...`      | —             | CoinMiner variant           |
| `setup.sh`       | `783adb7a...`      | 0/75          | Dropper (shell script)      |


### Malware Analysis {#malware-analysis}

**setup.sh — the dropper**

The dropper detects system architecture, finds a writable non-noexec
directory, copies the appropriate `redtail.$ARCH` binary to a hidden
file with a randomly generated name, executes it with the `ssh` argument,
then removes all `redtail.*` files to cover tracks.

**clean.sh — the competition remover**

VirusTotal's AI analysis is direct: the script disables and stops
`c3pool_miner`, removes crontab entries containing download commands
or reverse shells, and wipes `/tmp`, `/var/tmp`, and `/dev/shm`.
This is standard practice in cryptominer campaigns, eliminate
competing miners before deploying your own. The VT name history
shows this script has been uploaded to honeypots across the world
daily since at least February 2026.

**redtail.arm7 — the miner**

ELF32 ARM binary, UPX-packed, 1.3MB. 36/75 detections on VT.
Kaspersky calls it `not-a-virus:HEUR:RiskTool.Linux.BitCoinMiner.n`,
Rising identifies it as `HackTool.XMRMiner`. The VT name history
shows it being uploaded from cowrie honeypots globally since
January 2026 under consistent timestamps: `20260605-203421_sftp__root_redtail_arm7`.
This naming pattern is generated by cowrie itself, meaning this
campaign has been hitting honeypots continuously for months.


### Infrastructure Assessment {#infrastructure-assessment}

| IP              | ASN          | Country | Role                 | MISP       |
|-----------------|--------------|---------|----------------------|------------|
| 130.12.180.51   | AS200019     | Canada  | Credential Validator | Feed match |
| 213.209.159.158 | Alexhost Srl | Germany | Active Deployment    | Feed miss  |

Both nodes share HASSH `5f904648ee8964bef0e8834012e26003`. The
operational pattern suggests a two-phase campaign: Phase 1 uses
the Canadian node to validate credentials across a large target
pool. Phase 2 uses the German node (Alexhost, known bulletproof
hoster) for actual deployment against validated targets.

The credential `root/ts3server` is specific, not a generic default.
It suggests the target pool was pre-filtered for systems running
TeamSpeak 3 server installations, which commonly run as root with
default credentials.


## Conclusions {#conclusions}

What started as a Medium-severity MISP alert on a single IP became
a full picture of an active cryptominer campaign:

-   A credential validation infrastructure operating since at least February 2026
-   A deployment node on bulletproof hosting that the feed had missed entirely
-   A complete malware package (dropper, miner binaries for 4 architectures, competition cleaner)
-   SSH key persistence designed to survive credential rotation
-   Evidence of global honeypot hits going back months in VT submission history

The HASSH pivot was the key move. Without it, 213.209.159.158 stays
invisible, no feed match, no alert, no investigation. The tool
fingerprint connected two infrastructure nodes that IP intelligence
had treated as unrelated.

The redtail campaign is not sophisticated. The tooling is commodity,
the credentials are weak, the infrastructure is rented. But it is
persistent, actively maintained, and targeting a specific software
stack. For any operator running internet-facing Linux systems with
default credentials, this campaign is scanning for you right now.


## Indicators of Compromise {#indicators-of-compromise}

| Type    | Value                                                            | Context                      |
|---------|------------------------------------------------------------------|------------------------------|
| ip-src  | 213.209.159.158                                                  | Redtail Deployment Node      |
| hassh   | 5f904648ee8964bef0e8834012e26003                                 | Shared SSH Fingerprint       |
| sha256  | d46555af1173d22f07c37ef9c1e0e74fd68db022f2b6fb3ab5388d2c5bc6a98e | clean.sh (trojan.multiverze) |
| sha256  | 3625d068896953595e75df328676a08bc071977ac1ff95d44b745bbcb7018c6f | redtail.arm7 (XMRMiner)      |
| sha256  | 783adb7ad6b16fe9818f3e6d48b937c3ca1994ef24e50865282eeedeab7e0d59 | setup.sh (dropper)           |
| ssh-key | AAAAB3NzaC1yc2EAAAADAQABAAABAQCqHrvnL6l7rT[...] rsa-key-20230629 | Persistence Key              |
