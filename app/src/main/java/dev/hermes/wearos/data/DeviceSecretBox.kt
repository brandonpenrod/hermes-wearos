package dev.hermes.wearos.data

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** AES-256-GCM backed by a non-exportable Android Keystore key. */
internal object DeviceSecretBox {
    private const val ALIAS = "hermes-wear-storage-v1"
    private const val PREFIX = "enc:v1:"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"

    fun isEncrypted(value: String): Boolean = value.startsWith(PREFIX)

    fun encrypt(plaintext: String): String {
        return try {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, key())
            val iv = cipher.iv
            val ciphertext = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
            PREFIX + Base64.encodeToString(iv + ciphertext, Base64.NO_WRAP)
        } catch (e: Exception) {
            throw IllegalStateException("Secure storage unavailable; legacy data was retained. Unlock device security, then retry migration or re-enter credentials in Settings.", e)
        }
    }

    fun decrypt(value: String): String {
        require(isEncrypted(value)) { "value is not encrypted" }
        val input = try {
            Base64.decode(value.removePrefix(PREFIX), Base64.NO_WRAP)
        } catch (e: Exception) {
            throw IllegalStateException("Secure storage is unreadable; stored data was retained. Re-enter credentials in Settings after recovery.", e)
        }
        require(input.size > 12) { "Secure storage is truncated; stored data was retained." }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, input.copyOfRange(0, 12)))
        return try {
            String(cipher.doFinal(input.copyOfRange(12, input.size)), Charsets.UTF_8)
        } catch (e: Exception) {
            throw IllegalStateException("Secure storage authentication failed; stored data was retained. Re-enter credentials in Settings after recovery.", e)
        }
    }

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return generator.generateKey()
    }
}
