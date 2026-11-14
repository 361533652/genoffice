package com.genoffice.mobile

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.text.format.DateUtils
import android.view.Gravity
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.widget.Button
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import androidx.webkit.WebViewCompat

/**
 * The GenOffice Android host.
 *
 * A home screen (recent files + the six editors + an open-file button) and a
 * WebView. The editors are the SAME production bundles the browser host runs
 * (assets/web/<app>/), served over https via WebViewAssetLoader.
 *
 * Files reach an editor three ways, all funnelling through [PendingOpen] which
 * the web app consumes at boot:
 *  - "Open with GenOffice" from another app (ACTION_VIEW intent filter)
 *  - tapping a recent file on the home screen
 *  - the home screen's open-file button (SAF)
 * In-app opens/saves also record into [Recents] so the home list stays live.
 */
class MainActivity : ComponentActivity() {
    private lateinit var root: FrameLayout
    private lateinit var home: ScrollView
    private lateinit var recentsBox: LinearLayout
    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private lateinit var bridge: GenOfficeBridge
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var currentApp: String? = null

    private data class AppDef(val id: String, val label: String, val glyph: String, val color: Int)

    private val apps = listOf(
        AppDef("docs", "文档", "W", 0xFF2B579A.toInt()),
        AppDef("sheets", "表格", "X", 0xFF217346.toInt()),
        AppDef("slides", "幻灯片", "P", 0xFFB7472A.toInt()),
        AppDef("pdf", "PDF", "PDF", 0xFFC62828.toInt()),
        AppDef("markdown", "Markdown", "M", 0xFF455A64.toInt()),
        AppDef("html", "HTML", "H", 0xFFE34F26.toInt()),
    )

