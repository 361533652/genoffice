package com.genoffice.mobile

import android.annotation.SuppressLint
import android.content.Intent
import android.content.res.ColorStateList
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.graphics.drawable.StateListDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.text.format.DateUtils
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import androidx.webkit.WebViewCompat

/**
 * The GenOffice Android host.
 *
 * A home screen (title → "新建" app grid → "最近使用" list with an open-file
 * text action, themed light/dark by the system uiMode) and a WebView. The
 * editors are the SAME production bundles the browser host runs
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
    private lateinit var homeTheme: HomeTheme
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null

    /** the editor currently VISIBLE (null on the home screen) */
    private var currentApp: String? = null

    /** the editor loaded in the WebView, kept across showHome() so a hidden but
     *  live session is still protected by the unsaved-changes gate (P1-6) */
    private var webApp: String? = null

    /** grid column count of the currently built home (3 portrait / 6 wide) */
    private var homeCols = 0

    /** "查看全部" expands the recent list in place; reset only by process death */
    private var recentsExpanded = false

    /** badge drawables are the desktop FileBadge SVGs converted to vectors (P0-4) */
    private data class AppDef(val id: String, val label: String, val badgeRes: Int)

    private val apps = listOf(
        AppDef("docs", "文档", R.drawable.home_badge_docs),
        AppDef("sheets", "表格", R.drawable.home_badge_sheets),
        AppDef("slides", "幻灯片", R.drawable.home_badge_slides),
        AppDef("pdf", "PDF", R.drawable.home_badge_pdf),
        AppDef("markdown", "Markdown", R.drawable.home_badge_markdown),
        AppDef("html", "HTML", R.drawable.home_badge_html),
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
        // the inset padding strips show the root background — keep it on-theme
        // so status/navigation bars meet the page without a seam (P1-5)
        root.setBackgroundColor(homeTheme.bg)
        setContentView(root)
        applySystemBars()
        registerBackNavigation()
        handleViewIntent(intent)
    }

    /**
     * BACK navigation (P0-1 + P1-5), on the modern dispatcher instead of the
     * deprecated [onBackPressed] override so predictive back keeps working.
     *
     * Order of precedence while an editor is visible:
     *  1. ask the web layer to close its topmost dialog/panel (P1-5); if it
     *     consumed the press, stay in the editor;
     *  2. otherwise walk the WebView's OWN history — after [onPageFinished]
     *     clears cross-app entries this is app-internal only (today zero, so
     *     this branch is future-proofing for renderer pushState routing);
     *  3. otherwise go home. On the home screen BACK falls through to the
     *     system and exits the task.
     */
    private fun registerBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (currentApp == null) {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                    return
                }
                handleEditorBack()
            }
        })
    }

    /** Debounce so a single BACK press delivered as both a key event (see
     *  [dispatchKeyEvent]) and a predictive-back invocation is handled once. */
    private var lastEditorBackAt = 0L

    /**
     * R2①: intercept BACK at the Activity's key dispatch, BEFORE the WebView's
     * input connection can swallow it. When a dialog auto-focuses an input, the
     * IME used to eat the first BACK to dismiss the keyboard, so the back
     * callback (and thus `__genofficeHandleBack`) never ran — the dialog needed
     * two presses. Routing the key event here first lets the web layer close the
     * topmost UI on the first press. The web handler also blurs a focused input
     * when no overlay is open, preserving the keyboard-dismiss-then-leave order.
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK && currentApp != null && !event.isCanceled) {
            if (event.action == KeyEvent.ACTION_DOWN) {
                handleEditorBack()
                return true
            }
            if (event.action == KeyEvent.ACTION_UP) return true
        }
        return super.dispatchKeyEvent(event)
    }

    /** The editor-visible BACK precedence (web-first), shared by both paths. */
    private fun handleEditorBack() {
        val now = android.os.SystemClock.uptimeMillis()
        if (now - lastEditorBackAt < 400) return
        lastEditorBackAt = now
        webView.evaluateJavascript(
            "(function(){try{return !!(window.__genofficeHandleBack&&window.__genofficeHandleBack())}catch(e){return false}})()"
        ) { consumed ->
            if (consumed == "true") return@evaluateJavascript
            if (webView.canGoBack()) webView.goBack() else showHome()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleViewIntent(intent)
    }

    /**
     * Rotation is handled here (configChanges), not by recreation. Only the
     * home subtree is rebuilt when the column bucket changes; the WebView and
     * its editor state are never touched. Night-mode switches are NOT in
     * configChanges, so they recreate the activity and re-resolve HomeTheme.
     */
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        if (!::home.isInitialized) return
        val cols = if (newConfig.screenWidthDp >= 600) 6 else 3
        if (cols != homeCols) rebuildHome()
    }

    private fun rebuildHome() {
        val visible = home.visibility
        val scroll = home.scrollY
        root.removeView(home)
        buildHome()
        home.visibility = visible
        root.addView(home, 0, FrameLayout.LayoutParams(-1, -1))
        home.post { home.scrollY = scroll }
        applySystemBars()
    }

    /** status/navigation bars match the page background; icons follow the theme */
    private fun applySystemBars() {
        window.statusBarColor = homeTheme.bg
        window.navigationBarColor = homeTheme.bg
        if (Build.VERSION.SDK_INT >= 28) window.navigationBarDividerColor = Color.TRANSPARENT
        val controller = WindowInsetsControllerCompat(window, root)
        controller.isAppearanceLightStatusBars = !homeTheme.night
        controller.isAppearanceLightNavigationBars = !homeTheme.night
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

    /**
     * Home layout per the design review (§7): title → "新建" app grid →
     * "最近使用" single-container list. Content is capped at 640dp and centered;
     * the grid is 6 columns on ≥600dp screens, 3 otherwise, so all six apps
     * stay above the fold in landscape (P0-1 / P0-2).
     */
    private fun buildHome() {
        homeTheme = HomeTheme.from(this)
        val wide = resources.configuration.screenWidthDp >= 600
        homeCols = if (wide) 6 else 3
        val pageMargin = dp(if (wide) 24 else 16)

        val content = ContentColumn(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, dp(12), 0, dp(24))
        }

        content.addView(TextView(this).apply {
            text = "GenOffice"
            textSize = 22f
            typeface = font(700)
            letterSpacing = -0.01f
            setTextColor(homeTheme.text)
        }, LinearLayout.LayoutParams(-1, -2).also { it.bottomMargin = dp(20) })

        content.addView(sectionLabel("新建"), LinearLayout.LayoutParams(-1, -2).also { it.bottomMargin = dp(8) })

        val grid = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val rows = apps.chunked(homeCols)
        for ((ri, row) in rows.withIndex()) {
            val rowLayout = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                weightSum = homeCols.toFloat()
            }
            for ((ci, app) in row.withIndex()) {
                rowLayout.addView(appCard(app), LinearLayout.LayoutParams(0, dp(92), 1f).also {
                    if (ci < row.size - 1) it.marginEnd = dp(8)
                })
            }
            grid.addView(rowLayout, LinearLayout.LayoutParams(-1, -2).also {
                if (ri < rows.size - 1) it.bottomMargin = dp(8)
            })
        }
        content.addView(grid, LinearLayout.LayoutParams(-1, -2).also { it.bottomMargin = dp(24) })

        content.addView(recentsHeader(), LinearLayout.LayoutParams(-1, dp(48)).also { it.bottomMargin = dp(8) })
        recentsBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(homeTheme.surface, dp(12), homeTheme.border)
        }
        content.addView(recentsBox, LinearLayout.LayoutParams(-1, -2))

        val wrapper = FrameLayout(this).apply {
            setPadding(pageMargin, 0, pageMargin, 0)
            addView(content, FrameLayout.LayoutParams(-1, -2, Gravity.CENTER_HORIZONTAL))
        }
        home = ScrollView(this).apply {
            setBackgroundColor(homeTheme.bg)
            isFillViewport = true
            addView(wrapper, FrameLayout.LayoutParams(-1, -2))
        }
        refreshRecents()
    }

    /** caps the content column at 640dp; the FrameLayout parent centers it */
    private inner class ContentColumn(context: android.content.Context) : LinearLayout(context) {
        override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
            val w = minOf(MeasureSpec.getSize(widthMeasureSpec), dp(640))
            super.onMeasure(MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY), heightMeasureSpec)
        }
    }

    private fun sectionLabel(text: String): TextView = TextView(this).apply {
        this.text = text
        textSize = 14f
        typeface = font(600)
        letterSpacing = 0.02f
        setTextColor(homeTheme.secondary)
        ViewCompat.setAccessibilityHeading(this, true)
    }

    /** "最近使用" label + the demoted open-file text button on the right (P0-1) */
    private fun recentsHeader(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        addView(sectionLabel("最近使用"), LinearLayout.LayoutParams(0, -2, 1f))
        addView(openFileButton(), LinearLayout.LayoutParams(-2, dp(48)))
    }

    private fun openFileButton(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        setPadding(dp(12), 0, dp(12), 0)
        background = textButtonBg()
        contentDescription = "打开文件"
        setOnClickListener { homeOpenPicker.launch(arrayOf("*/*")) }
        addView(ImageView(this@MainActivity).apply {
            setImageResource(R.drawable.home_ic_folder)
            setColorFilter(homeTheme.accent)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }, LinearLayout.LayoutParams(dp(16), dp(16)).also { it.marginEnd = dp(4) })
        addView(TextView(this@MainActivity).apply {
            text = "打开文件"
            textSize = 14f
            typeface = font(500)
            setTextColor(homeTheme.accent)
        })
    }

    private fun appCard(app: AppDef): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER
        setPadding(dp(4), dp(12), dp(4), dp(12))
        background = cardBg(homeTheme.surface, 12, homeTheme.border)
        contentDescription = "新建${app.label}"
        setOnClickListener { openApp(app.id) }
        addView(ImageView(this@MainActivity).apply {
            setImageResource(app.badgeRes)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }, LinearLayout.LayoutParams(dp(44), dp(44)).also { it.bottomMargin = dp(8) })
        addView(TextView(this@MainActivity).apply {
            text = app.label
            textSize = 12f
            typeface = font(500)
            setTextColor(homeTheme.text)
            gravity = Gravity.CENTER
            includeFontPadding = false
            maxLines = 1
        })
    }

    private fun refreshRecents() {
        recentsBox.removeAllViews()
        val entries = Recents.list(this)
        if (entries.isEmpty()) {
            recentsBox.addView(emptyState())
            return
        }
        val hasFooter = entries.size > 5
        val shown = if (recentsExpanded) entries else entries.take(5)
        for ((i, entry) in shown.withIndex()) {
            if (i > 0) recentsBox.addView(divider(indent = true))
            recentsBox.addView(recentRow(entry, first = i == 0, last = !hasFooter && i == shown.size - 1))
        }
        if (hasFooter) {
            recentsBox.addView(divider(indent = false))
            recentsBox.addView(showAllFooter())
        }
    }

    /** hairline between rows, indented to the text start (12 + 36 + 12) */
    private fun divider(indent: Boolean): View = View(this).apply {
        setBackgroundColor(homeTheme.divider)
        layoutParams = LinearLayout.LayoutParams(-1, dp(1)).also {
            if (indent) it.marginStart = dp(60)
        }
    }

    private fun recentRow(entry: Recents.Entry, first: Boolean, last: Boolean): LinearLayout {
        val app = apps.find { it.id == entry.app } ?: apps[0]
        val rel = DateUtils.getRelativeTimeSpanString(entry.ts)
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), dp(10), dp(12), dp(10))
            background = rowRipple(first, last)
            contentDescription = "${entry.name}，${app.label}，$rel"
            setOnClickListener { openRecent(entry) }
            addView(ImageView(this@MainActivity).apply {
                setImageResource(app.badgeRes)
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
            }, LinearLayout.LayoutParams(dp(36), dp(36)).also { it.marginEnd = dp(12) })
            val textCol = LinearLayout(this@MainActivity).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, -2, 1f)
            }
            textCol.addView(TextView(this@MainActivity).apply {
                text = entry.name
                textSize = 15f
                typeface = font(500)
                setTextColor(homeTheme.text)
                includeFontPadding = false
                maxLines = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
            })
            textCol.addView(TextView(this@MainActivity).apply {
                text = "${app.label} · $rel"
                textSize = 12f
                setTextColor(homeTheme.secondary)
                includeFontPadding = false
                setPadding(0, dp(2), 0, 0)
            })
            addView(textCol)
            addView(ImageView(this@MainActivity).apply {
                setImageResource(R.drawable.home_ic_chevron_right)
                setColorFilter(homeTheme.iconMuted)
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
            }, LinearLayout.LayoutParams(dp(16), dp(16)).also { it.marginStart = dp(8) })
            layoutParams = LinearLayout.LayoutParams(-1, dp(56))
        }
    }

    /** expands/collapses the full recent list in place (full page: later iteration) */
    private fun showAllFooter(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER
        background = rowRipple(first = false, last = true)
        contentDescription = if (recentsExpanded) "收起最近文件" else "查看全部最近文件"
        setOnClickListener {
            recentsExpanded = !recentsExpanded
            refreshRecents()
        }
        addView(TextView(this@MainActivity).apply {
            text = if (recentsExpanded) "收起" else "查看全部"
            textSize = 14f
            typeface = font(500)
            setTextColor(homeTheme.accent)
        })
        layoutParams = LinearLayout.LayoutParams(-1, dp(48))
    }

    /** empty state: icon → title → hint → open-file action (P1-6) */
    private fun emptyState(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER_HORIZONTAL
        setPadding(dp(16), dp(32), dp(16), dp(32))
        addView(ImageView(this@MainActivity).apply {
            setImageResource(R.drawable.home_ic_folder)
            setColorFilter(homeTheme.iconMuted)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }, LinearLayout.LayoutParams(dp(48), dp(48)).also { it.bottomMargin = dp(16) })
        addView(TextView(this@MainActivity).apply {
            text = "暂无最近文件"
            textSize = 14f
            typeface = font(500)
            setTextColor(homeTheme.text)
        }, LinearLayout.LayoutParams(-2, -2).also { it.bottomMargin = dp(4) })
        addView(TextView(this@MainActivity).apply {
            text = "打开或新建一个文件开始使用"
            textSize = 12f
            setTextColor(homeTheme.secondary)
        }, LinearLayout.LayoutParams(-2, -2).also { it.bottomMargin = dp(16) })
        addView(openFileButton(), LinearLayout.LayoutParams(-2, dp(48)))
    }

    // ---- home drawing helpers ---------------------------------------------------

    /** surface card with 1dp border, 12dp corners and a bounded ripple (P0-5) */
    private fun cardBg(fill: Int, radiusDp: Int, stroke: Int? = null): RippleDrawable {
        val r = dp(radiusDp).toFloat()
        val content = GradientDrawable().apply {
            setColor(fill)
            cornerRadius = r
            if (stroke != null) setStroke(dp(1), stroke)
        }
        val mask = GradientDrawable().apply { setColor(Color.WHITE); cornerRadius = r }
        return RippleDrawable(ColorStateList.valueOf(homeTheme.ripple), content, mask)
    }

    /**
     * Row ripple inside the shared recent container: only the container's outer
     * corners are rounded, so the mask rounds just the first/last row corners.
     */
    private fun rowRipple(first: Boolean, last: Boolean): RippleDrawable {
        val r = dp(12).toFloat()
        val radii = floatArrayOf(
            if (first) r else 0f, if (first) r else 0f,
            if (last) r else 0f, if (last) r else 0f,
            if (last) r else 0f, if (last) r else 0f,
            if (first) r else 0f, if (first) r else 0f,
        )
        val mask = GradientDrawable().apply { setColor(Color.WHITE); cornerRadii = radii }
        return RippleDrawable(ColorStateList.valueOf(homeTheme.ripple), null, mask)
    }

    /** text button: accentSoft pressed fill + ripple, 8dp corners (P0-5) */
    private fun textButtonBg(): RippleDrawable {
        val pressed = GradientDrawable().apply {
            setColor(homeTheme.accentSoft)
            cornerRadius = dp(8).toFloat()
        }
        val content = StateListDrawable().apply {
            addState(intArrayOf(android.R.attr.state_pressed), pressed)
            addState(intArrayOf(), GradientDrawable().apply { setColor(Color.TRANSPARENT) })
        }
        val mask = GradientDrawable().apply { setColor(Color.WHITE); cornerRadius = dp(8).toFloat() }
        return RippleDrawable(ColorStateList.valueOf(homeTheme.ripple), content, mask)
    }

    /** variable font weight on API 28+; graceful normal/bold fallback below */
    private fun font(weight: Int): Typeface =
        if (Build.VERSION.SDK_INT >= 28) Typeface.create(Typeface.DEFAULT, weight, false)
        else if (weight >= 600) Typeface.DEFAULT_BOLD
        else Typeface.DEFAULT

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

            override fun onPageFinished(view: WebView, url: String?) {
                // P0-1: every editor entry is a navigation boundary. The six apps
                // share one WebView and one history stack; without this, BACK
                // reloaded the PREVIOUS app's index.html whose one-shot PendingOpen
                // was already consumed — reviving it as a blank session. Clearing
                // cross-app history keeps the current page and makes canGoBack()
                // reflect app-internal history only. Same-document navigations do
                // not fire onPageFinished, so future in-app pushState entries (which
                // happen after load) are never cleared.
                if (url != null && url.startsWith("https://appassets.androidplatform.net/assets/web/")) {
                    view.clearHistory()
                }
            }
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

    /**
     * Open an editor. P1-6: if a live session is already loaded (even hidden on
     * the home screen), ask the web layer whether it is dirty and confirm before
     * the hard reload discards it. The web "open" path has confirmDocumentReplace;
     * this is the native-entry equivalent of that gate.
     */
    private fun openApp(app: String) {
        if (webApp != null) {
            // the session may be paused on the home screen; wake it so the probe
            // evaluates against live state instead of a stale/absent answer
            webView.onResume()
            webView.evaluateJavascript(
                "(function(){try{return !!(window.__genofficeIsDirty&&window.__genofficeIsDirty())}catch(e){return false}})()"
            ) { dirty ->
                if (dirty == "true") confirmDiscardThenOpen(app) else doOpenApp(app)
            }
        } else {
            doOpenApp(app)
        }
    }

    /** Native unsaved-changes gate shown before a reload would discard a session. */
    private fun confirmDiscardThenOpen(app: String) {
        // P1-6 / R5: the gate follows the app language (the same setting the
        // editors read), and every button is a localized string — the cancel
        // button must not fall back to the system resource, which surfaced an
        // English "CANCEL" under a Chinese message on non-English locales.
        val s = gateStrings()
        android.app.AlertDialog.Builder(this)
            .setMessage(s.message)
            .setPositiveButton(s.open) { _, _ -> doOpenApp(app) }
            .setNegativeButton(s.cancel) { _, _ ->
                // keep the session intact; if the user came from home, hand them
                // back to the editor they were in rather than a dead end
                if (currentApp == null && webApp != null) resumeEditor()
            }
            .setOnCancelListener {
                if (currentApp == null && webApp != null) resumeEditor()
            }
            .show()
    }

    private data class GateStrings(val message: String, val open: String, val cancel: String)

    /** Localized gate strings keyed by the app language setting (host store). */
    private fun gateStrings(): GateStrings {
        val lang = getSharedPreferences("genoffice-host", android.content.Context.MODE_PRIVATE)
            .getString("language", "zh") ?: "zh"
        return when (lang) {
            "en" -> GateStrings("This document has unsaved changes. Open another file anyway?", "Open", "Cancel")
            "ja" -> GateStrings("このドキュメントには保存されていない変更があります。別のファイルを開きますか？", "開く", "キャンセル")
            "ko" -> GateStrings("이 문서에 저장되지 않은 변경 사항이 있습니다. 다른 파일을 여시겠습니까?", "열기", "취소")
            "fr" -> GateStrings("Ce document contient des modifications non enregistrées. Ouvrir un autre fichier quand même ?", "Ouvrir", "Annuler")
            "de" -> GateStrings("Dieses Dokument hat ungespeicherte Änderungen. Trotzdem eine andere Datei öffnen?", "Öffnen", "Abbrechen")
            "es" -> GateStrings("Este documento tiene cambios sin guardar. ¿Abrir otro archivo de todos modos?", "Abrir", "Cancelar")
            "th" -> GateStrings("เอกสารนี้มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก เปิดไฟล์อื่นต่อไปหรือไม่?", "เปิด", "ยกเลิก")
            "id" -> GateStrings("Dokumen ini punya perubahan yang belum disimpan. Tetap buka file lain?", "Buka", "Batal")
            "ru" -> GateStrings("В этом документе есть несохранённые изменения. Всё равно открыть другой файл?", "Открыть", "Отмена")
            "ar" -> GateStrings("يحتوي هذا المستند على تغييرات غير محفوظة. هل تريد فتح ملف آخر على أي حال؟", "فتح", "إلغاء")
            "pt" -> GateStrings("Este documento tem alterações não salvas. Abrir outro arquivo mesmo assim?", "Abrir", "Cancelar")
            "it" -> GateStrings("Questo documento ha modifiche non salvate. Aprire un altro file comunque?", "Apri", "Annulla")
            "pl" -> GateStrings("Ten dokument ma niezapisane zmiany. Czy mimo to otworzyć inny plik?", "Otwórz", "Anuluj")
            "cs" -> GateStrings("Tento dokument má neuložené změny. Přesto otevřít jiný soubor?", "Otevřít", "Zrušit")
            "nl" -> GateStrings("Dit document heeft niet-opgeslagen wijzigingen. Toch een ander bestand openen?", "Openen", "Annuleren")
            else -> GateStrings("当前文档未保存，仍要打开吗？", "打开", "取消")
        }
    }

    private fun doOpenApp(app: String) {
        currentApp = app
        webApp = app
        home.visibility = View.GONE
        webView.visibility = View.VISIBLE
        webView.onResume()
        webView.loadUrl("https://appassets.androidplatform.net/assets/web/$app/index.html")
    }

    /** Return to a hidden-but-live editor (used when the discard gate is cancelled). */
    private fun resumeEditor() {
        currentApp = webApp
        home.visibility = View.GONE
        webView.visibility = View.VISIBLE
        webView.onResume()
    }

    private fun showHome() {
        currentApp = null
        webView.onPause()
        webView.visibility = View.GONE
        home.visibility = View.VISIBLE
        refreshRecents()
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

    private fun rounded(color: Int, radius: Int, stroke: Int? = null): GradientDrawable = GradientDrawable().apply {
        setColor(color)
        cornerRadius = radius.toFloat()
        if (stroke != null) setStroke(dp(1), stroke)
    }
}
