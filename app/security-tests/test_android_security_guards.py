from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[2]
MAIN_MANIFEST = ROOT / "app/src/main/AndroidManifest.xml"
DEBUG_MANIFEST = ROOT / "app/src/debug/AndroidManifest.xml"


class AndroidSecurityGuards(unittest.TestCase):
    def test_approval_receiver_is_not_exported(self):
        manifest = MAIN_MANIFEST.read_text()
        receiver = re.search(r'<receiver\s+android:name="\.notify\.ApprovalNotificationReceiver"([^>]*)>', manifest)
        self.assertIsNotNone(receiver)
        self.assertIn('android:exported="false"', receiver.group(1))

    def test_debug_ask_broadcast_backdoor_is_removed(self):
        manifest = DEBUG_MANIFEST.read_text()
        self.assertNotIn("DevAskReceiver", manifest)
        self.assertNotIn("dev.hermes.wearos.ASK", manifest)

    def test_non_loopback_route_fails_closed_without_socks(self):
        source = (ROOT / "app/src/main/java/dev/hermes/wearos/net/TailnetRoute.kt").read_text()
        self.assertNotRegex(source, r"socksPort\s*<=\s*0[^\n]*\|\|")
        self.assertIn("check(socksPort in 1..65535)", source)
        self.assertIn("return listOf(Proxy.NO_PROXY)", source)  # loopback-only exception

    def test_gateway_transport_rejects_non_tunnel_urls(self):
        source = (ROOT / "app/src/main/java/dev/hermes/wearos/net/TailnetRoute.kt").read_text()
        self.assertIn("requireSafeGatewayUrl", source)
        self.assertIn("https", source)

    def test_snapshot_push_validates_gateway_before_building_authenticated_request(self):
        source = (ROOT / "app/src/main/java/dev/hermes/wearos/net/SnapshotPusher.kt").read_text()
        validation = source.index("TailnetRoute.requireSafeGatewayUrl")
        request = source.index("val req = Request.Builder()")
        self.assertLess(validation, request)

    def test_sensitive_preferences_are_encrypted(self):
        source = (ROOT / "app/src/main/java/dev/hermes/wearos/data/AppSettings.kt").read_text()
        for key in ("KEY_TOKEN", "KEY_WATCHKIT_TOKEN", "KEY_TAILNET_KEY", "KEY_AGENTS_CACHE"):
            self.assertRegex(source, rf"protectedRead\({key}\)")
            if key == "KEY_TOKEN":
                self.assertIn("DeviceSecretBox.encrypt(v.trim())", source)
            else:
                self.assertRegex(source, rf"protectedWrite\({key},")
        self.assertIn("DeviceSecretBox.encrypt(GatewayModel.encode", source)
        self.assertIn("protectedRead(KEY_GATEWAYS)", source)

    def test_transcripts_are_encrypted_and_legacy_plaintext_migrated(self):
        source = (ROOT / "app/src/main/java/dev/hermes/wearos/data/ChatStore.kt").read_text()
        self.assertIn("DeviceSecretBox", source)
        self.assertIn("legacy plaintext", source)
        self.assertNotIn("tmp.writeText(payload)", source)

    def test_health_measurements_are_not_written_to_logs(self):
        source = (ROOT / "app/src/main/java/dev/hermes/wearos/health/BodyTools.kt").read_text()
        app_source = (ROOT / "app/src/main/java/dev/hermes/wearos/WearApp.kt").read_text()
        for marker in ("hr=$v", "steps=$total", "spo2=${it.first}", "sleep value=${it.first}"):
            self.assertNotIn(marker, source)
        self.assertNotIn('"body_status $k -> $v"', app_source)
        self.assertNotIn('"body_status snapshot(if all on) $snap"', app_source)

    def test_media3_uses_fail_closed_default_proxy_selector(self):
        source = (ROOT / "app/src/main/java/dev/hermes/wearos/WearApp.kt").read_text()
        self.assertIn("ProxySelector.setDefault(TailnetRoute.SELECTOR)", source)

    def test_backup_remains_disabled(self):
        self.assertIn('android:allowBackup="false"', MAIN_MANIFEST.read_text())


if __name__ == "__main__":
    unittest.main()
