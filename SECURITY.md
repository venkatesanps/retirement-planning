# Security policy

## Reporting a vulnerability

If you discover a security issue, please email **security@_TBD_** (placeholder until launch) with a detailed report. Do not file public GitHub issues for security problems.

We aim to respond within 72 hours.

## Threat model

This project is a **fully client-side web application**. There is no server-side state we control beyond the static asset host (GitHub Pages). The privacy claim — "your data never leaves your device" — is the central security property.

### In scope

| Asset | Threat | Mitigation |
|---|---|---|
| User PDFs | Exfiltration to a server | Files are read by `pdf.js` in a Web Worker. No `fetch`/`XHR` is made with PDF contents. Strict CSP `connect-src 'self'` enforces this at the browser level. |
| Parsed financial data | Read by other origins | IndexedDB is sandboxed per origin. |
| Parsed financial data | Read locally by an attacker with device access | Optional passphrase encrypts every record (AES-GCM 256 with PBKDF2-derived key, 600k iterations). Key held only in memory. |
| App integrity | Malicious dependency / supply chain | Pinned `pnpm-lock.yaml`, Dependabot, manual review of every new dep. CI publishes a reproducible build hash. |
| Inline script injection / XSS | Third-party script execution | Strict CSP: `script-src 'self'`, `default-src 'self'`. No `dangerouslySetInnerHTML` on user data. |

### Out of scope

- Compromise of the user's device (malware, evil maid, compromised browser, malicious extensions).
- Compromise of GitHub Pages infrastructure itself.
- Side-channel attacks against the browser.

## Build verification

Each release publishes:
- The SHA-256 of the deployed `out/` directory contents
- The exact dependency tree (`pnpm-lock.yaml`)
- The CI workflow run that produced it

A user who clones the repo at a tagged release should be able to reproduce the same build hash.

## Cryptography choices

- **Encryption:** AES-GCM 256 (Web Crypto `subtle.encrypt`)
- **Key derivation:** PBKDF2-SHA256, 600,000 iterations, 16-byte random salt per user
- **Random:** `crypto.getRandomValues`
- **Storage:** IV stored alongside ciphertext per record; salt stored once per user

No homegrown crypto. Every primitive is from `window.crypto.subtle`.

## Dependency policy

- New dependencies require an explanation in the PR.
- Dev dependencies are kept minimal — testing, linting, types only.
- Runtime dependencies are audited quarterly and on every major release.

## Disclaimer

This software is an educational tool. It is **not** financial, tax, or legal advice. No fiduciary relationship is created by use. U.S. tax assumptions apply. Consult a qualified professional before making financial decisions.
