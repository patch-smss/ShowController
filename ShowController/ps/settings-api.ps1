$script:settingsPath = Join-Path $PSScriptRoot "..\settings.json"

function Get-ShowSettings {
    $defaults = @{
        fadeMs = 1500
        stopAudioOnVideo = $false
        aspectRatio = "16:9"
        imageFit = "contain"
        confirmPrompts = $true
        remotePin = ""
        hotkeys = @{ next = 34; prev = 33; blackout = 190 }
    }
    if (Test-Path $script:settingsPath) {
        try {
            $saved = Get-Content $script:settingsPath -Raw | ConvertFrom-Json
            foreach ($k in @("fadeMs","stopAudioOnVideo","aspectRatio","imageFit","confirmPrompts","remotePin")) {
                if ($null -ne $saved.$k) { $defaults[$k] = $saved.$k }
            }
            if ($null -ne $saved.hotkeys) {
                $defaults.hotkeys = @{
                    next = [int]$saved.hotkeys.next
                    prev = [int]$saved.hotkeys.prev
                    blackout = [int]$saved.hotkeys.blackout
                }
            }
        } catch {}
    }
    return $defaults
}

function Handle-SettingsApi($rawPath, $req, $res) {
    if ($rawPath -eq "/api/settings") {
        if ($req.HttpMethod -eq "POST") {
            $raw = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd()
            $obj = $raw | ConvertFrom-Json
            $obj | ConvertTo-Json -Depth 4 | Out-File -FilePath $script:settingsPath -Encoding utf8
            if ($null -ne $obj.hotkeys -and [Type]::GetType("GlobalHotkeyHost")) {
                try { [GlobalHotkeyHost]::Rebind([uint32]$obj.hotkeys.next, [uint32]$obj.hotkeys.prev, [uint32]$obj.hotkeys.blackout) } catch {}
            }
            Send-Json $res @{ ok = $true }
            return $true
        }
        Send-Json $res (Get-ShowSettings)
        return $true
    }
    return $false
}
