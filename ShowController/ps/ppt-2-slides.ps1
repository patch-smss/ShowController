# Slide insertion for .pptx, images, videos, and hidden intermission slide

function Insert-MediaSlide($pres, $fullPath, $kind) {
    $idx = $pres.Slides.Count + 1
    $sl = $pres.Slides.Add($idx, 12)
    $sl.FollowMasterBackground = 0; $sl.Background.Fill.Solid(); $sl.Background.Fill.ForeColor.RGB = 0
    $sw = $pres.PageSetup.SlideWidth; $sh = $pres.PageSetup.SlideHeight
    $cfg = if (Get-Command Get-ShowSettings -ErrorAction SilentlyContinue) { Get-ShowSettings } else { @{ imageFit = "contain" } }

    if ($kind -eq "image") {
        $shp = $sl.Shapes.AddPicture($fullPath, 0, -1, 0, 0)
        $shp.LockAspectRatio = -1
        $scale = if ($cfg.imageFit -eq "cover") { [Math]::Max($sw / $shp.Width, $sh / $shp.Height) } else { [Math]::Min($sw / $shp.Width, $sh / $shp.Height) }
        $shp.Width = $shp.Width * $scale
        $shp.Left = ($sw - $shp.Width) / 2; $shp.Top = ($sh - $shp.Height) / 2
    } elseif ($kind -eq "video") {
        $shp = $sl.Shapes.AddMediaObject2($fullPath, 0, -1, 0, 0, $sw, $sh)
        $shp.AnimationSettings.PlaySettings.PlayOnEntry = -1
        $shp.AnimationSettings.PlaySettings.PauseAnimation = 0
        $shp.AnimationSettings.PlaySettings.HideWhileNotPlaying = -1
    }
    return $idx
}

function Ensure-IntermissionSlide($pres, $mediaDir, $imgFile) {
    if ($script:intermissionSlide -gt 0 -and $script:intermissionSlide -le $pres.Slides.Count) {
        $sl = $pres.Slides.Item($script:intermissionSlide)
        $sl.SlideShowTransition.Hidden = -1
        if (-not $imgFile) { return $script:intermissionSlide }
        while ($sl.Shapes.Count -gt 0) { $sl.Shapes.Item(1).Delete() }
    } else {
        $idx = $pres.Slides.Count + 1
        $sl = $pres.Slides.Add($idx, 12)
        $sl.SlideShowTransition.Hidden = -1
        $script:intermissionSlide = $idx
    }
    $sl.FollowMasterBackground = 0; $sl.Background.Fill.Solid(); $sl.Background.Fill.ForeColor.RGB = 0
    $sw = $pres.PageSetup.SlideWidth; $sh = $pres.PageSetup.SlideHeight
    if ($imgFile) {
        $full = Join-Path $mediaDir ($imgFile.Replace('/', '\').TrimStart('\'))
        if (Test-Path $full) {
            $shp = $sl.Shapes.AddPicture($full, 0, -1, 0, 0)
            $shp.LockAspectRatio = -1
            $scale = [Math]::Min($sw / $shp.Width, $sh / $shp.Height)
            $shp.Width = $shp.Width * $scale
            $shp.Left = ($sw - $shp.Width) / 2; $shp.Top = ($sh - $shp.Height) / 2
            return $script:intermissionSlide
        }
    }
    $tb = $sl.Shapes.AddTextbox(1, 0, ($sh / 2) - 40, $sw, 80)
    $tb.TextFrame.TextRange.Text = "INTERMISSION"
    $tb.TextFrame.TextRange.Font.Size = 44
    $tb.TextFrame.TextRange.Font.Color.RGB = 0x888888
    $tb.TextFrame.TextRange.ParagraphFormat.Alignment = 2
    return $script:intermissionSlide
}

function Handle-PptSlidesApi($rawPath, $req, $res, $mediaDir) {
    if ($rawPath -eq "/api/ppt/insert" -and $req.HttpMethod -eq "POST") {
        try {
            $body = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd() | ConvertFrom-Json
            $pres = Ensure-MasterPresentation $mediaDir
            $rel = $body.file.Replace('/', '\').TrimStart('\')
            $full = Join-Path $mediaDir $rel
            if ($rel.Contains("..") -or -not (Test-Path $full)) { throw "File not found: $rel" }
            $startIdx = $pres.Slides.Count + 1
            if ($body.kind -eq "ppt") { $added = $pres.Slides.InsertFromFile($full, $pres.Slides.Count, 1, -1); $endIdx = $startIdx + $added - 1 }
            else { $endIdx = Insert-MediaSlide $pres $full $body.kind }
            Send-Json $res @{ ok = $true; startSlide = $startIdx; endSlide = $endIdx; total = $pres.Slides.Count }
        } catch { $res.StatusCode = 500; Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    if ($rawPath -eq "/api/ppt/intermission" -and $req.HttpMethod -eq "POST") {
        try {
            $body = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd() | ConvertFrom-Json
            $pres = Ensure-MasterPresentation $mediaDir
            $slideIdx = Ensure-IntermissionSlide $pres $mediaDir $body.file
            if ($body.show) {
                $ssWin = Start-StageSlideShow $pres
                $ssWin.View.State = 1
                $ssWin.View.GotoSlide($slideIdx)
            }
            Send-Json $res @{ ok = $true; slide = $slideIdx }
        } catch { $res.StatusCode = 500; Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    return $false
}
