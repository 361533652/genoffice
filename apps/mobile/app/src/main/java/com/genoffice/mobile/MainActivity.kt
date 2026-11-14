package com.genoffice.mobile

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import androidx.webkit.WebViewCompat

/**
 * The GenOffice Android host.
 *
 * One activity, two views: an app chooser and a WebView. The six editors are
 * the SAME production bundles the browser host runs (vite build output under
 * assets/web/<app>/), served through WebViewAssetLoader over https so the
 * platform treats them as a secure origin (no file:// CORS quirks).
 *
 * What the host adds over a plain browser tab:
 *  - document-start injection of the host bridge (assets/host/genoffice-host.js):
 *    __genofficeHost for the facade, the sheets wasm engine URL, and the
 *    long-press → contextmenu synthesis WebView does not do on its own
 *  - <input type=file> routed to SAF through onShowFileChooser
 *  - blob: downloads (the no-picker save fallback) intercepted in JS and
 *    written through SAF, because WebView's DownloadListener never sees them
 *  - settings/confirm/alert through the GenOfficeNative JS interface
 */
class MainActivity : ComponentActivity() {
    private lateinit var root: FrameLayout
    private lateinit var chooser: LinearLayout
    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private lateinit var bridge: GenOfficeBridge
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var currentApp: String? = null

    private val openDocument =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            val callback = fileChooserCallback
            fileChooserCallback = null
            if (uri != null) {
                try {
                    contentResolver.takePersistableUriPermission(
                        uri, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    )
                } catch (_: SecurityException) {
                    // some providers grant no persistable permission; the
                    // session keeps working with the transient grant
                }
            }
            callback?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
        }

    private val createDocument =
        registerForActivityResult(ActivityResultContracts.CreateDocument("application/octet-stream")) { uri ->
            bridge.onCreateDocumentResult(uri)
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        root = FrameLayout(this)
        buildChooser()
        buildWebView()
        root.addView(chooser, FrameLayout.LayoutParams(-1, -1))
        webView.visibility = View.GONE
        root.addView(webView, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)
    }

    private fun buildChooser() {
        chooser = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 96, 48, 48)
        }
        chooser.addView(TextView(this).apply {
            text = getString(R.string.chooser_title)
            textSize = 28f
            setPadding(0, 0, 0, 48)
        })
        val apps = listOf(
            "docs" to "文档 Docs",
            "sheets" to "表格 Sheets",
            "slides" to "幻灯片 Slides",
            "pdf" to "PDF",
            "markdown" to "Markdown",
            "html" to "HTML",
        )
        for (app in apps) {
            val button = Button(this).apply {
                text = app.second
                setOnClickListener { openApp(app.first) }
            }
            chooser.addView(button, LinearLayout.LayoutParams(-1, -2).also { it.bottomMargin = 16 })
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun buildWebView() {
        // devtools over adb (chrome://inspect): the host is verified through CDP
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
            // the editors are responsive; keep the layout viewport honest
            useWideViewPort = true
            loadWithOverviewMode = true
        }
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
                val mimeTypes = params.acceptTypes
                    .filter { it.isNotEmpty() && it != "*/*" }
                    .toTypedArray()
                openDocument.launch(if (mimeTypes.isEmpty()) arrayOf("*/*") else mimeTypes)
                return true
            }
        }

        // inject the host bridge before any app script runs
        val hostJs = assets.open("host/genoffice-host.js").bufferedReader().use { it.readText() }
        WebViewCompat.addDocumentStartJavaScript(
            webView, hostJs, setOf("https://appassets.androidplatform.net")
        )
    }

    private fun openApp(app: String) {
        currentApp = app
        chooser.visibility = View.GONE
        webView.visibility = View.VISIBLE
        webView.loadUrl("https://appassets.androidplatform.net/assets/web/$app/index.html")
    }

    private fun showChooser() {
        currentApp = null
        webView.visibility = View.GONE
        chooser.visibility = View.VISIBLE
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (currentApp != null && webView.canGoBack()) {
            webView.goBack()
            return
        }
        if (currentApp != null) {
            showChooser()
            return
        }
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
