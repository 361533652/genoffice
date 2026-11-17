package com.genoffice.mobile

import android.net.Uri
import java.util.UUID

/**
 * Opaque handle ids for SAF documents.
 *
 * The web layer treats a handle id as "an opaque token whose LAST SEGMENT IS THE
 * FILE NAME" (docs/mobile/decisions.md): dozens of call sites split it to show a
 * title, and the editors decide rich-vs-source mode from the extension. Handing
 * out `content://…primary%3ADownload%2Fnote.md` broke both — the status bar
 * showed percent-encoded text (the user's "乱码") and `.md` files opened in the
 * source pane because the last segment was a provider token, not `note.md`.
 *
 * So ids are minted here as `saf/<uuid>/<name>` and the URI lives in this map.
 * Ids are process-scoped; a file reopened from Recents still arrives as a raw
 * URI and is normalised on first use (see [normalise]).
 */
object SafHandles {
    private val uris = HashMap<String, Uri>()

    private fun safeName(name: String): String =
        name.replace(Regex("[^\\w.\\-]+"), "_").ifEmpty { "document" }

    fun register(uri: Uri, name: String): String {
        val id = "saf/" + UUID.randomUUID().toString() + "/" + safeName(name)
        synchronized(uris) { uris[id] = uri }
        return id
    }

    /** Recents / old handoffs carry the raw URI; mint an opaque id for it. */
    fun normalise(id: String, name: String): String {
        if (id.startsWith("saf/")) return id
        val uri = runCatching { Uri.parse(id) }.getOrNull() ?: return id
        return register(uri, name)
    }

    fun uri(id: String): Uri? {
        synchronized(uris) { uris[id] }?.let { return it }
        // legacy ids (and ids restored without a map entry) are still URIs
        return runCatching { Uri.parse(id) }.getOrNull()
            ?.takeIf { it.scheme == "content" || it.scheme == "file" }
    }
}
