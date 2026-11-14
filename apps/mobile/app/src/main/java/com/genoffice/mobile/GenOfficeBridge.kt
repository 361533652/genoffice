package com.genoffice.mobile

import android.app.AlertDialog
import android.content.Context
import android.net.Uri
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.result.ActivityResultLauncher
import org.json.JSONObject
import java.util.concurrent.Executors

/**
 * The native side of the host bridge.
 *
 * JS calls `GenOfficeNative.post(JSON.stringify({id, method, params}))`; the
 * answer comes back through `window.__genofficeNativeResolve(id, json)`.
 * Every answer is `{ok, result}` or `{ok:false, error}` — the same probe /
 * action / diagnostic discipline the TS host uses: an action that cannot run
 * fails with a reason, never with a silent undefined.
 *
 * SAF is the file contract: open/save go through ACTION_OPEN_DOCUMENT /
 * ACTION_CREATE_DOCUMENT, and a granted URI is the writable handle. That is
 * the capability a browser tab does not have (saveInPlace: true).
 */
class GenOfficeBridge(
    private val activity: MainActivity,
    private val webView: WebView,
    private val createDocument: ActivityResultLauncher<String>,
) {
    private val io = Executors.newCachedThreadPool()
    private val prefs = activity.getSharedPreferences("genoffice-host", Context.MODE_PRIVATE)

    /** the save waiting for the user to pick a destination */
    private var pendingSave: PendingSave? = null

    private data class PendingSave(val id: String, val bytes: ByteArray, val name: String)

    @JavascriptInterface
    fun post(message: String) {
        val request = try {
            JSONObject(message)
        } catch (e: Exception) {
            return
        }
        val id = request.optString("id")
        if (id.isEmpty()) return
        val params = request.optJSONObject("params") ?: JSONObject()
        when (request.optString("method")) {
            "getSetting" -> {
                val key = params.optString("key")
                resolve(id, JSONObject().put("ok", true).put("result", prefs.getString(key, null)))
            }
            "setSetting" -> {
                prefs.edit().putString(params.optString("key"), params.optString("value")).apply()
                resolve(id, JSONObject().put("ok", true).put("result", true))
            }
            "confirm" -> confirm(id, params.optString("message"))
            "alert" -> alert(id, params.optString("message"))
            "openDocument" -> activity.launchNativeOpen(id)
            "saveDocumentAs" -> saveDocumentAs(id, params)
            "saveInPlace" -> saveInPlace(id, params)
            "readDocument" -> readDocument(id, params.optString("handleId"))
            else -> fail(id, "unknown host method: ${request.optString("method")}")
        }
    }

    // ---- dialogs (the host owns modal UI) ---------------------------------

    private fun confirm(id: String, message: String) {
        activity.runOnUiThread {
            AlertDialog.Builder(activity)
                .setMessage(message)
                .setPositiveButton(android.R.string.ok) { _, _ ->
                    resolve(id, JSONObject().put("ok", true).put("result", true))
                }
                .setNegativeButton(android.R.string.cancel) { _, _ ->
                    resolve(id, JSONObject().put("ok", true).put("result", false))
                }
                .setOnCancelListener {
                    resolve(id, JSONObject().put("ok", true).put("result", false))
                }
                .show()
        }
    }

    private fun alert(id: String, message: String) {
        activity.runOnUiThread {
            AlertDialog.Builder(activity)
                .setMessage(message)
                .setPositiveButton(android.R.string.ok) { _, _ ->
                    resolve(id, JSONObject().put("ok", true).put("result", true))
                }
                .setOnCancelListener {
                    resolve(id, JSONObject().put("ok", true).put("result", true))
                }
                .show()
        }
    }

    // ---- SAF file access ---------------------------------------------------

    /** called by the activity when the native open picker answers */
    fun onNativeOpenResult(id: String, uri: Uri?) {
        if (uri == null) {
            resolve(id, JSONObject().put("ok", false).put("reason", "canceled"))
            return
        }
        io.execute {
            try {
                try {
                    activity.contentResolver.takePersistableUriPermission(
                        uri,
                        android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION or
                            android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    )
                } catch (_: SecurityException) {
                }
                val bytes = activity.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                    ?: throw IllegalStateException("cannot open $uri")
                val handle = JSONObject()
                    .put("id", uri.toString())
                    .put("name", displayName(uri) ?: "document")
                    .put("writable", true)
                resolve(
                    id,
                    JSONObject().put("ok", true).put(
                        "result",
                        JSONObject()
                            .put("handle", handle)
                            .put("data", Base64.encodeToString(bytes, Base64.NO_WRAP))
                    )
                )
            } catch (e: Exception) {
                fail(id, "open failed: ${e.message}")
            }
        }
    }

    private fun saveDocumentAs(id: String, params: JSONObject) {
        val bytes = Base64.decode(params.optString("data"), Base64.DEFAULT)
        val name = params.optString("name").ifEmpty { "document" }
        pendingSave = PendingSave(id, bytes, name)
        activity.runOnUiThread { createDocument.launch(name) }
    }

    /** called by the activity when ACTION_CREATE_DOCUMENT answers */
    fun onCreateDocumentResult(uri: Uri?) {
        val save = pendingSave
        pendingSave = null
        if (save == null) return
        if (uri == null) {
            resolve(save.id, JSONObject().put("ok", false).put("reason", "canceled"))
            return
        }
        io.execute {
            try {
                activity.contentResolver.openOutputStream(uri, "wt")?.use { it.write(save.bytes) }
                    ?: throw IllegalStateException("cannot open $uri for writing")
                try {
                    activity.contentResolver.takePersistableUriPermission(
                        uri,
                        android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION or
                            android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    )
                } catch (_: SecurityException) {
                }
                val handle = JSONObject()
                    .put("id", uri.toString())
                    .put("name", displayName(uri) ?: save.name)
                    .put("writable", true)
                resolve(save.id, JSONObject().put("ok", true).put("result", JSONObject().put("handle", handle)))
            } catch (e: Exception) {
                fail(save.id, "save failed: ${e.message}")
            }
        }
    }

    private fun saveInPlace(id: String, params: JSONObject) {
        val handleId = params.optString("handleId")
        val bytes = Base64.decode(params.optString("data"), Base64.DEFAULT)
        io.execute {
            try {
                val uri = Uri.parse(handleId)
                activity.contentResolver.openOutputStream(uri, "wt")?.use { it.write(bytes) }
                    ?: throw IllegalStateException("cannot open $handleId for writing")
                resolve(id, JSONObject().put("ok", true).put("result", JSONObject().put("ok", true)))
            } catch (e: Exception) {
                resolve(
                    id,
                    JSONObject().put("ok", true)
                        .put("result", JSONObject().put("ok", false).put("error", e.message ?: "write failed"))
                )
            }
        }
    }

    private fun readDocument(id: String, handleId: String) {
        io.execute {
            try {
                val bytes = activity.contentResolver.openInputStream(Uri.parse(handleId))?.use {
                    it.readBytes()
                } ?: throw IllegalStateException("cannot open $handleId")
                resolve(
                    id,
                    JSONObject().put("ok", true)
                        .put("result", Base64.encodeToString(bytes, Base64.NO_WRAP))
                )
            } catch (e: Exception) {
                fail(id, "read failed: ${e.message}")
            }
        }
    }

    private fun displayName(uri: Uri): String? {
        return try {
            activity.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val index = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                if (index >= 0 && cursor.moveToFirst()) cursor.getString(index) else null
            }
        } catch (e: Exception) {
            null
        }
    }

    // ---- reply plumbing -----------------------------------------------------

    private fun resolve(id: String, payload: JSONObject) {
        // both arguments are JS literals: the id must be quoted too, or the
        // page evaluates it as an identifier (ReferenceError, promise hangs)
        val quotedId = JSONObject.quote(id)
        val json = JSONObject.quote(payload.toString())
        activity.runOnUiThread {
            webView.evaluateJavascript("window.__genofficeNativeResolve($quotedId, $json)", null)
        }
    }

    private fun fail(id: String, error: String) {
        resolve(id, JSONObject().put("ok", false).put("error", error))
    }
}
