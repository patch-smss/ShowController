# ShowController — 本地 PowerPoint COM 與網頁舞台控台

這是一套免安裝、模組化的 Windows 現場演出與活動控台系統。結合瀏覽器操作介面（以 Microsoft Edge App 模式執行的 `control.html`）與本地 PowerShell HTTP/COM 橋接伺服器（`bridge.ps1`），讓您直接以 **Microsoft PowerPoint** 在第二螢幕（投影機／大螢幕）全螢幕輸出畫面，同時在主螢幕靜默播放背景音樂。

---

## 核心架構總覽

1. **視覺輸出舞台（第二螢幕，透過 PowerPoint COM 控制）：**
   - 所有視覺素材（`.pptx`、`.ppt`、圖片與影片）皆會直接插入並整合至單一主簡報檔（`Media\_ShowMaster.pptx`）中，由 PowerPoint COM（`ps/ppt-com.ps1`）統一控制。
   - 完整保留 PowerPoint 原生動畫、轉場效果與影片播放功能，並支援演出期間在主螢幕即時修改投影片內容。
   - 匯入的檔案會自動執行解除封鎖（`Unblock-File`），避免 Windows「受保護的檢視」黃色警告條中斷現場演出。
2. **靜默音訊引擎（主螢幕，透過 `js/audio-engine.js` 控制）：**
   - 所有音訊素材（`.mp3`、`.wav`、`.ogg`、`.m4a`）皆透過 `control.html` 內的隱藏 `<audio>` 播放器播放，具備平滑的 1.5 秒淡入與淡出效果，無需撰寫 VBA 巨集即可跨投影片持續播放背景音樂。
3. **隨插即用外掛系統（`plugins/`）：**
   - `control.html` 與 `js/app.js` 為凍結的核心檔案，無需修改。
   - `bridge.ps1` 啟動時會自動載入 `ps/*.ps1` 後端模組，並掃描 `plugins/<區域>/*.js` 前端外掛。
   - 檔名前方的數字編號（`01-`、`02-`...）決定按鈕由上而下的排列順序；未加編號的 `.js` 檔案則會自動排在最下方。

---

## 資料夾結構

```text
ShowController\
├── Start_Show.bat              # 切換為延伸螢幕、啟動 bridge.ps1 並開啟控台介面
├── Stop_Show.bat               # 緊急停止：強制關閉伺服器與視窗並恢復同步顯示
├── Setup_Wifi_Remote.bat       # 首次使用設定：開啟防火牆與 TCP 8765 埠供手機遙控
├── Bundle_for_Debug.bat        # 將所有程式碼打包為 project_bundle.txt 供除錯使用
├── bridge.ps1                  # 本地 HTTP 伺服器（Port 8765）與外掛／API 路由器
├── control.html                # 凍結的核心控台介面框架
├── remote.html                 # 手機 Wi-Fi 遙控器網頁介面
├── style.css                   # 控台介面樣式表
├── js\
│   ├── app.js                  # 凍結的外掛載入器、事件匯流排與 Cue 排程核心
│   ├── store.js                # 響應式 Cue 清單狀態管理
│   ├── media.js                # 媒體格式偵測與自動上傳／插入輔助模組
│   └── audio-engine.js         # 主螢幕隱藏音訊播放器（支援淡入／淡出）
├── ps\
│   ├── screens.ps1             # 螢幕偵測、區域網路 IP 查詢與視窗聚焦 API
│   ├── media-api.ps1           # 檔案上傳（自動 Unblock-File）與暫存清理 API
│   ├── ppt-com.ps1             # PowerPoint COM 主簡報控制、投影片插入、導覽與存檔／讀取
│   └── remote-api.ps1          # 手機遙控指令佇列與輪詢 API
├── plugins\
│   ├── slot-header-actions\    # 儲存（Save）、讀取（Load）、清空（Clear）按鈕
│   ├── slot-cue-top\           # 目前播出（Now Live）／下一則（Next Up）看板與拖放區
│   ├── slot-toolbar\           # + Browse Media 與 + PowerPoint 匯入按鈕
│   ├── slot-cue-panel\         # 貼上 YouTube/Canva 連結列與互動式 Cue 清單
│   └── slot-stage-panel\       # 上／下一則、舞台聚焦、凍結畫面、全黑／緊急全黑、中場休息、音訊與手機遙控
└── Media\                      # 存放匯入媒體、_ShowMaster.pptx 與已儲存簡報的工作資料夾
```

---

## 快速上手指南

1. **首次設定 Wi-Fi 手機遙控（選用）：**
   - 對 `Setup_Wifi_Remote.bat` 按右鍵選擇 **「以系統管理員身分執行」**（僅需執行一次），即可允許同區網內的手機連線至 `8765` 埠。
2. **啟動演出：**
   - 雙擊執行 **`Start_Show.bat`**。系統會自動將 Windows 切換為「延伸螢幕」，在背景啟動 PowerShell 伺服器，並開啟 **Show Control Deck（演出控台）**。
3. **建立 Cue 播放清單：**
   - 直接拖放或瀏覽加入 **圖片、影片、音訊或 `.pptx` 簡報檔**，亦可貼上 **YouTube / Canva** 網址連結。
   - 所有視覺檔案在加入的瞬間就會立即附加至 `_ShowMaster.pptx` 中，因此正式演出點擊 **Go** 時可零延遲直接跳轉至該投影片。
4. **現場控制與快捷鍵：**
   - `空白鍵（Space）` / `右方向鍵` / `PageDown`：下一則 Cue（Next Cue）
   - `左方向鍵` / `PageUp`：上一則 Cue（Previous Cue）
   - `B` 或 `.`：切換 PowerPoint 畫面全黑（Blackout）
   - `I`：切換中場休息畫面（Intermission）
   - `F`：凍結目前投影片（Freeze — 自動複製當前投影片供投影鎖定，讓您安全修改原投影片；再按一次 `F` 即可套用更新並清除暫存頁）
   - `P`：啟動或聚焦第二螢幕的 PowerPoint 舞台畫面
   - `W`：從外部網頁分頁切換回控台視窗
5. **儲存、載入與結束演出：**
   - 點擊右上角 **Save** 可同時匯出 `.json` Cue 清單與備份一份主簡報 `.pptx`；點擊 **Load** 可隨時載入先前儲存的演出進行現場編輯與播放。
   - 點擊右下角 **End Show & Exit** 可選擇是否儲存 `_ShowMaster.pptx`，並安全關閉 PowerPoint 與恢復雙螢幕「同步顯示（Duplicate）」。
