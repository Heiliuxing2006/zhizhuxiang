#!/bin/bash
# 智猪侠 · 一键重建本地 Docker（含 UI v1/v2 双版本切换）
cd "$(dirname "$0")"

echo "▶ 备份旧容器的地图 Key 与数据…"
AMAP_KEY=$(docker exec zhuxia printenv AMAP_KEY 2>/dev/null)
AMAP_SEC=$(docker exec zhuxia printenv AMAP_SECURITY_CODE 2>/dev/null)
mkdir -p data
docker cp zhuxia:/app/data/submissions.json ./data/submissions.json 2>/dev/null

echo "▶ 构建镜像…"
docker build -t zhu-tuo-suo . || { echo "❌ 构建失败"; exit 1; }

echo "▶ 重启容器…"
docker rm -f zhuxia 2>/dev/null
docker run -d --name zhuxia -p 3002:3001 \
  -v "$PWD/data:/app/data" \
  -e AMAP_KEY="$AMAP_KEY" -e AMAP_SECURITY_CODE="$AMAP_SEC" \
  zhu-tuo-suo || { echo "❌ 启动失败"; exit 1; }

sleep 2
echo ""
echo "✅ 部署完成！"
echo "   新版: http://localhost:3002/?ui=v2"
echo "   旧版: http://localhost:3002/?ui=v1"
open "http://localhost:3002/?ui=v2"
