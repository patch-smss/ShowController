# Live slideshow sync and COM navigation (next, prev, goto, blackout, freeze)

function Handle-PptNavApi($rawPath, $req, $res, $mediaDir) {
    if ($rawPath -eq "/api/ppt/sync") {
        try {
            $app = Get-PptApp; $pres = Ensure-MasterPresentation $mediaDir; $list = @()
            for ($i = 1; $i -le $pres.Slides.Count; $i++) {
                $sl = $pres.Slides.Item($i)
                $title = if ($i -eq 1) { "Stage Blackout (Slide 1)" } elseif ($sl.Shapes.HasTitle -eq -1) { $sl.Shapes.Title.TextFrame.TextRange.Text } else { "Slide $i" }
                $list += @{ index = $i; title = $title.Trim(); hidden = ($sl.SlideShowTransition.Hidden -eq -1) }
            }
            $hasWin = ($app.SlideShowWindows.Count -gt 0)
            Send-Json $res @{
                ok = $true; frozen = ($script:frozenTempSlide -gt 0); slides = $list
                current = if ($hasWin) { $app.SlideShowWindows.Item(1).View.CurrentShowPosition } else { 0 }
                state = if ($hasWin) { [int]$app.SlideShowWindows.Item(1).View.State } else { 0 }
            }
        } catch { Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    if ($rawPath -eq "/api/ppt/nav" -and $req.HttpMethod -eq "POST") {
        try {
            $body = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd() | ConvertFrom-Json
            $pres = Ensure-MasterPresentation $mediaDir; $ssWin = Start-StageSlideShow $pres; $view = $ssWin.View
            switch ($body.action) {
                "focus"    { $ssWin.Activate() }
                "next"     { $view.State = 1; $view.Next() }
                "prev"     { $view.State = 1; $view.Previous() }
                "goto"     { $view.State = 1; $view.GotoSlide([int]$body.slide) }
                "blackout" { $view.State = if ($body.active) { 3 } else { 1 } }
                "freeze"   {
                    if ($body.active -and $script:frozenTempSlide -eq 0) {
                        $dup = $pres.Slides.Item($view.CurrentShowPosition).Duplicate()
                        $script:frozenTempSlide = $dup.SlideIndex; $view.GotoSlide($script:frozenTempSlide)
                    } elseif (-not $body.active -and $script:frozenTempSlide -gt 0) {
                        $view.GotoSlide([Math]::Max(1, $script:frozenTempSlide - 1))
                        $pres.Slides.Item($script:frozenTempSlide).Delete(); $script:frozenTempSlide = 0
                    }
                }
            }
            Send-Json $res @{ ok = $true; current = $view.CurrentShowPosition; state = [int]$view.State; frozen = ($script:frozenTempSlide -gt 0) }
        } catch { $res.StatusCode = 500; Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    return $false
}
