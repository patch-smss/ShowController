$script:pptApp = $null
$script:masterPres = $null
$script:frozenTempSlide = 0

function Get-PptApp {
    if ($null -ne $script:pptApp) {
        try { $null = $script:pptApp.Version; return $script:pptApp } catch { $script:pptApp = $null }
    }
    try { $script:pptApp = [Runtime.InteropServices.Marshal]::GetActiveObject("PowerPoint.Application") }
    catch { $script:pptApp = New-Object -ComObject PowerPoint.Application }
    $script:pptApp.Visible = -1
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
        $script:masterPres = $app.Presentations.Add(-1)
        $script:masterPres.PageSetup.SlideSize = 16
        $s1 = $script:masterPres.Slides.Add(1, 12)
        $s1.FollowMasterBackground = 0
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
        $pres.SlideShowSettings.ShowType = 1
        $pres.SlideShowSettings.LoopUntilStopped = 0
        $pres.SlideShowSettings.ShowWithNarration = -1
        $pres.SlideShowSettings.ShowWithAnimation = -1
        $ssWin = $pres.SlideShowSettings.Run()
    } else {
        $ssWin = $app.SlideShowWindows.Item(1)
    }
    if ($sec -and $ssWin) {
        $ssWin.Left = [float]($sec.Bounds.X * 0.75); $ssWin.Top = [float]($sec.Bounds.Y * 0.75)
        $ssWin.Width = [float]($sec.Bounds.Width * 0.75); $ssWin.Height = [float]($sec.Bounds.Height * 0.75)
    }
    return $ssWin
}

function Handle-PptComApi($rawPath, $req, $res, $mediaDir) {
    if ($rawPath -eq "/api/ppt/init" -and $req.HttpMethod -eq "POST") {
        try {
            $pres = Ensure-MasterPresentation $mediaDir
            $ssWin = Start-StageSlideShow $pres
            Send-Json $res @{ ok = $true; slides = $pres.Slides.Count; current = if ($ssWin) { $ssWin.View.CurrentShowPosition } else { 1 } }
        } catch { $res.StatusCode = 500; Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    if ($rawPath -eq "/api/ppt/sync") {
        try {
            $app = Get-PptApp
            $pres = Ensure-MasterPresentation $mediaDir
            $list = @()
            for ($i = 1; $i -le $pres.Slides.Count; $i++) {
                $sl = $pres.Slides.Item($i)
                $title = if ($i -eq 1) { "Stage Blackout (Slide 1)" } elseif ($sl.Shapes.HasTitle -eq -1) { $sl.Shapes.Title.TextFrame.TextRange.Text } else { "Slide $i" }
                $list += @{ index = $i; title = $title.Trim(); hidden = ($sl.SlideShowTransition.Hidden -eq -1) }
            }
            $hasWin = ($app.SlideShowWindows.Count -gt 0)
            $pos = if ($hasWin) { $app.SlideShowWindows.Item(1).View.CurrentShowPosition } else { 0 }
            $st  = if ($hasWin) { [int]$app.SlideShowWindows.Item(1).View.State } else { 0 }
            Send-Json $res @{ ok = $true; current = $pos; state = $st; frozen = ($script:frozenTempSlide -gt 0); slides = $list }
        } catch { Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    if ($rawPath -eq "/api/ppt/nav" -and $req.HttpMethod -eq "POST") {
        try {
            $body = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd() | ConvertFrom-Json
            $pres = Ensure-MasterPresentation $mediaDir
            $ssWin = Start-StageSlideShow $pres
            $view = $ssWin.View
            switch ($body.action) {
                "next"     { $view.State = 1; $view.Next() }
                "prev"     { $view.State = 1; $view.Previous() }
                "goto"     { $view.State = 1; $view.GotoSlide([int]$body.slide) }
                "blackout" { $view.State = if ($body.active) { 3 } else { 1 } }
                "freeze"   {
                    if ($body.active -and $script:frozenTempSlide -eq 0) {
                        $cur = $view.CurrentShowPosition
                        $dup = $pres.Slides.Item($cur).Duplicate()
                        $script:frozenTempSlide = $dup.SlideIndex
                        $view.GotoSlide($script:frozenTempSlide)
                    } elseif (-not $body.active -and $script:frozenTempSlide -gt 0) {
                        $target = [Math]::Max(1, $script:frozenTempSlide - 1)
                        $view.GotoSlide($target)
                        $pres.Slides.Item($script:frozenTempSlide).Delete()
                        $script:frozenTempSlide = 0
                    }
                }
            }
            Send-Json $res @{ ok = $true; current = $view.CurrentShowPosition; state = [int]$view.State; frozen = ($script:frozenTempSlide -gt 0) }
        } catch { $res.StatusCode = 500; Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    return $false
}
