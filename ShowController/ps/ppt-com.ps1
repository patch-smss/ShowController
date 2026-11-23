$script:pptApp = $null
$script:masterPres = $null

function Get-PptApp {
    if ($null -ne $script:pptApp) {
        try { $null = $script:pptApp.Version; return $script:pptApp } catch { $script:pptApp = $null }
    }
    try {
        $script:pptApp = [Runtime.InteropServices.Marshal]::GetActiveObject("PowerPoint.Application")
    } catch {
        $script:pptApp = New-Object -ComObject PowerPoint.Application
    }
    $script:pptApp.Visible = -1 # msoTrue
    return $script:pptApp
}

function Ensure-MasterPresentation($mediaDir) {
    $app = Get-PptApp
    $masterPath = Join-Path $mediaDir "_ShowMaster.pptx"

    if ($null -ne $script:masterPres) {
        try { $null = $script:masterPres.Slides.Count; return $script:masterPres } catch { $script:masterPres = $null }
    }

    foreach ($p in $app.Presentations) {
        if ($p.FullName -eq $masterPath) { $script:masterPres = $p; break }
    }

    if ($null -eq $script:masterPres) {
        $script:masterPres = $app.Presentations.Add(-1) # msoTrue
        $script:masterPres.PageSetup.SlideSize = 16 # ppSlideSizeOnScreen16x9
        # Slide 1: Default Blackout/Idle Slide (ppLayoutBlank = 12)
        $s1 = $script:masterPres.Slides.Add(1, 12)
        $s1.FollowMasterBackground = 0 # msoFalse
        $s1.Background.Fill.Solid()
        $s1.Background.Fill.ForeColor.RGB = 0
        $script:masterPres.SaveAs($masterPath)
    }
    return $script:masterPres
}

function Start-StageSlideShow($pres) {
    $app = Get-PptApp
    $sec = [System.Windows.Forms.Screen]::AllScreens | Where-Object { -not $_.Primary } | Select-Object -First 1

    if ($app.SlideShowWindows.Count -eq 0) {
        $pres.SlideShowSettings.ShowType = 1 # ppShowTypeSpeaker
        $pres.SlideShowSettings.LoopUntilStopped = 0 # msoFalse
        $pres.SlideShowSettings.ShowWithNarration = -1 # msoTrue
        $pres.SlideShowSettings.ShowWithAnimation = -1 # msoTrue
        $ssWin = $pres.SlideShowSettings.Run()
    } else {
        $ssWin = $app.SlideShowWindows.Item(1)
    }

    if ($sec -and $ssWin) {
        # PowerPoint SlideShowWindow uses Points (1 px = 0.75 pt at 96 DPI)
        $ssWin.Left   = [float]($sec.Bounds.X * 0.75)
        $ssWin.Top    = [float]($sec.Bounds.Y * 0.75)
        $ssWin.Width  = [float]($sec.Bounds.Width * 0.75)
        $ssWin.Height = [float]($sec.Bounds.Height * 0.75)
    }
    return $ssWin
}

function Handle-PptComApi($rawPath, $req, $res, $mediaDir) {
    if ($rawPath -eq "/api/ppt/init" -and $req.HttpMethod -eq "POST") {
        try {
            $pres = Ensure-MasterPresentation $mediaDir
            $ssWin = Start-StageSlideShow $pres
            Send-Json $res @{
                ok = $true
                slides = $pres.Slides.Count
                current = if ($ssWin) { $ssWin.View.CurrentShowPosition } else { 1 }
            }
        } catch {
            $res.StatusCode = 500
            Send-Json $res @{ ok = $false; error = $_.Exception.Message }
        }
        return $true
    }

    if ($rawPath -eq "/api/ppt/status") {
        try {
            $app = Get-PptApp
            $pres = Ensure-MasterPresentation $mediaDir
            $pos = if ($app.SlideShowWindows.Count -gt 0) { $app.SlideShowWindows.Item(1).View.CurrentShowPosition } else { 0 }
            Send-Json $res @{ ok = $true; slides = $pres.Slides.Count; current = $pos }
        } catch {
            Send-Json $res @{ ok = $false; error = $_.Exception.Message }
        }
        return $true
    }

    return $false
}
