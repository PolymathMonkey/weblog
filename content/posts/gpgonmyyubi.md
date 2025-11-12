---
title: "Putting my gpg key on my yubikey"
author: ["Dirk"]
date: 2025-10-29T12:17:00+01:00
lastmod: 2025-11-12T15:19:01+01:00
tags: ["forensicwheels"]
draft: false
weight: 1007
---

## Why GPG? {#why-gpg}

In an age where digital identities are easily faked and impersonation is just a few clicks away, I decided to take a step forward in securing mine. GPG (GNU Privacy Guard) provides a robust way to authenticate, encrypt, and sign digital content. In this post, I’ll walk you through how I:

-   Created a GPG key pair
-   Set up subkeys and stored them on my YubiKey
-   Published my public key on my website
-   Signed and encrypted personal documents for secure public sharing
-   Configured email signing using GPG


## Step 1: Installing GPG {#step-1-installing-gpg}

To start, I made sure GPG was installed. Here's how I did it on each of my systems:

****On Ubuntu/Debian:****

```shell
sudo apt update && sudo apt install gnupg
```

****On Fedora 40:****

```shell
sudo dnf install gnupg2
```

****On OpenBSD 7.6:****

```shell
doas pkg_add gnupg
```

Check your installation:

```shell
gpg --version
```


## Step 2: Creating My GPG Key Pair {#step-2-creating-my-gpg-key-pair}

I created a new key using:

```shell
gpg --full-generate-key
```

Here’s what I chose:

-   Key type: `ed25519` (modern and compact) or `RSA and RSA` (widely compatible)
-   Key length: 4096 bits (if RSA)
-   Expiration: 2 years (I can always renew)
-   My real name or handle
-   My preferred contact email
-   A strong passphrase, saved in a password manager

After generating the key, I listed it and saved the fingerprint:

```shell
gpg --list-keys --fingerprint
gpg: "Trust-DB" wird überprüft
gpg: marginals needed: 3  completes needed: 1  trust model: pgp
gpg: Tiefe: 0  gültig:   1  signiert:   0  Vertrauen: 0-, 0q, 0n, 0m, 0f, 1u
gpg: nächste "Trust-DB"-Pflichtüberprüfung am 2026-08-04
[keyboxd]
---------
pub   ed25519 2025-08-04 [SC] [verfällt: 2026-08-04]
    A371 9309 4ED4 B0E6 AD2E  5022 D7D6 4842 8DBD 39FD
uid        [ ultimativ ] Dirk.L (Dirk.L's official key) <polymathmonkey@keksmafia.org>
```


## Step 3: Creating Subkeys and Moving Them to My YubiKey {#step-3-creating-subkeys-and-moving-them-to-my-yubikey}

I created subkeys for:

-   Signing
-   Encryption
-   Authentication

Then, I moved the subkeys to my YubiKey using GPG’s interactive editor:

```shell
gpg --edit-key Dirk.L
gpg> addkey <- once for signing, engryption, auth
gpg> keytocard
gpg> save
```

⚠️ **Be cautious:** Once moved to the YubiKey, the subkey **no longer exists** on disk.

More guidance: [YubiKey + GPG official instructions](https://developers.yubico.com/PGP/)


## Step 4: Publishing My Public Key {#step-4-publishing-my-public-key}

I exported my key in ASCII format so others could import it easily:

```shell
gpg --export --armor you@example.com > publickey.asc
```

I uploaded `publickey.asc` to my website and linked it like this:

```html
<a href="/publickey.asc">🔑 Download my GPG public key</a>
```

Additionally, I displayed my key’s fingerprint on the page so that people can verify its authenticity manually.


## Step 5: Email Signing and Encryption {#step-5-email-signing-and-encryption}

I configured email signing using my GPG key.

****For Thunderbird (Linux, OpenBSD, Windows):****

-   OpenPGP support is built-in.
-   I enabled signing for all outgoing mail.
-   The key lives on the YubiKey, so no key is stored on disk.

****For Mutt / CLI mailers:****

-   I used \`gpg-agent\` for passphrase and key handling.
-   Configured `.muttrc` to sign and/or encrypt automatically.

Signing ensures message authenticity. If recipients have my key, they can encrypt replies.


## Step 6: Signing and Encrypting Documents for the Public {#step-6-signing-and-encrypting-documents-for-the-public}

To safely share personal certificates and private files, I signed and optionally encrypted them:

```shell
# Sign only (adds signature block)
gpg --sign --armor diploma.pdf

# Sign and encrypt with a password (no public key needed)
gpg --symmetric --armor --cipher-algo AES256 diploma.pdf
```

This way, the document is verifiably mine and only decryptable with the shared password.

The encrypted `.asc` files can be uploaded to the website, with instructions for downloading and decrypting.


## Step 7: Offline Backup of My Master Key {#step-7-offline-backup-of-my-master-key}

Before moving entirely to the YubiKey, I backed up the master key offline:

```shell
gpg --export-secret-keys --armor > masterkey-backup.asc
```

I stored it on an encrypted USB drive using:

-   ****LUKS**** (on Linux)
-   ****VeraCrypt**** (cross-platform)
-   ****OpenBSD softraid(4)**** encryption

I then removed the master key from my online machine after subkeys were in place.


## Conclusion {#conclusion}

Rolling out GPG was empowering. With my identity cryptographically verifiable, email signing in place, and secure document sharing live on my site, I now have a strong, decentralized identity system.

🔑 Want to reach out securely?
→ Grab my public key and shoot me a signed or encrypted message.


## Useful Links {#useful-links}

-   [GnuPG Official Website](https://www.gnupg.org/)
-   [FSF's Email Self-Defense Guide](https://emailselfdefense.fsf.org/en/)
-   [YubiKey GPG Configuration](https://developers.yubico.com/PGP/)
-   [OpenPGP Public Key Directory](https://keys.openpgp.org/)
