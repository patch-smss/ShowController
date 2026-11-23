========================================================================
SHOWCONTROLLER - LOCAL POWERPOINT COM & WEB SHOW DECK
========================================================================

OVERVIEW
--------
ShowController is a modular, zero-install Windows show controller that pairs a
browser-based Control Deck (control.html in Microsoft Edge App mode) with a
local PowerShell HTTP/COM bridge (bridge.ps1) on port 8765.

- VISUAL STAGE (Monitor 2 via PowerPoint COM):
  All .pptx, .ppt, image, and video cues are inserted directly into a single
  master presentation (Media\_ShowMaster.pptx) inside Microsoft PowerPoint.
  This preserves native PowerPoint animations/transitions, allows live slide
  editing on Monitor 1, and automatically unblocks imported files so Protected
  View never interrupts a show.

- SILENT AUDIO ENGINE (Monitor 1):
  Audio cues (.mp3, .wav, .ogg, .m4a) play silently inside control.html via a
  hidden <audio> player with 1.5s fade-in and fade-out, continuing smoothly
  across slide changes without needing VBA macros.

- DROP-IN PLUGINS (plugins\):
  control.html and js\app.js are frozen core files. Any .js file placed inside
  plugins\<zone>\ is auto-loaded at startup (sorted alphabetically; 01-, 02-
  prefixes control top-to-bottom order).

QUICK START
-----------
1. (Optional, one-time) Run Setup_Wifi_Remote.bat as Administrator to allow
   Wi-Fi phone remote connections on TCP port 8765.
2. Double-click Start_Show.bat to extend displays, launch bridge.ps1, and
   open the Control Deck.
3. Add cues via Drag & Drop, + Browse Media, + PowerPoint, or Paste Link.
   Visuals append immediately into _ShowMaster.pptx so "Go" is instant.
4. Click "Save" to save your .json cue list + Master .pptx deck, or "Load"
   to recall a saved show for live editing and playback.
5. Click "End Show & Exit" to optionally save the Master .pptx, close
   PowerPoint cleanly, and restore mirrored displays. (Use Stop_Show.bat if
   you ever need an emergency force-close.)

KEYBOARD SHORTCUTS
------------------
  Space / Right / PageDown  : Next Cue
  Left / PageUp             : Previous Cue
  B or .                    : Toggle Blackout
  I                         : Toggle Intermission
  F                         : Freeze Live Slide (edit safely, press F again to update)
  P                         : Launch / Focus PowerPoint Stage on Monitor 2
  W                         : Refocus Browser Window
========================================================================
