[read_me.md](https://github.com/user-attachments/files/34906215/read_me.md)
# ShowController 系統說明文件

**ShowController 是一套專為 Windows 設計的輕量級雙螢幕舞台簡報與影音播放控制系統。** 本系統結合了瀏覽器控制台（`control.html`）、專屬投影輸出視窗（`projector.html`）、Wi-Fi 手機遙控器（`remote.html`），以及本地端 PowerShell HTTP 橋接伺服器（`bridge.ps1`）。

---

## 1. 系統架構與檔案清單

| 檔案名稱 | 功能說明 |
| :--- | :--- |
| **`Start_Show.bat`** | 將 Windows 螢幕切換為「延伸」模式，於背景啟動 `bridge.ps1` 伺服器，並以獨立的 Microsoft Edge 應用程式視窗開啟控制台。 |
| **`Stop_Show.bat`** | 發送關閉指令至後端伺服器、結束所有相關程式，並將 Windows 螢幕恢復為「同步顯示」模式。 |
| **`Setup_Wifi_Remote.bat`** | 初次設定用系統管理員腳本，負責開啟 Windows 防火牆的 TCP 連接埠 `8765` 並註冊區域網路存取權限。 |
| **`bridge.ps1`** | 運行於連接埠 `8765` 的本地端 HTTP 伺服器，負責提供網頁介面、自動化控制 PowerPoint、偵測螢幕座標，以及轉發手機遙控指令。 |
| **`control.html` 與 `style.css`** | 操作員主控介面，用於建立、排序與觸發播放序列（Cue），並提供舞台與音效控制功能。 |
| **`projector.html`** | 全螢幕觀眾投影視窗，負責呈現圖片、影片、PDF、音訊、黑屏、畫面凍結及中場休息畫面。 |
| **`remote.html`** | 專為手機瀏覽器設計的行動遙控介面，透過區域網路 Wi-Fi 連線操作。 |
| **`js/app.js`** | 核心協調模組，負責串接播放清單、投影視窗、鍵盤快捷鍵與各功能子模組。 |
| **`js/store.js`** | 狀態管理模組，負責儲存播放序列資料、渲染清單介面，並透過 `BroadcastChannel` 同步廣播狀態。 |
| **`js/media.js`** | 處理本地圖片、音訊、影片與 PDF 檔案的拖放匯入與檔案總管選取。 |
| **`js/embeds.js`** | 負責將 YouTube 與 Canva 網頁連結加入播放清單。 |
| **`js/ppt.js`** | 負責將 `.ppt/.pptx` 簡報檔案上傳至 `Media/` 資料夾，並控制畫面凍結功能。 |
| **`js/stage.js`** | 管理黑屏（Blackout）、中場休息背景圖、音訊淡入淡出設定、演出結束動作與緊急全黑（Panic）。 |
| **`js/remote.js`** | 產生 Wi-Fi 配對 QR Code，並每 600 毫秒輪詢 `/api/poll` 以接收手機遙控指令。 |
| **`ps/*.ps1`** | 模組化 PowerShell 處理腳本，包含螢幕偵測（`screens.ps1`）、檔案上傳與 PowerPoint 控制（`media-api.ps1`）及遙控指令佇列（`remote-api.ps1`）。 |

---

## 2. 安裝設定與日常操作流程

### 初次 Wi-Fi 遙控設定（選用）
1. 對 **`Setup_Wifi_Remote.bat`** 點擊滑鼠右鍵，選擇 **「以系統管理員身分執行」**（或直接雙擊並允許 UAC 權限提示）。
2. 待畫面顯示 `[SUCCESS]`，即表示連接埠 `8765` 已成功於區域網路開放。

### 啟動演出系統
1. 連接外接投影機或第二螢幕。
2. 雙擊 **`Start_Show.bat`**。Windows 會自動將顯示器切換為延伸模式，並在主螢幕開啟 **Show Control Deck（控制台）**。
3. 點擊 **Open / Focus Projector**（或按快捷鍵 `P`），將 **Projector Output（投影輸出視窗）** 開啟於第二螢幕。
4. 在投影輸出視窗右上角點擊 **Go Fullscreen (F11)**。進入全螢幕後會自動隱藏滑鼠游標，並解除瀏覽器對影片與音訊自動播放的限制。

### 結束演出系統
* 點擊控制台右下角的 **End Show & Exit**（或執行 **`Stop_Show.bat`**）。系統將自動關閉 PowerPoint、清除暫存的簡報複本、關閉本地伺服器，並將 Windows 螢幕恢復為同步顯示模式。

---

## 3. 支援的媒體格式與播放行為

| 媒體類型 | 支援格式 / 輸入方式 | 播放行為說明 |
| :--- | :--- | :--- |
| **圖片** | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg` | 自動依比例縮放以完整適應投影螢幕（`object-fit: contain`）。 |
| **影片** | `.mp4`, `.mov`, `.webm` | 全螢幕播放；播放完畢時，控制面板的 **Now Live** 狀態會自動標示為 `(Finished)`。 |
| **音訊** | `.mp3`, `.wav`, `.ogg`, `.m4a` | 於背景播放，支援 1.5 秒平滑淡入／淡出。切換視覺媒體（如圖片或影片）時背景音樂會持續播放，直到手動停止或觸發下一首音訊為止。 |
| **PDF 文件** | `.pdf` | 以無工具列的乾淨全螢幕檢視器開啟並自動調整頁面大小。 |
| **PowerPoint** | `.ppt`, `.pptx`（透過 **+ PowerPoint** 按鈕匯入） | 自動將網頁投影幕切換為黑屏，並直接以原生 Microsoft PowerPoint 全螢幕放映模式（`/S`）啟動簡報；切換至其他非 PPT 項目時會自動關閉 PowerPoint。 |
| **網頁連結** | YouTube 或 Canva 網址 | 於瀏覽器分頁中開啟。建議演出前先點擊 **Pre-load** 預先載入分頁以跳過廣告並準備畫面，切換後按 `W`（**Back to Projector Tab**）即可返回主投影幕。 |

---

## 4. 舞台控制與鍵盤快捷鍵

*（註：當游標停留在文字輸入框內時，系統會自動停用鍵盤快捷鍵以避免誤觸。）*

| 控制項目 | 快捷鍵 | 功能說明 |
| :--- | :--- | :--- |
| **Next Cue（下一項）** | `Space`、`右方向鍵`、`Page Down` | 觸發播放清單中的下一個項目。 |
| **Previous Cue（上一項）** | `左方向鍵`、`Page Up` | 返回並觸發上一個項目。 |
| **Blackout（黑屏遮罩）** | `B` 或 `.` | 以 0.25 秒平滑淡出至全黑畫面（系統啟動時預設為開啟狀態）。 |
| **Intermission（中場休息）** | `I` | 顯示 `/Media/intermission.png`（或 `.jpg`）、純文字 `"INTERMISSION"`，或透過 **Set Intermission / Backdrop Image...** 自訂的背景圖片。 |
| **Freeze Frame（畫面凍結）** | `F` | 擷取目前畫面或影片影格並鎖定於最上層，讓操作員可在後台自由切換其他項目而不被觀眾察覺。 |
| **Projector Tab（返回投影分頁）** | `W` | 在展示完 YouTube 或 Canva 網頁分頁後，將焦點切回主投影分頁。 |
| **Focus Projector（聚焦投影窗）** | `P` | 開啟投影視窗，或將已開啟的投影視窗帶至最上層。 |
| **End-of-Show Action（結束動作）** | *下拉式選單* | 設定在最後一個項目後再次按下「下一項」時的行為：**停留於目前畫面**、**顯示中場休息畫面**或**進入黑屏**。 |
| **Stop Audio Now（立即停止音訊）** | *介面按鈕* | 停止目前播放中的背景音訊（會依循 **Fade Out** 勾選狀態決定是否淡出）。 |
| **Panic / Emergency（緊急全黑）** | *介面按鈕* | 立即無淡出切斷所有音訊、清除視覺內容並強制進入全黑畫面。 |

---

## 5. Wi-Fi 手機遙控器

1. 確認手機與簡報電腦連接至**相同的 Wi-Fi 網路**。
2. 使用手機相機掃描控制台右下角的 **QR Code**（或在手機瀏覽器輸入畫面上顯示的 `http://<電腦IP>:8765/remote.html` 網址）。
3. 透過手機介面即可遠端控制 **下一項／上一項**、**黑屏**、**中場休息**、**畫面凍結**、**停止音訊**、**聚焦投影幕**、**緊急全黑**，或直接貼上 **YouTube／Canva 網址** 加入佇列或立即播放。

---

## 6. 後端 API 參考（`bridge.ps1`）

* **`GET /api/screens`**：回傳第二螢幕的座標與解析度（`x, y, w, h`），若無外接螢幕則回傳預設視窗尺寸。
* **`GET /api/info`**：回傳主機的區域網路 IPv4 位址與連接埠（`8765`），供產生配對 QR Code 使用。
* **`GET /api/focus-browser`**：喚起外部 Edge 瀏覽器視窗（用於切換至預先載入的網頁項目）。
* **`POST /api/upload-media`**：依據 `X-Filename` 標頭將上傳的檔案儲存至 `Media/` 目錄。
* **`POST /api/ppt`**：結束執行中的 `powerpnt` 處理程序，並可選擇以放映模式啟動指定的 `.ppt/.pptx` 檔案。
* **`POST /api/cleanup-temp`**：於系統關閉時清除暫存的 PowerPoint 檔案。
* **`POST /api/phone-cmd` 與 `GET /api/poll`**：執行緒安全的指令佇列，負責將 `remote.html` 的操作傳遞至控制台。
* **`GET /api/shutdown`**：將螢幕恢復為同步顯示（`DisplaySwitch.exe /clone`）、關閉獨立的 Edge 視窗並停止 HTTP 伺服器監聽。
