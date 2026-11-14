package com.genoffice.mobile

/**
 * A file the host is holding for the web app to open — set when the user picks
 * "Open with GenOffice" (ACTION_VIEW), opens a recent, or picks a file from the
 * home screen. The web app consumes it once at boot through the bridge
 * (getPendingOpen); hasPendingOpen peeks without consuming (sheets' boot probe).
 */
object PendingOpen {
    @Volatile var name: String? = null
    @Volatile var bytes: ByteArray? = null
    @Volatile var handleId: String? = null
    @Volatile var writable: Boolean = false

    fun set(name: String, bytes: ByteArray, handleId: String, writable: Boolean) {
        this.name = name
        this.bytes = bytes
        this.handleId = handleId
        this.writable = writable
    }

    fun has(): Boolean = bytes != null

    /** Hand the file to the web app and clear it (one-shot). */
    fun consume(): Pending? {
        val b = bytes ?: return null
        val p = Pending(name ?: "document", b, handleId ?: "", writable)
        name = null
        bytes = null
        handleId = null
        writable = false
        return p
    }

    data class Pending(val name: String, val bytes: ByteArray, val handleId: String, val writable: Boolean)
}
