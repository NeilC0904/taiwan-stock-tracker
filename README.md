# 台股價格追蹤器 🇹🇼📈

一個連接台灣證券交易所官方API的React應用程式，提供即時台股數據查詢和價格走勢追蹤。

![台股追蹤器](https://img.shields.io/badge/台股-價格追蹤器-blue)
![React](https://img.shields.io/badge/React-18-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-blue)

## ✨ 功能特色

- 🔍 **即時股價查詢** - 支援上市、上櫃、ETF
- 📊 **圖表視覺化** - Recharts 動態價格走勢圖  
- 📈 **漲跌分析** - 自動計算漲跌幅和價差
- 💹 **歷史追蹤** - 指定日期開始的價格追蹤
- 🌐 **官方數據** - 100% 台灣證交所真實數據
- 🛡️ **代理連接** - 通過後端代理避免CORS問題

## 🚀 快速開始

### 線上體驗
直接訪問部署版本：[台股追蹤器 Live Demo](#)

### 本地開發
```bash
# 克隆專案
git clone https://github.com/您的用戶名/taiwan-stock-tracker.git

# 進入目錄
cd taiwan-stock-tracker

# 安裝依賴
npm install

# 啟動開發服務器
npm run dev
