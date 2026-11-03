# Hardened Wear OS pilot — NOT a production security certification

This is Brandon's test fork of [borealBytes/hermes-wearos](https://github.com/borealBytes/hermes-wearos), based on upstream `44a7c2f918d2bccfc86fbba54a90d552813ab8da`. Not an official Nous Research app. Upstream README screenshots/features are historical; security restrictions in this fork intentionally remove convenience features.

## Scope and gates

**No live installation is part of creating this fork.** Do not run the upstream automatic setup recipe. No gateway restart, watch install, tailnet enrollment, credential copying or production profile change is authorized by the repository.

Only consider a pilot after BOTH the current commit's `Secure pilot verification` workflow passes and the security review has no known blocking findings. Passing host tests/build does not verify actual Galaxy Watch7 behavior, voice accuracy, battery life, Android Keystore behavior or existing Hermes endpoint compatibility. This is a bounded hardening pass, not a full dependency/security audit.

## Pilot architecture

Watch → embedded private tailnet → dedicated restricted Hermes test agent.

Start with text chat only. Keep the optional watchkit helper absent, health/location permissions denied, and main Walter/team profiles inaccessible. The agent must enforce a minimal read-only tool allowlist and manual approvals server-side. Do not rely on the watch's approval UI as an authorization boundary. Do not provision the watch with the main Walter API key or a shared cross-profile key.

A separate agent PROFILE alone is NOT an OS sandbox: it can still access other files if it runs with the same account/tools. For meaningful containment, use a separate OS account/container with no production Hermes home, MCP credentials, private files or Docker socket mounted. Expose only the test agent's API endpoint. Existing Discord/Telegram/desktop services must stay untouched. Inspect the installed Hermes version's current API configuration before provisioning; do not assume the upstream sample ports/routes are valid on this host.

## Build evidence

The fork's GitHub Actions workflow uses pinned actions and dependency versions. It rebuilds the native tailnet AAR from the Go sources and module checksums, runs regression/JVM tests, and builds a non-debuggable release APK. It signs the pilot APK with a **disposable CI-generated test key**, uploads the public certificate fingerprint, source commit/tree, APK badging and SHA-256 checksum. The private signing key is not uploaded.

**Disposable signing warning:** another workflow run may use a different certificate. Android will refuse an in-place update signed by that different key; uninstall/reinstall would erase the app's saved data. This is intentional for isolated testing, not a sustainable release/update channel. A stable owner-held signing key needs a separate protected signing arrangement before regular use. No production credentials belong in CI.

Download artifacts only from a successful workflow for the reviewed commit. Verify `SHA256SUMS`, `SOURCE_REVISION.txt`, certificate and non-debuggable status. A matching checksum proves integrity of that artifact, not absence of malware or reproducibility across machines. Never install upstream/debug artifacts just because this fork's source guards pass.

## Manual setup after explicit approval

1. Back up the existing backend settings; record running services and rollback state. Provision the isolated test backend described above, not production. Give it a new high-entropy bearer key that cannot authenticate to other profiles/services.
2. Use narrowly scoped tailnet policy: the watch node can reach only the pilot endpoint/port, not the whole tailnet. Prefer a short-lived, single-use enrollment key if supported by the embedded client; do not copy the upstream reusable-key recommendation blindly. Do not post keys in chat or commit them.
3. On Galaxy Watch7, enable Developer options and wireless debugging temporarily. Pair a trusted computer using the watch's displayed address/port and pairing code. Verify the connected device identity before installing anything. Do not disable Doze, battery management or device idle protections.
4. Install the reviewed, signed non-debuggable pilot APK via `adb install <verified-apk>`. This command requires a paired watch and is deliberately not an automatic script here. Do not uninstall an existing app or use data-clearing commands without approval.
5. Configure the gateway URL and pilot-only credential on the watch privately in Settings → Gateways, and enroll its embedded tailnet node. The fork must refuse requests when the tunnel is unavailable. No optional watchkit URL/token or profile-key learning should be necessary for the first text ask.
6. Grant microphone permission only when testing voice. Leave location, body sensors and health data denied. Begin with typed text to separate transport/auth issues from speech recognition. Use local/offline speech only if its model has been provisioned safely; vendor recognition may send audio off-device.
7. Confirm one harmless reply and that unknown/invalid credentials fail. Verify tailnet disconnect fails closed, the watch cannot access production endpoints, and another watch app cannot trigger approvals/configuration broadcasts. Device tests are required for these claims.
8. Turn off wireless debugging and revoke pairing. Test restart/reconnect, sleep, notifications, losing the watch, token revocation and a realistic battery interval. Keep manual approvals, minimal tools and no cross-profile access throughout.

## Revocation and rollback

Revoke the pilot API credential and remove/disable the watch's tailnet node to cut access. Stop only the isolated pilot backend. Uninstalling the test app removes its app-managed settings/transcripts/Keystore alias according to Android behavior; confirm on the actual device. Never rotate the main Walter token merely to remove this pilot. No production data should have entered the pilot.

## Known disabled features

Mermaid rendering is intentionally unavailable in the hardened pilot, including when legacy configuration requests it. The initial pilot also excludes all helper, body snapshot and location features. Do not re-enable them merely to match upstream screenshots.

## Residual risks

The watch is a client to an agent capable of actions; a lost unlocked device or compromised client can exercise whatever the pilot credential permits. Android OS storage protections and Keystore encryption do not protect plaintext while the authorized app is running. Tailnet identity state is managed by tsnet, separately from app settings encryption. Dependencies are pinned but not exhaustively audited. External links/media, vendor STT/TTS engines and optional helper features have separate privacy boundaries. Do not enable optional helper features until their exact scope, transport and resources are reviewed.
