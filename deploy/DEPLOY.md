# ArtPack Studio 上雲（Fly.io）

一次過設定，之後任何機任何 browser（iPad 都得）開網址就用。

## Emma 要做嘅（一次性，~10 分鐘）
1. 開戶：https://fly.io 註冊 + 加信用卡（估計月費 US$3-5，冇用時 auto-stop 慳錢）
2. 裝 CLI（Windows PowerShell）：
   iwr https://fly.io/install.ps1 -useb | iex
3. 登入：fly auth login
4. 之後叫 Claude 行 deploy（或者自己行下面三步）

## Deploy 三步（喺 Artpack 資料夾行）
   fly launch --no-deploy --copy-config --config studio/deploy/fly.toml
   fly volumes create artpack_data --size 3 --region hkg
   fly secrets set ARTPACK_PASSWORD=你揀嘅密碼 FAL_KEY=你嘅fal key
   fly deploy --config studio/deploy/fly.toml

## 用法
- 網址 https://artpack-studio.fly.dev（登入框：user emma + 你設嘅密碼）
- 生成品右上角「⬇️ 出品」一掣 zip 落機；/api/export.zip?what=all 攞埋 Generated
- 更新 code：git pull 之後 fly deploy 一句

## 注意
- 素材庫喺第一次起機時由映像 seed 入 volume；之後想加新 pack 就 fly deploy 加 --strategy immediate 重新 seed（或者 sftp 上傳）
- .dockerignore 已剔走 PSD/截圖源檔，映像大約 200MB 質素圖
