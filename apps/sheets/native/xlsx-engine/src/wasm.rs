//! WebAssembly entry points: a JavaScript host drives the engine one request
//! line at a time through linear memory, instead of handing the binary a stdin.
//!
//! The protocol is identical to the native sidecar's JSON-lines protocol
//! (see `protocol.rs` and `apps/sheets/src/main/xlsx-sidecar-client.ts`): one
//! request in, one response out. Sessions live in a process-wide `Engine`, so
//! a `sessionId` returned by `open` stays valid across calls until `close`.
//!
//! Buffer conventions:
//! - `sidecar_alloc` / `sidecar_dealloc` move request bytes into wasm memory.
//! - `sidecar_handle_line` returns a buffer prefixed with a 4-byte
//!   little-endian length; the caller reads it and frees it with
//!   `sidecar_free_response`.
//!
//! This module only compiles for wasm targets; desktop builds are unaffected.

use std::alloc::{alloc, dealloc, Layout};
use std::sync::Mutex;

use crate::protocol::Engine;

static ENGINE: Mutex<Option<Engine>> = Mutex::new(None);

fn layout(len: usize) -> Layout {
    // A zero-length request still needs a valid (dangling-free) allocation.
    Layout::from_size_align(len.max(1), 1).expect("sidecar buffer layout")
}

/// Allocate `len` bytes the JS side may write a request into.
#[unsafe(no_mangle)]
pub extern "C" fn sidecar_alloc(len: usize) -> *mut u8 {
    unsafe { alloc(layout(len)) }
}

/// Free a buffer obtained from `sidecar_alloc`.
#[unsafe(no_mangle)]
pub extern "C" fn sidecar_dealloc(ptr: *mut u8, len: usize) {
    if ptr.is_null() {
        return;
    }
    unsafe { dealloc(ptr, layout(len)) }
}

/// Handle one JSON request line. Returns a length-prefixed response buffer,
/// or null when the response is empty (never for a well-formed call: even
/// invalid JSON produces an `invalid_json` failure response).
#[unsafe(no_mangle)]
pub extern "C" fn sidecar_handle_line(ptr: *const u8, len: usize) -> *mut u8 {
    let line = if ptr.is_null() || len == 0 {
        ""
    } else {
        match std::str::from_utf8(unsafe { std::slice::from_raw_parts(ptr, len) }) {
            Ok(line) => line,
            Err(_) => "",
        }
    };
    let mut guard = match ENGINE.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    let engine = guard.get_or_insert_with(Engine::new);
    let response = engine.handle_line(line).unwrap_or_default();
    let bytes = response.as_bytes();
    let out = unsafe { alloc(layout(bytes.len() + 4)) };
    if out.is_null() {
        return std::ptr::null_mut();
    }
    unsafe {
        std::ptr::copy_nonoverlapping((bytes.len() as u32).to_le_bytes().as_ptr(), out, 4);
        std::ptr::copy_nonoverlapping(bytes.as_ptr(), out.add(4), bytes.len());
    }
    out
}

/// Free a response buffer returned by `sidecar_handle_line`.
#[unsafe(no_mangle)]
pub extern "C" fn sidecar_free_response(ptr: *mut u8) {
    if ptr.is_null() {
        return;
    }
    let len = unsafe {
        u32::from_le_bytes(
            std::slice::from_raw_parts(ptr, 4)
                .try_into()
                .expect("response length prefix"),
        )
    } as usize;
    unsafe { dealloc(ptr, layout(len + 4)) }
}

/// Drop every session and start fresh (host restart, tests).
#[unsafe(no_mangle)]
pub extern "C" fn sidecar_reset() {
    let mut guard = match ENGINE.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    *guard = None;
}