    private val openDocument =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            val callback = fileChooserCallback
            fileChooserCallback = null
            if (uri != null) {
                persist(uri)
                callback?.onReceiveValue(arrayOf(uri))
            } else {
                callback?.onReceiveValue(null)
            }
        }

    private val createDocument =
        registerForActivityResult(ActivityResultContracts.CreateDocument("application/octet-stream")) { uri ->
            bridge.onCreateDocumentResult(uri)
        }

    private var nativeOpenPending: String? = null
    private val openDocumentNative =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            val id = nativeOpenPending ?: return@registerForActivityResult
            nativeOpenPending = null
            if (uri != null) persist(uri)
            bridge.onNativeOpenResult(id, uri)
        }

    /** the home screen's own open-file picker (routes by type, no web chooser) */
    private val homeOpenPicker =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) openUri(uri, recordAndLaunch = true)
        }

    fun launchNativeOpen(requestId: String) {
        nativeOpenPending = requestId
        openDocumentNative.launch(arrayOf("*/*"))
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        root = FrameLayout(this)
        buildHome()
        buildWebView()
        root.addView(home, FrameLayout.LayoutParams(-1, -1))
        webView.visibility = View.GONE
        root.addView(webView, FrameLayout.LayoutParams(-1, -1))
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }
        setContentView(root)
        handleViewIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleViewIntent(intent)
    }

    // ---- incoming "Open with" intents ----------------------------------------

    private fun handleViewIntent(intent: Intent?) {
        if (intent?.action != Intent.ACTION_VIEW) return
        val uri = intent.data ?: return
        openUri(uri, recordAndLaunch = true)
    }

    /** Read a uri, stage it as the pending file, record a recent, launch its editor. */
    private fun openUri(uri: Uri, recordAndLaunch: Boolean) {
        val name = displayName(uri) ?: uri.lastPathSegment ?: "document"
        val mime = contentResolver.getType(uri)
        val app = appFor(mime, name)
        val bytes = readUri(uri)
        if (bytes == null) {
            Toast.makeText(this, "无法读取该文件", Toast.LENGTH_SHORT).show()
            return
        }
        persist(uri)
        PendingOpen.set(name, bytes, uri.toString(), writable = true)
        if (recordAndLaunch) {
            Recents.add(this, app, name, uri.toString())
            openApp(app)
        }
    }

    private fun appFor(mime: String?, name: String): String {
        val ext = name.substringAfterLast('.', "").lowercase()
        return when {
            mime == "application/pdf" || ext == "pdf" -> "pdf"
            mime?.contains("wordprocessingml") == true || mime == "application/msword" || ext == "docx" || ext == "doc" -> "docs"
            mime?.contains("spreadsheetml") == true || mime == "application/vnd.ms-excel" || ext == "xlsx" || ext == "xls" || ext == "csv" -> "sheets"
            mime?.contains("presentationml") == true || mime == "application/vnd.ms-powerpoint" || ext == "pptx" || ext == "ppt" -> "slides"
            mime == "text/html" || ext == "html" || ext == "htm" -> "html"
            mime == "text/markdown" || mime == "text/x-markdown" || ext == "md" || ext == "markdown" -> "markdown"
            ext == "txt" || ext == "log" || mime == "text/plain" -> "markdown"
            else -> "docs"
        }
    }

    // ---- home screen -----------------------------------------------------------

    private fun buildHome() {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(24), dp(20), dp(32))
            setBackgroundColor(0xFFF5F6F8.toInt())
        }

        container.addView(TextView(this).apply {
            text = "GenOffice"
            textSize = 30f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(0xFF1A1A1A.toInt())
        })
        container.addView(TextView(this).apply {
            text = "文档 · 表格 · 幻灯片 · PDF"
            textSize = 14f
            setTextColor(0xFF7A7A7A.toInt())
            setPadding(0, dp(2), 0, dp(20))
        })

        val openBtn = Button(this).apply {
            text = "打开文件"
            setOnClickListener { homeOpenPicker.launch(arrayOf("*/*")) }
        }
        container.addView(openBtn, LinearLayout.LayoutParams(-1, dp(48)).also { it.bottomMargin = dp(24) })

        container.addView(sectionLabel("最近使用"))
        recentsBox = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        container.addView(recentsBox, LinearLayout.LayoutParams(-1, -2).also { it.bottomMargin = dp(24) })

        container.addView(sectionLabel("应用"))
        val grid = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        for (row in apps.chunked(3)) {
            val rowLayout = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                weightSum = 3f
            }
            for (app in row) {
                rowLayout.addView(appCard(app), LinearLayout.LayoutParams(0, -2, 1f).also {
                    it.marginEnd = dp(10)
                })
            }
            grid.addView(rowLayout, LinearLayout.LayoutParams(-1, -2).also { it.bottomMargin = dp(10) })
        }
        container.addView(grid)

        home = ScrollView(this).apply {
            addView(container, FrameLayout.LayoutParams(-1, -2))
            isFillViewport = true
        }
        refreshRecents()
    }

    private fun sectionLabel(text: String): TextView = TextView(this).apply {
        this.text = text
        textSize = 13f
        setTypeface(typeface, Typeface.BOLD)
        setTextColor(0xFF9A9A9A.toInt())
        setPadding(0, 0, 0, dp(10))
    }

    private fun appCard(app: AppDef): LinearLayout {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(8), dp(18), dp(8), dp(18))
            background = rounded(0xFFFFFFFF.toInt(), dp(14))
            setOnClickListener { openApp(app.id) }
        }
        card.addView(TextView(this).apply {
            text = app.glyph
            textSize = if (app.glyph.length > 1) 16f else 24f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            background = rounded(app.color, dp(12))
            val size = dp(52)
            layoutParams = LinearLayout.LayoutParams(size, size).also { it.bottomMargin = dp(10) }
        })
        card.addView(TextView(this).apply {
            text = app.label
            textSize = 13f
            setTextColor(0xFF333333.toInt())
            gravity = Gravity.CENTER
        })
        return card
    }

    private fun refreshRecents() {
        recentsBox.removeAllViews()
        val entries = Recents.list(this)
        if (entries.isEmpty()) {
            recentsBox.addView(TextView(this).apply {
                text = "暂无最近文件 — 打开或新建一个文件开始使用。"
                textSize = 13f
                setTextColor(0xFF9A9A9A.toInt())
                setPadding(dp(4), dp(8), dp(4), dp(8))
            })
            return
        }
        for (entry in entries.take(12)) {
            recentsBox.addView(recentRow(entry))
        }
    }

    private fun recentRow(entry: Recents.Entry): LinearLayout {
        val app = apps.find { it.id == entry.app } ?: apps[0]
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), dp(12), dp(12), dp(12))
            background = rounded(0xFFFFFFFF.toInt(), dp(12))
            setOnClickListener { openRecent(entry) }
        }
        row.addView(TextView(this).apply {
            text = app.glyph
            textSize = if (app.glyph.length > 1) 12f else 18f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            background = rounded(app.color, dp(9))
            val size = dp(40)
            layoutParams = LinearLayout.LayoutParams(size, size).also { it.marginEnd = dp(12) }
        })
        val textCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, -2, 1f)
        }
        textCol.addView(TextView(this).apply {
            text = entry.name
            textSize = 15f
            setTextColor(0xFF222222.toInt())
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
        })
        textCol.addView(TextView(this).apply {
            text = "${app.label} · ${DateUtils.getRelativeTimeSpanString(entry.ts)}"
            textSize = 12f
            setTextColor(0xFF9A9A9A.toInt())
            setPadding(0, dp(2), 0, 0)
        })
        row.addView(textCol)
        val lp = LinearLayout.LayoutParams(-1, -2)
        lp.bottomMargin = dp(8)
        row.layoutParams = lp
        return row
    }

    private fun openRecent(entry: Recents.Entry) {
        val uri = Uri.parse(entry.uri)
        val bytes = readUri(uri)
        if (bytes == null) {
            Toast.makeText(this, "文件已不可用，已从最近移除", Toast.LENGTH_SHORT).show()
            Recents.remove(this, entry.uri)
            refreshRecents()
            return
        }
        persist(uri)
        PendingOpen.set(entry.name, bytes, entry.uri, writable = true)
        Recents.add(this, entry.app, entry.name, entry.uri)
        openApp(entry.app)
    }

    // ---- WebView ---------------------------------------------------------------

    @SuppressLint("SetJavaScriptEnabled")
    private fun buildWebView() {
        WebView.setWebContentsDebuggingEnabled(true)
        webView = WebView(this)
        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        bridge = GenOfficeBridge(this, webView, createDocument)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = true
        }
        // The editors theme themselves (data-theme); never let the system/OEM
        // (e.g. HyperOS) algorithmically darken the WebView — that turns menus
        // into dark-on-dark "invisible" panels. Belt-and-suspenders with the
        // color-scheme meta in each app's index.html.
        androidx.webkit.WebSettingsCompat.setAlgorithmicDarkeningAllowed(webView.settings, false)
        webView.addJavascriptInterface(bridge, "GenOfficeNative")
        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: android.webkit.WebResourceRequest
            ): android.webkit.WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = callback
                openDocument.launch(arrayOf("*/*"))
                return true
            }

            override fun onJsConfirm(
                view: WebView, url: String, message: String, result: android.webkit.JsResult
            ): Boolean {
                android.app.AlertDialog.Builder(this@MainActivity)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok) { _, _ -> result.confirm() }
                    .setNegativeButton(android.R.string.cancel) { _, _ -> result.cancel() }
                    .setOnCancelListener { result.cancel() }
                    .show()
                return true
            }

            override fun onJsAlert(
                view: WebView, url: String, message: String, result: android.webkit.JsResult
            ): Boolean {
                android.app.AlertDialog.Builder(this@MainActivity)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok) { _, _ -> result.confirm() }
                    .setOnCancelListener { result.confirm() }
                    .show()
                return true
            }

            override fun onJsBeforeUnload(
                view: WebView, url: String, message: String, result: android.webkit.JsResult
            ): Boolean {
                android.app.AlertDialog.Builder(this@MainActivity)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok) { _, _ -> result.confirm() }
                    .setNegativeButton(android.R.string.cancel) { _, _ -> result.cancel() }
                    .setOnCancelListener { result.cancel() }
                    .show()
                return true
            }
        }

        val hostJs = assets.open("host/genoffice-host.js").bufferedReader().use { it.readText() }
        WebViewCompat.addDocumentStartJavaScript(
            webView, hostJs, setOf("https://appassets.androidplatform.net")
        )
    }

    private fun openApp(app: String) {
        currentApp = app
        home.visibility = View.GONE
        webView.visibility = View.VISIBLE
        webView.loadUrl("https://appassets.androidplatform.net/assets/web/$app/index.html")
    }

    private fun showHome() {
        currentApp = null
        webView.visibility = View.GONE
        home.visibility = View.VISIBLE
        refreshRecents()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (currentApp != null && webView.canGoBack()) {
            webView.goBack()
            return
        }
        if (currentApp != null) {
            showHome()
            return
        }
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }

    // ---- helpers ---------------------------------------------------------------

    private fun readUri(uri: Uri): ByteArray? = try {
        contentResolver.openInputStream(uri)?.use { it.readBytes() }
    } catch (e: Exception) {
        null
    }

    private fun persist(uri: Uri) {
        try {
            contentResolver.takePersistableUriPermission(
                uri, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )
        } catch (_: SecurityException) {
        }
    }

    private fun displayName(uri: Uri): String? = try {
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val index = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            if (index >= 0 && cursor.moveToFirst()) cursor.getString(index) else null
        }
    } catch (e: Exception) {
        null
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun rounded(color: Int, radius: Int): GradientDrawable = GradientDrawable().apply {
        setColor(color)
        cornerRadius = radius.toFloat()
    }
}
