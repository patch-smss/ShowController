# ShowController — Local PowerPoint COM & Web Show Deck

A zero-install, modular show controller for Windows. It combines a browser-based cue deck (`control.html` in Microsoft Edge App mode) with a local PowerShell HTTP/COM bridge (`bridge.ps1`) to drive **Microsoft PowerPoint** full-screen on Monitor 2 while playing background audio silently on Monitor 1.

---

## Architecture Overview

1. **Visual Stage (Monitor 2 via PowerPoint COM):**
   - All visual cues (`.pptx`, `.ppt`, images, and videos) are inserted directly into a single master presentation (`Media\_ShowMaster.pptx`) managed by PowerPoint COM (`ps/ppt-com.ps1`).
   - Preserves 100% of native PowerPoint animations, transitions, and media playback while allowing live on-the-fly slide editing on Monitor 1.
   - Imported files are automatically unblocked (`Unblock-File`) so Windows Protected View never interrupts a live cue.
2. **Silent Audio Engine (Monitor 1 via `js/audio-engine.js`):**
   - Audio cues (`.mp3`, `.wav`, `.ogg`, `.m4a`) play through a hidden `<audio>` element inside `control.html` with smooth 1.5-second fade-in and fade-out, allowing background music to continue seamlessly across slides without VBA macros.
3. **Drop-In Plugin System (`plugins/`):**
   - `control.html` and `js/app.js` are frozen core files.
   - `bridge.ps1` automatically loads every `ps/*.ps1` backend script and scans `plugins/<zone>/*.js` at startup.
   - Numbered prefixes (`01-`, `02-`, ...) control top-to-bottom button order; unnumbered `.js` files load at the bottom.

---

## Folder Structure

```text
ShowController\
├── Start_Show.bat              # Extends displays, starts bridge.ps1, opens Control Deck
├── Stop_Show.bat               # Emergency stop: closes bridge/Edge and restores mirrored display
├── Setup_Wifi_Remote.bat       # One-time Admin firewall & URL ACL setup for phone remote
├── Bundle_for_Debug.bat        # Bundles source files into project_bundle.txt
├── bridge.ps1                  # Local HTTP server (port 8765) & plugin/API router
├── control.html                # Frozen core Control Deck UI shell
├── remote.html                 # Mobile Wi-Fi remote web interface
├── style.css                   # Control Deck styling
├── js\
│   ├── app.js                  # Frozen plugin host, event bus & cue orchestrator
│   ├── store.js                # Reactive cue list state
│   ├── media.js                # Media detection & upload/insert helper
│   └── audio-engine.js         # Monitor 1 hidden audio player with fade-in/out
├── ps\
│   ├── screens.ps1             # Monitor detection, network IP & window focus APIs
│   ├── media-api.ps1           # File upload (with Unblock-File) & temp cleanup APIs
│   ├── ppt-com.ps1             # PowerPoint COM master deck, slide insert, nav & save/load
│   └── remote-api.ps1          # Phone remote command queue & polling APIs
├── plugins\
│   ├── slot-header-actions\    # Save, Load, Clear buttons
│   ├── slot-cue-top\           # Now Live / Next Up strip & Drag-and-Drop zone
│   ├── slot-toolbar\           # + Browse Media & + PowerPoint buttons
│   ├── slot-cue-panel\         # Paste Link bar & interactive Cue List
│   └── slot-stage-panel\       # Next/Prev, Stage Focus, Freeze, Blackout/Panic, Intermission, Audio & Remote
└── Media\                      # Working folder for imported media, _ShowMaster.pptx & saved decks
```

---

## Quick Start

1. **First-Time Wi-Fi Remote Setup (Optional):**
   - Right-click `Setup_Wifi_Remote.bat` and **Run as Administrator** once to allow phone access on port `8765`.
2. **Start a Show:**
   - Double-click **`Start_Show.bat`**. Windows will extend your displays, launch the background PowerShell bridge, and open the **Show Control Deck**.
3. **Build Your Cue List:**
   - Drag and drop or browse **Images, Videos, Audio, or `.pptx` files**, or paste **YouTube / Canva** links.
   - Visual files append immediately into `_ShowMaster.pptx` so clicking **Go** jumps straight to the slide with zero delay.
4. **Live Show Controls & Shortcuts:**
   - `Space` / `Right Arrow` / `PageDown`: Next Cue
   - `Left Arrow` / `PageUp`: Previous Cue
   - `B` or `.`: Toggle PowerPoint Blackout
   - `I`: Toggle Intermission
   - `F`: Freeze live slide (duplicates current slide so you can edit the original safely; press `F` again to apply & clean up)
   - `P`: Initialize / Focus PowerPoint Stage on Monitor 2
   - `W`: Return focus from external browser tab
5. **Save, Recall & End Show:**
   - Click **Save** in the header to export both your `.json` cue list and a backup `.pptx` copy of the Master Deck; click **Load** to recall them anytime.
   - Click **End Show & Exit** to optionally save `_ShowMaster.pptx`, close PowerPoint cleanly, and restore your mirrored desktop (`DisplaySwitch.exe /clone`).
