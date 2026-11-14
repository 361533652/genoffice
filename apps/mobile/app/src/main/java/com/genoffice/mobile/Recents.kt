package com.genoffice.mobile

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Recently opened files, persisted in SharedPreferences as a JSON array.
 * Each entry: { app, name, uri, ts }. Most-recent first, deduped by uri, capped.
 * The home screen lists them; tapping one re-opens it through PendingOpen.
 */
object Recents {
    private const val PREFS = "genoffice-recents"
    private const val KEY = "list"
    private const val MAX = 30

    data class Entry(val app: String, val name: String, val uri: String, val ts: Long)

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun list(ctx: Context): List<Entry> {
        val raw = prefs(ctx).getString(KEY, "[]") ?: "[]"
        return try {
            val arr = JSONArray(raw)
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                Entry(o.optString("app"), o.optString("name"), o.optString("uri"), o.optLong("ts"))
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    /** Record (or bump) a file. No-op for synthetic/non-content handles. */
    fun add(ctx: Context, app: String, name: String, uri: String) {
        if (!uri.startsWith("content://") && !uri.startsWith("file://")) return
        val existing = list(ctx).filter { it.uri != uri }
        val next = (listOf(Entry(app, name, uri, System.currentTimeMillis())) + existing).take(MAX)
        val arr = JSONArray()
        for (e in next) {
            arr.put(JSONObject().put("app", e.app).put("name", e.name).put("uri", e.uri).put("ts", e.ts))
        }
        prefs(ctx).edit().putString(KEY, arr.toString()).apply()
    }

    fun remove(ctx: Context, uri: String) {
        val next = list(ctx).filter { it.uri != uri }
        val arr = JSONArray()
        for (e in next) {
            arr.put(JSONObject().put("app", e.app).put("name", e.name).put("uri", e.uri).put("ts", e.ts))
        }
        prefs(ctx).edit().putString(KEY, arr.toString()).apply()
    }
}
