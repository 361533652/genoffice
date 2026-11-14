/**
 * GenOffice Android host injection (document-start).
 *
 * Runs before any app script on the asset origin. It provides:
 *  1. the native call plumbing (GenOfficeNative.post / __genofficeNativeResolve)
 *  2. __genofficeHost — the Host facade resolveHost() picks up first
 *  3. __genofficeSheetsWasmUrl — the xlsx engine asset, so the sheets renderer
 *     installs the wasm workbook session at boot
 *  4. long-press → contextmenu synthesis (Android WebView does not fire
 *     contextmenu on long-press by default; the editors' 159 handlers need it)
 *  5. blob: download interception — the no-picker save fallback creates
 *     <a download href=blob:...>, which WebView's DownloadListener never sees;
 *     route it through SAF instead
 *
 * This file is the hand-written bootstrap. Keep it dependency-free: it runs
 * before the app bundles load.
 */
(function () {
  'use strict';

  // ---- 1. native plumbing --------------------------------------------------
  var pending = new Map();
  var counter = 0;

  function nativeCall(method, params) {
    return new Promise(function (resolve, reject) {
      var id = 'n' + (++counter);
      pending.set(id, { resolve: resolve, reject: reject });
      try {
        GenOfficeNative.post(JSON.stringify({ id: id, method: method, params: params || {} }));
      } catch (e) {
        pending.delete(id);
        reject(e);
      }
    });
  }

  window.__genofficeNativeResolve = function (id, json) {
    var entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    var msg;
    try { msg = JSON.parse(json); } catch (e) { entry.reject(e); return; }
    if (msg && msg.ok === false) entry.reject(new Error(msg.error || 'host call failed'));
    else entry.resolve(msg ? msg.result : undefined);
  };

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function bytesToB64(bytes) {
    var bin = '';
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  // ---- 2. the Host facade ---------------------------------------------------
  var ACCEPT = {
    docx: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: '.xlsx,.xlsm,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
    pdf: '.pdf,application/pdf',
    markdown: '.md,.markdown,text/markdown',
    html: '.html,.htm,text/html'
  };

  function pickFile(kind) {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      if (kind && ACCEPT[kind]) input.accept = ACCEPT[kind];
      input.style.display = 'none';
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        input.remove();
        if (!file) { resolve({ ok: false, reason: 'canceled' }); return; }
        file.arrayBuffer().then(function (buf) {
          resolve({
            ok: true,
            handle: { id: 'host/file/' + encodeURIComponent(file.name), name: file.name, writable: false },
            data: new Uint8Array(buf)
          });
        }).catch(function () { resolve({ ok: false, reason: 'error' }); });
      }, { once: true });
      document.body.appendChild(input);
      input.click();
    });
  }

  window.__genofficeHost = {
    kind: 'injected',
    capabilities: {
      openFile: true, saveFile: true, saveInPlace: true,
      print: false, exportPdf: false, ai: false, webSearch: false,
      localPaths: false, tabs: false, zotero: false, projectStore: false, runCli: false
    },
    electron: null,
    language: function () {
      return nativeCall('getSetting', { key: 'language' }).then(function (v) { return v || 'zh'; });
    },
    theme: function () {
      return nativeCall('getSetting', { key: 'theme' }).then(function (v) { return v || 'system'; });
    },
    documentTheme: function () { return Promise.resolve('follow'); },
    authorName: function () {
      return nativeCall('getSetting', { key: 'authorName' }).then(function (v) { return v || ''; });
    },
    onThemeChanged: function () { return function () {}; },
    onDocumentThemeChanged: function () { return function () {}; },
    onLanguageChanged: function () { return function () {}; },
    onAuthorNameChanged: function () { return function () {}; },
    openDocument: function (kind) { return pickFile(kind); },
    saveDocumentAs: function (data, suggestedName) {
      return nativeCall('saveDocumentAs', { data: bytesToB64(data), name: suggestedName })
        .then(function (r) {
          if (!r || !r.handle) return { ok: false, reason: 'canceled' };
          return { ok: true, handle: r.handle, data: data };
        })
        .catch(function () { return { ok: false, reason: 'canceled' }; });
    },
    saveDocumentInPlace: function (handleId, data) {
      return nativeCall('saveInPlace', { handleId: handleId, data: bytesToB64(data) })
        .then(function (r) { return r && r.ok ? { ok: true } : { ok: false, error: (r && r.error) || 'write failed' }; })
        .catch(function (e) { return { ok: false, error: String(e && e.message || e) }; });
    }
  };

  // ---- 3. the sheets wasm engine asset --------------------------------------
  window.__genofficeSheetsWasmUrl =
    'https://appassets.androidplatform.net/assets/wasm/xlsx_sidecar.wasm';

  // ---- 4. long-press → contextmenu ------------------------------------------
  var pressTimer = null;
  var pressOrigin = null;

  function cancelPress() {
    if (pressTimer !== null) { clearTimeout(pressTimer); pressTimer = null; }
    pressOrigin = null;
  }

  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { cancelPress(); return; }
    var t = e.touches[0];
    pressOrigin = { x: t.clientX, y: t.clientY };
    pressTimer = setTimeout(function () {
      if (!pressOrigin) return;
      var el = document.elementFromPoint(pressOrigin.x, pressOrigin.y) || e.target;
      el.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true, cancelable: true, view: window,
        clientX: pressOrigin.x, clientY: pressOrigin.y, button: 2
      }));
      pressOrigin = null;
    }, 600);
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!pressOrigin || !e.touches.length) return;
    var t = e.touches[0];
    if (Math.hypot(t.clientX - pressOrigin.x, t.clientY - pressOrigin.y) > 12) cancelPress();
  }, { passive: true });

  document.addEventListener('touchend', cancelPress, { passive: true });
  document.addEventListener('touchcancel', cancelPress, { passive: true });

  // ---- 5. blob downloads → SAF ----------------------------------------------
  document.addEventListener('click', function (e) {
    var node = e.target;
    var anchor = node && node.closest ? node.closest('a[download]') : null;
    if (!anchor || !anchor.href || anchor.href.indexOf('blob:') !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    var name = anchor.getAttribute('download') || 'document';
    var url = anchor.href;
    fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
      return nativeCall('saveDocumentAs', { data: bytesToB64(new Uint8Array(buf)), name: name });
    }).catch(function (err) {
      console.warn('[genoffice-host] blob save failed:', err);
    });
  }, true);
})();
