@echo off
title ShowController - Debug Code Bundler
cd /d "%~dp0"

echo Bundling all source files into project_bundle.txt...

powershell -NoProfile -Command "$root = (Get-Location).Path + '\'; Get-ChildItem -Recurse -File -Include *.bat,*.ps1,*.html,*.css,*.js | Where-Object { $_.FullName -notlike '*\Media\*' } | ForEach-Object { '=== FILE: ' + $_.FullName.Replace($root, '') + ' ==='; Get-Content $_.FullName -Raw; \"`n\" } | Out-File -FilePath 'project_bundle.txt' -Encoding utf8"

echo.
echo [DONE] Created: %~dp0project_bundle.txt
echo.
pause
