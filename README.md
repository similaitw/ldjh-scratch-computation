# 算衍修仙錄：Scratch 計算篇

給國中生的 Scratch 計算練習網站，以 RPG 闖關方式準備宜蘭縣資訊科技競賽與全國貓咪盃（國中生活 AI 互動組）。

- 兩個世界觀可切換：仙俠修仙（算衍修仙錄）、西洋魔法學院（星輝魔法學院），題目與進度共用
- 3D 浮空島地圖（three.js）
- 內建 Scratch 積木編輯區（scratch-blocks + scratch-vm），可直接拼積木、執行，並「自動試煉」驗證答案
- 目前開放三區 19 題：收銀法器、收費法器、存錢法器

## 檔案

- `index.html`：整個網站
- `lib/scratch-blocks.js`、`lib/scratch-vm.js`：Scratch 官方積木與執行引擎（Apache-2.0 / BSD-3-Clause）
- `lib/forge.js`：修煉室（積木編輯區＋自動驗證）
- `lib/media/`：積木編輯區圖示

純靜態網站，不需要建置步驟。進度存在學生自己的瀏覽器（localStorage）。

## 長老（教師）專區

網址加上 `#elder` 可看到各區的長老印記與班級使用建議。
