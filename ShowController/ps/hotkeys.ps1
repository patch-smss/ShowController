#OS-level global presentation clicker hotkeys via Win32 RegisterHotKey

Add-Type -AssemblyName System.Windows.Forms
Add-Type -ReferencedAssemblies System.Windows.Forms @"
using System;
using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

public class GlobalHotkeyHost {
    [DllImport("user32.dll")] public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);
    [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    private class MsgWin : NativeWindow {
        public Action<int> OnHotkey;
        public MsgWin() { CreateHandle(new CreateParams()); }
        protected override void WndProc(ref Message m) {
            if (m.Msg == 0x0312 && OnHotkey != null) OnHotkey(m.WParam.ToInt32());
            base.WndProc(ref m);
        }
    }

    public static ConcurrentQueue<string> Queue = new ConcurrentQueue<string>();
    private static Thread _thread;
    private static MsgWin _win;
    private static bool _active = false;
    public static uint VkNext = 0x22, VkPrev = 0x21, VkBlack = 0xBE;

    public static void Rebind(uint nextVk, uint prevVk, uint blackVk) {
        VkNext = nextVk; VkPrev = prevVk; VkBlack = blackVk;
        if (_active) { SetEnabled(false); Thread.Sleep(50); SetEnabled(true); }
    }

    public static void SetEnabled(bool enable) {
        if (enable && !_active) {
            _active = true;
            _thread = new Thread(() => {
                _win = new MsgWin();
                _win.OnHotkey = (id) => {
                    if (id == 1 || id == 3) Queue.Enqueue("NEXT");
                    if (id == 2 || id == 4) Queue.Enqueue("PREV");
                    if (id == 5) Queue.Enqueue("BLACKOUT");
                };
                RegisterHotKey(_win.Handle, 1, 0, VkNext);
                RegisterHotKey(_win.Handle, 2, 0, VkPrev);
                RegisterHotKey(_win.Handle, 3, 0, 0x27);
                RegisterHotKey(_win.Handle, 4, 0, 0x25);
                RegisterHotKey(_win.Handle, 5, 0, VkBlack);
                Application.Run();
            });
            _thread.SetApartmentState(ApartmentState.STA);
            _thread.IsBackground = true;
            _thread.Start();
        } else if (!enable && _active) {
            _active = false;
            if (_win != null) {
                for (int i = 1; i <= 5; i++) UnregisterHotKey(_win.Handle, i);
                _win.DestroyHandle();
                _win = null;
            }
            Application.ExitThread();
        }
    }
}
"@

$script:hotkeysEnabled = $true
try {
    if (Get-Command Get-ShowSettings -ErrorAction SilentlyContinue) {
        $cfg = Get-ShowSettings
        [GlobalHotkeyHost]::Rebind([uint32]$cfg.hotkeys.next, [uint32]$cfg.hotkeys.prev, [uint32]$cfg.hotkeys.blackout)
    } else {
        [GlobalHotkeyHost]::SetEnabled($true)
    }
} catch {}

function Handle-HotkeysApi($rawPath, $req, $res) {
    if ($rawPath -eq "/api/hotkeys/poll") {
        $items = @(); $val = $null
        while ([GlobalHotkeyHost]::Queue.TryDequeue([ref]$val)) { $items += $val }
        $json = if ($items.Count -eq 0) { "[]" } else { ConvertTo-Json -InputObject @($items) -Compress }
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $res.ContentType = "application/json; charset=utf-8"
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
        return $true
    }

    if ($rawPath -eq "/api/hotkeys/toggle" -and $req.HttpMethod -eq "POST") {
        $body = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd() | ConvertFrom-Json
        $script:hotkeysEnabled = [bool]$body.enabled
        try { [GlobalHotkeyHost]::SetEnabled($script:hotkeysEnabled) } catch {}
        Send-Json $res @{ ok = $true; enabled = $script:hotkeysEnabled }
        return $true
    }

    return $false
}
