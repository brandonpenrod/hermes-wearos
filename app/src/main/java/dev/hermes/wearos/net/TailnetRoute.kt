package dev.hermes.wearos.net

import java.io.IOException
import java.net.InetSocketAddress
import java.net.Proxy
import java.net.ProxySelector
import java.net.SocketAddress
import java.net.URI

/** Routes all non-loopback app traffic through the embedded tsnet SOCKS listener. */
object TailnetRoute {
    @Volatile
    var socksPort: Int = 0

    private fun isLoopback(host: String): Boolean =
        host.equals("localhost", ignoreCase = true) || host == "127.0.0.1" || host == "::1"

    /** Gateway traffic is acceptable only on HTTP(S) with an active private tunnel route. */
    fun requireSafeGatewayUrl(url: String) {
        val uri = URI(url)
        require(uri.scheme == "https" || uri.scheme == "http") { "unsupported gateway transport" }
        val host = uri.host?.takeIf { it.isNotBlank() } ?: throw IllegalArgumentException("gateway URL has no host")
        require(!isLoopback(host)) { "gateway must not use a direct loopback endpoint" }
        check(socksPort in 1..65535) { "tailnet tunnel unavailable; refusing direct gateway transport" }
    }

    val SELECTOR: ProxySelector = object : ProxySelector() {
        override fun select(uri: URI?): List<Proxy> {
            val target = uri ?: throw IllegalArgumentException("missing destination URI")
            val host = target.host?.lowercase().orEmpty()
            if (host.isEmpty()) throw IllegalArgumentException("destination has no host")
            if (isLoopback(host)) return listOf(Proxy.NO_PROXY)
            requireSafeGatewayUrl(target.toString())
            val port = socksPort
            return listOf(Proxy(Proxy.Type.SOCKS, InetSocketAddress("127.0.0.1", port)))
        }

        override fun connectFailed(uri: URI?, sa: SocketAddress?, ioe: IOException?) {}
    }
}
