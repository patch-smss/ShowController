========================================================================
SHOWCONTROLLER — 本地 POWERPOINT COM 與網頁舞台控台
========================================================================

系統簡介
--------
ShowController 是一套免安裝、模組化的 Windows 現場演出控台系統，結合瀏覽器
操作介面（以 Microsoft Edge App 模式執行的 control.html）與本地 PowerShell
HTTP/COM 橋接伺服器（bridge.ps1，使用 Port 8765）。

- 視覺輸出舞台（第二螢幕，透過 PowerPoint COM 控制）：
  所有 .pptx、.ppt、圖片與影片素材皆會直接插入至單一主簡報檔
  （Media\_ShowMaster.pptx）中，由 Microsoft PowerPoint 統一播放。完整保留
  原生動畫與轉場效果，支援演出中即時修改投影片，並自動解除檔案封鎖以防止
  「受保護的檢視」警告中斷現場畫面。

- 靜默音訊引擎（主螢幕）：
  所有音訊素材（.mp3、.wav、.ogg、.m4a）皆透過 control.html 內的隱藏
  <audio> 播放器播放，支援 1.5 秒平滑淡入與淡出，無需 VBA 巨集即可跨投影片
  持續播放背景音樂。

- 隨插即用外掛系統（plugins\）：
  control.html 與 js\app.js 為凍結的核心檔案。任何放入 plugins\<區域>\
  的 .js 檔案皆會在啟動時自動載入（依檔名字母順序排列；01-、02- 等數字
  前綴可控制按鈕由上而下的顯示順序）。

快速上手步驟
------------
1. （首次使用選用）以系統管理員身分執行 Setup_Wifi_Remote.bat，開放 TCP
   8765 埠以啟用手機 Wi-Fi 遙控功能。
2. 雙擊執行 Start_Show.bat，自動切換延伸螢幕、啟動 bridge.ps1 並開啟控台。
3. 透過拖放檔案、+ Browse Media、+ PowerPoint 或貼上連結加入 Cue。視覺
   素材加入時即會立即寫入 _ShowMaster.pptx，確保按下「Go」時即時切換。
4. 點擊「Save」可儲存 .json 清單與主簡報 .pptx；點擊「Load」可隨時載入
   既有演出進行即時編輯與播放。
5. 點擊「End Show & Exit」可選擇儲存主簡報 .pptx、安全關閉 PowerPoint 並
   恢復雙螢幕同步顯示（若需緊急強制關閉，請執行 Stop_Show.bat）。

常用鍵盤快捷鍵
--------------
  Space / 右方向鍵 / PageDown : 下一則 Cue
  左方向鍵 / PageUp           : 上一則 Cue
  B 或 .                      : 切換畫面全黑（Blackout）
  I                           : 切換中場休息（Intermission）
  F                           : 凍結現場畫面（安全修改投影片，再按 F 套用）
  P                           : 啟動或聚焦第二螢幕 PowerPoint 舞台
  W                           : 重新聚焦瀏覽器視窗
========================================================================
