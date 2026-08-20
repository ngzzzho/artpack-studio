#!/bin/sh
# 第一次起機：volume 空嘅就由映像 seed 素材庫
if [ ! -d "/data/UI Pack" ]; then
  echo "seeding asset library into /data ..."
  mkdir -p /data
  cp -r /seed/. /data/
fi
mkdir -p "/data/Generated" "/data/Football Pack"
exec node server.js
