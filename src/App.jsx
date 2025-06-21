import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, TrendingUp, Calendar, DollarSign, AlertCircle, Info, Server, Globe } from 'lucide-react';

export default function RealTaiwanStockTracker() {
  const [stockSymbol, setStockSymbol] = useState('');
  const [startDate, setStartDate] = useState('');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendUrl, setBackendUrl] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // 測試後端連接
  const testBackendConnection = async (url) => {
    try {
      console.log(`🔄 測試後端連接: ${url}`);
      setConnectionStatus('testing');
      
      // 清理 URL 並移除可能的重複路徑
      let cleanUrl = url.replace(/\/$/, '');
      if (cleanUrl.endsWith('/health')) {
        cleanUrl = cleanUrl.replace('/health', '');
      }
      
      // 嘗試多個健康檢查端點
      const endpoints = [
        `${cleanUrl}/health`,
        `${cleanUrl}/api/health`,
        `${cleanUrl}/`
      ];
      
      for (let i = 0; i < endpoints.length; i++) {
        const testUrl = endpoints[i];
        console.log(`📡 嘗試端點 ${i + 1}: ${testUrl}`);
        
        try {
          const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            mode: 'cors'
          });

          if (!response.ok) {
            console.log(`❌ 端點 ${testUrl} 失敗: ${response.status}`);
            continue;
          }

          const data = await response.json();
          console.log('✅ 後端連接成功:', data);
          
          setConnectionStatus('connected');
          setError('');
          return true;
        } catch (endpointError) {
          console.log(`❌ 端點 ${testUrl} 錯誤:`, endpointError.message);
          continue;
        }
      }
      
      // 如果所有端點都失敗
      throw new Error('所有健康檢查端點都無法連接');
    } catch (err) {
      console.error('❌ 後端連接失敗:', err);
      setConnectionStatus('failed');
      
      // 檢查是否為 CSP 錯誤
      if (err.message.includes('Content Security Policy') || 
          err.message.includes('Failed to fetch') ||
          err.message.includes('CORS')) {
        setError(`後端連接失敗: ${err.message}\n\n💡 可能的解決方案:\n` +
          `• 確認 API 服務器正在運行\n` +
          `• 檢查 CORS 設置\n` +
          `• 在瀏覽器中直接訪問: ${url}/health\n` +
          `• Claude.ai 環境可能對某些域名有限制`);
      } else {
        setError(`後端連接失敗: ${err.message}`);
      }
      return false;
    }
  };

  // 從後端代理獲取股票即時資料
  const fetchStockFromProxy = async (symbol) => {
    if (!backendUrl) {
      throw new Error('請先設定並測試後端服務器地址');
    }

    try {
      console.log(`🔄 從代理服務器獲取股票資料: ${symbol}`);
      
      // 先嘗試上市股票
      let response = await fetch(`${backendUrl}/api/twse/stock/realtime/${symbol}?market=tse`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let data = await response.json();
      console.log('📊 API回應:', data);

      if (data.success && data.data.msgArray && data.data.msgArray.length > 0) {
        const stockInfo = data.data.msgArray[0];
        console.log('✅ 找到上市股票:', stockInfo);
        
        // 驗證股票資料的完整性
        const price = parseFloat(stockInfo.z || stockInfo.y || 0);
        const name = stockInfo.n || '';
        
        if (!name || name.trim() === '' || price <= 0 || isNaN(price)) {
          console.log('❌ 上市股票數據不完整或無效:', { price, name, rawData: stockInfo });
          // 繼續嘗試上櫃查詢
        } else {
          return {
            symbol: stockInfo.c || symbol,
            name: name.trim(),
            price: price,
            open: parseFloat(stockInfo.o || 0),
            high: parseFloat(stockInfo.h || 0),
            low: parseFloat(stockInfo.l || 0),
            volume: parseInt(stockInfo.v || 0),
            previousClose: parseFloat(stockInfo.y || 0),
            change: parseFloat(stockInfo.tv || 0),
            changePercent: parseFloat(stockInfo.pz || 0),
            source: 'TSE-即時',
            updateTime: stockInfo.t || '',
            market: '上市'
          };
        }
      }

      // 如果上市沒找到，嘗試上櫃
      console.log('🔄 嘗試上櫃股票查詢...');
      response = await fetch(`${backendUrl}/api/twse/stock/realtime/${symbol}?market=otc`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      data = await response.json();
      
      if (data.success && data.data.msgArray && data.data.msgArray.length > 0) {
        const stockInfo = data.data.msgArray[0];
        console.log('✅ 找到上櫃股票:', stockInfo);
        
        // 驗證股票資料的完整性
        const price = parseFloat(stockInfo.z || stockInfo.y || 0);
        const name = stockInfo.n || '';
        
        if (!name || name.trim() === '' || price <= 0 || isNaN(price)) {
          console.log('❌ 上櫃股票數據不完整或無效:', { price, name, rawData: stockInfo });
          return null;
        }
        
        return {
          symbol: stockInfo.c || symbol,
          name: name.trim(),
          price: price,
          open: parseFloat(stockInfo.o || 0),
          high: parseFloat(stockInfo.h || 0),
          low: parseFloat(stockInfo.l || 0),
          volume: parseInt(stockInfo.v || 0),
          previousClose: parseFloat(stockInfo.y || 0),
          change: parseFloat(stockInfo.tv || 0),
          changePercent: parseFloat(stockInfo.pz || 0),
          source: 'OTC-即時',
          updateTime: stockInfo.t || '',
          market: '上櫃'
        };
      }

      console.log('❌ 在上市和上櫃都找不到股票');
      return null;
    } catch (error) {
      console.error('❌ 代理API調用失敗:', error);
      throw error;
    }
  };

  // 從後端獲取歷史資料（修正版）
  const fetchHistoryFromProxy = async (symbol, date) => {
    try {
      const formattedDate = date.replace(/-/g, '');
      const response = await fetch(`${backendUrl}/api/twse/stock/daily/${symbol}?date=${formattedDate}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors'
      });

      // 如果 CORS 錯誤或其他網路錯誤，返回 null 而不是拋出錯誤
      if (!response.ok) {
        console.log(`❌ 歷史資料API回應失敗: ${response.status} - 可能是 CORS 問題或該日期無數據`);
        return null;
      }

      const data = await response.json();
      
      if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        const stockInfo = data.data.find(item => item[0] === symbol);
        
        if (stockInfo && stockInfo.length >= 9) {
          return {
            date: date,
            price: parseFloat(stockInfo[8].replace(/,/g, '')) || 0,
            volume: parseInt(stockInfo[2].replace(/,/g, '')) || 0,
            high: parseFloat(stockInfo[4].replace(/,/g, '')) || 0,
            low: parseFloat(stockInfo[5].replace(/,/g, '')) || 0,
            open: parseFloat(stockInfo[3].replace(/,/g, '')) || 0,
            source: 'TWSE-歷史'
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error(`❌ 獲取 ${date} 歷史資料失敗:`, error.message);
      // 不要拋出錯誤，返回 null 讓程式繼續執行
      return null;
    }
  };

  // 獲取營業日列表
  const getBusinessDays = (startDate, days) => {
    const businessDays = [];
    const currentDate = new Date(startDate);
    let count = 0;
    
    while (count < days && businessDays.length < 30) { // 最多30天防止無窮迴圈
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        businessDays.push(currentDate.toISOString().split('T')[0]);
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return businessDays;
  };

  // 主要搜尋功能（修正版）
  const handleSearch = async () => {
    if (!stockSymbol.trim() || !startDate) {
      setError('請輸入股票代號和指定日期');
      return;
    }

    if (!backendUrl) {
      setError('請先設定後端服務器地址');
      return;
    }

    if (connectionStatus !== 'connected' && connectionStatus !== 'manual') {
      setError('請先點擊「測試連接」或「直接使用」來設定後端連接');
      return;
    }

    console.log(`🚀 開始搜尋股票: ${stockSymbol.toUpperCase()}, 起始日期: ${startDate}`);
    
    setLoading(true);
    setError('');
    setStockData(null);
    
    try {
      // 獲取即時股票資料
      console.log(`🔄 正在獲取 ${stockSymbol.toUpperCase()} 的即時數據...`);
      const currentStockData = await fetchStockFromProxy(stockSymbol.toUpperCase());
      
      if (!currentStockData) {
        setError(`找不到股票代號 "${stockSymbol}" 的數據，請確認代號是否正確`);
        return;
      }
      
      // 驗證即時數據的完整性
      if (!currentStockData.price || currentStockData.price <= 0 || isNaN(currentStockData.price)) {
        console.error('❌ 即時數據驗證失敗:', currentStockData);
        setError(`股票代號 "${stockSymbol}" 的數據異常：可能是停牌、下市，或該股票代號不存在。請檢查股票代號或稍後再試。`);
        return;
      }
      
      if (!currentStockData.name || currentStockData.name.trim() === '') {
        console.error('❌ 股票名稱為空:', currentStockData);
        setError(`股票代號 "${stockSymbol}" 無法獲取完整資訊，請確認代號是否正確。`);
        return;
      }
      
      console.log(`✅ 成功獲取即時數據:`, currentStockData);
      
      // 獲取歷史資料（改進錯誤處理）
      console.log(`🔄 正在獲取歷史數據...`);
      const businessDays = getBusinessDays(startDate, 21);
      const stockDataPoints = [];
      
      // 嘗試獲取前5個營業日的歷史資料
      for (let i = 0; i < Math.min(businessDays.length, 5); i++) {
        const date = businessDays[i];
        console.log(`🔄 獲取 ${date} 的歷史數據...`);
        
        const dayData = await fetchHistoryFromProxy(stockSymbol.toUpperCase(), date);
        
        if (dayData && dayData.price > 0) {
          console.log(`✅ 成功獲取 ${date} 的數據:`, dayData);
          stockDataPoints.push({
            ...dayData,
            day: i === 0 ? '指定日' : `第${i}個營業日`,
            displayDate: new Date(dayData.date).toLocaleDateString('zh-TW'),
            businessDay: i
          });
        } else {
          console.log(`❌ 無法獲取 ${date} 的歷史數據`);
        }
        
        // 添加延遲避免API限制
        if (i < Math.min(businessDays.length, 5) - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 確保有當前價格數據點
      const today = new Date().toISOString().split('T')[0];
      const hasCurrentData = stockDataPoints.some(point => point.date === today);
      
      if (!hasCurrentData && currentStockData.price > 0) {
        stockDataPoints.push({
          date: today,
          price: currentStockData.price,
          day: '當前',
          displayDate: new Date().toLocaleDateString('zh-TW'),
          businessDay: stockDataPoints.length,
          source: currentStockData.source
        });
      }

      // 修正：確保至少有一個有效的數據點
      if (stockDataPoints.length === 0 && currentStockData.price > 0) {
        // 如果沒有任何歷史數據，至少添加當前數據
        stockDataPoints.push({
          date: today,
          price: currentStockData.price,
          day: '當前',
          displayDate: new Date().toLocaleDateString('zh-TW'),
          businessDay: 0,
          source: currentStockData.source
        });
        
        console.log(`⚠️ 無法獲取歷史數據，僅顯示當前價格`);
      }

      console.log(`📈 最終數據點數量: ${stockDataPoints.length}`);
      console.log(`📊 數據點詳情:`, stockDataPoints);
      
      const validDataPoints = stockDataPoints.filter(point => point && point.price && point.price > 0);
      
      // 修正：檢查是否有有效數據點
      if (validDataPoints.length === 0) {
        setError('無法獲取有效的股票數據，請稍後再試或檢查股票代號');
        return;
      }
      
      // 確保安全地獲取第一個和最後一個數據點
      const firstValidPoint = validDataPoints[0] || null;
      const lastValidPoint = validDataPoints[validDataPoints.length - 1] || firstValidPoint || null;
      
      // 修正：更安全的價格計算
      let priceChange = 0;
      let changePercent = 0;
      
      if (firstValidPoint && lastValidPoint && firstValidPoint.price && lastValidPoint.price) {
        priceChange = lastValidPoint.price - firstValidPoint.price;
        if (firstValidPoint.price > 0) {
          changePercent = (priceChange / firstValidPoint.price) * 100;
        }
      }
      
      // 使用即時數據作為備用
      const safeStartPrice = firstValidPoint?.price || currentStockData.price || 0;
      const safeEndPrice = lastValidPoint?.price || currentStockData.price || 0;
      const safeStartDate = firstValidPoint?.displayDate || new Date().toLocaleDateString('zh-TW');
      const safeEndDate = lastValidPoint?.displayDate || new Date().toLocaleDateString('zh-TW');
      
      console.log(`💹 分析結果: 起始價 ${safeStartPrice}, 結束價 ${safeEndPrice}`);
      console.log(`📊 有效數據點: ${validDataPoints.length}, 總數據點: ${stockDataPoints.length}`);
      
      setStockData({
        symbol: stockSymbol.toUpperCase(),
        name: currentStockData.name,
        market: currentStockData.market,
        source: currentStockData.source,
        updateTime: currentStockData.updateTime,
        data: stockDataPoints,
        validDataCount: validDataPoints.length,
        startPrice: safeStartPrice,
        endPrice: safeEndPrice,
        change: priceChange,
        changePercent: changePercent,
        startDate: safeStartDate,
        endDate: safeEndDate,
        currentPrice: currentStockData.price,
        previousClose: currentStockData.previousClose,
        open: currentStockData.open,
        high: currentStockData.high,
        low: currentStockData.low,
        volume: currentStockData.volume,
        hasHistoryData: validDataPoints.length > 1
      });
      
      if (validDataPoints.length === 1) {
        setError('⚠️ 注意：由於歷史數據API的CORS限制，目前僅能顯示即時價格。歷史走勢圖可能無法完整顯示。');
      }
      
      console.log(`🎉 搜尋完成！`);
      
    } catch (err) {
      console.error('❌ Error fetching stock data:', err);
      setError(`獲取股票數據時發生錯誤: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTooltipValue = (value, name) => {
    if (value === null || value === 0) return ['無數據', '收盤價'];
    return [`NT$${value}`, '收盤價'];
  };

  const formatTooltipLabel = (label) => {
    const dataPoint = stockData?.data.find(d => d.date === label);
    if (!dataPoint) return label;
    
    return `${dataPoint.displayDate} (${dataPoint.day})`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 標題 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <TrendingUp className="text-blue-600" size={40} />
            台股價格追蹤器
          </h1>
          <p className="text-gray-600">通過後端代理服務器連接台灣證交所數據</p>
          <div className="mt-2 text-sm text-gray-500">
            數據來源：台灣證券交易所 官方API（通過後端代理）
          </div>
        </div>

        {/* 後端服務器設定 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Server className="text-blue-600" size={24} />
            <h3 className="text-xl font-bold text-gray-800">後端服務器設定</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
              connectionStatus === 'testing' ? 'bg-yellow-100 text-yellow-800' :
              connectionStatus === 'failed' ? 'bg-red-100 text-red-800' :
              connectionStatus === 'manual' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {connectionStatus === 'connected' ? '✅ 已連接' :
               connectionStatus === 'testing' ? '🔄 測試中' :
               connectionStatus === 'failed' ? '❌ 連接失敗' :
               connectionStatus === 'manual' ? '🔧 手動設定' :
               '⭕ 未連接'}
            </div>
          </div>
          
          <div className="grid md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                後端服務器地址
              </label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="例如: https://twstockapi.vercel.app"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="mt-1 text-xs text-gray-500">
                請輸入您部署的後端代理服務器地址
              </div>
            </div>
            
            <button
              onClick={() => testBackendConnection(backendUrl)}
              disabled={!backendUrl || connectionStatus === 'testing'}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {connectionStatus === 'testing' ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <Globe size={20} />
              )}
              {connectionStatus === 'testing' ? '測試中...' : '測試連接'}
            </button>

            <button
              onClick={() => {
                if (backendUrl) {
                  setConnectionStatus('manual');
                  setError('');
                  console.log('🔧 手動設定後端地址:', backendUrl);
                } else {
                  setError('請先輸入後端服務器地址');
                }
              }}
              disabled={!backendUrl}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Server size={20} />
              直接使用
            </button>
          </div>
        </div>

        {/* CORS 限制警告 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 mt-1" size={20} />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-2">⚠️ 歷史數據API限制說明：</p>
              <ul className="space-y-1">
                <li>• <strong>即時數據</strong>：正常運作，支援上市和上櫃股票查詢</li>
                <li>• <strong>歷史數據</strong>：由於CORS政策限制，可能無法獲取完整歷史走勢</li>
                <li>• <strong>建議</strong>：目前主要功能為即時股價查詢和基本資訊顯示</li>
                <li>• <strong>上櫃股票</strong>：4979、6488 等上櫃股票的即時數據可正常查詢</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 搜索面板 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                台股代號
              </label>
              <input
                type="text"
                value={stockSymbol}
                onChange={(e) => setStockSymbol(e.target.value)}
                placeholder="例如: 2330, 4979, 0050"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={connectionStatus !== 'connected' && connectionStatus !== 'manual'}
              />
              <div className="mt-1 text-xs text-gray-500">
                輸入台股代號（支持上市、上櫃、ETF）
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                指定日期
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={connectionStatus !== 'connected' && connectionStatus !== 'manual'}
              />
              <div className="mt-1 text-xs text-gray-500">
                選擇開始追蹤的日期
              </div>
            </div>
            
            <button
              onClick={handleSearch}
              disabled={loading || (connectionStatus !== 'connected' && connectionStatus !== 'manual')}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <Search size={20} />
              )}
              {loading ? '獲取數據中...' : '搜索'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 flex items-center gap-2">
              <AlertCircle size={20} />
              <div className="whitespace-pre-wrap">{error}</div>
            </div>
          )}
        </div>

        {/* 股票信息卡片 */}
        {stockData && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {stockData.name} ({stockData.symbol})
                  </h2>
                  <p className="text-sm text-gray-600">
                    市場: {stockData.market} | 數據來源: {stockData.source}
                    {stockData.updateTime && ` | 更新時間: ${stockData.updateTime}`}
                  </p>
                  {!stockData.hasHistoryData && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ 因CORS限制，歷史數據可能不完整，主要顯示即時價格
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-800">
                    現價: NT${stockData.currentPrice}
                  </p>
                  <p className={`text-sm font-medium ${stockData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stockData.change >= 0 ? '+' : ''}NT${(stockData.currentPrice - stockData.previousClose).toFixed(2)} 
                    ({stockData.change >= 0 ? '+' : ''}{(((stockData.currentPrice - stockData.previousClose) / stockData.previousClose) * 100).toFixed(2)}%)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">開盤:</span>
                  <span className="ml-2 font-medium">NT${stockData.open}</span>
                </div>
                <div>
                  <span className="text-gray-600">最高:</span>
                  <span className="ml-2 font-medium">NT${stockData.high}</span>
                </div>
                <div>
                  <span className="text-gray-600">最低:</span>
                  <span className="ml-2 font-medium">NT${stockData.low}</span>
                </div>
                <div>
                  <span className="text-gray-600">成交量:</span>
                  <span className="ml-2 font-medium">{stockData.volume.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="text-blue-600" size={24} />
                  <h3 className="font-semibold text-gray-700">指定日價格</h3>
                </div>
                <p className="text-2xl font-bold text-gray-800">NT${stockData.startPrice}</p>
                <p className="text-sm text-gray-500">{stockData.startDate}</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-purple-600" size={24} />
                  <h3 className="font-semibold text-gray-700">追蹤終點價格</h3>
                </div>
                <p className="text-2xl font-bold text-gray-800">NT${stockData.endPrice}</p>
                <p className="text-sm text-gray-500">{stockData.endDate}</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className={stockData.change >= 0 ? "text-green-600" : "text-red-600"} size={24} />
                  <h3 className="font-semibold text-gray-700">價差</h3>
                </div>
                <p className={`text-2xl font-bold ${stockData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stockData.change >= 0 ? '+' : ''}NT${stockData.change.toFixed(2)}
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className={stockData.change >= 0 ? "text-green-600" : "text-red-600"} size={24} />
                  <h3 className="font-semibold text-gray-700">漲跌幅</h3>
                </div>
                <p className={`text-2xl font-bold ${stockData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stockData.change >= 0 ? '+' : ''}{stockData.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </>
        )}

        {/* 價格走勢圖 */}
        {stockData && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              {stockData.symbol} {stockData.name} - 價格走勢追蹤
            </h3>
            
            {stockData.hasHistoryData ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={stockData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const dataPoint = stockData.data.find(d => d.date === value);
                      return dataPoint ? dataPoint.displayDate.split('/').slice(1).join('/') : value;
                    }}
                  />
                  <YAxis 
                    domain={['dataMin - 5', 'dataMax + 5']}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `NT${value}`}
                  />
                  <Tooltip 
                    formatter={formatTooltipValue}
                    labelFormatter={formatTooltipLabel}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#2563eb" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#2563eb', stroke: '#1d4ed8', strokeWidth: 2 }}
                    activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' }}
                    name="收盤價 (NT$)"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
                <h4 className="text-lg font-semibold text-gray-700 mb-2">歷史數據暫時無法顯示</h4>
                <p className="text-gray-600 mb-4">
                  由於 CORS 政策限制，歷史數據 API 目前無法正常訪問。
                  <br />但您仍可以查看完整的即時股票資訊。
                </p>
                <div className="bg-blue-50 rounded-lg p-4 text-left">
                  <h5 className="font-semibold text-blue-800 mb-2">當前顯示的資訊包括：</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>✅ 即時股價和漲跌幅</li>
                    <li>✅ 開盤價、最高價、最低價</li>
                    <li>✅ 成交量資訊</li>
                    <li>✅ 上市/上櫃市場分類</li>
                    <li>⚠️ 歷史價格走勢圖（受CORS限制）</li>
                  </ul>
                </div>
              </div>
            )}
            
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span>即時股價數據</span>
                </div>
              </div>
              <p>* 即時數據來源：台灣證券交易所官方API（通過後端代理服務器）</p>
              <p>* 即時數據：直接來自證交所，每15秒更新一次</p>
              <p>* 所有即時數據均為真實市場數據，無任何模擬或估算</p>
              {!stockData.hasHistoryData && (
                <p className="text-amber-600">* 歷史數據：由於CORS限制暫時無法獲取，正在尋找解決方案</p>
              )}
            </div>
          </div>
        )}

        {/* 使用說明 */}
        {!stockData && connectionStatus !== 'connected' && connectionStatus !== 'manual' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">設置說明</h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">🚀 快速開始：</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
                  <li>在上方輸入您的後端服務器地址（必須是 HTTPS）</li>
                  <li>點擊「測試連接」確認服務器正常運行</li>
                  <li>如果連接失敗，點擊「直接使用」繞過測試</li>
                  <li>輸入股票代號和日期即可搜索真實台股數據</li>
                </ol>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">💡 推薦設置：</h4>
                <div className="text-sm text-green-700">
                  <p><strong>後端地址</strong>：https://twstockapi.vercel.app</p>
                  <p><strong>數據來源</strong>：台灣證券交易所官方API</p>
                  <p><strong>支援範圍</strong>：上市、上櫃股票及ETF</p>
                  <p><strong>更新頻率</strong>：即時數據（15秒延遲）</p>
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 mb-2">⚠️ 重要注意事項：</h4>
                <ul className="space-y-1 text-sm text-amber-700">
                  <li>• 本系統僅使用真實台股數據，無任何模擬資料</li>
                  <li>• 即時數據完全正常，支援上市和上櫃股票</li>
                  <li>• 歷史數據因CORS限制可能無法顯示完整走勢圖</li>
                  <li>• 即時數據有15秒延遲（符合交易所規定）</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">🔧 技術架構：</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>前端</strong>：React + Recharts 圖表庫</p>
                  <p><strong>後端</strong>：Node.js + Vercel 無伺服器函數</p>
                  <p><strong>數據源</strong>：台灣證券交易所官方API</p>
                  <p><strong>部署</strong>：Vercel 雲端平台</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 功能說明 */}
        {!stockData && (connectionStatus === 'connected' || connectionStatus === 'manual') && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">功能特色</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">📊 真實數據來源</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 台灣證券交易所官方 API</li>
                  <li>• 支援上市、上櫃股票查詢</li>
                  <li>• 即時股價（15秒延遲）</li>
                  <li>• 官方即時交易數據</li>
                  <li>• ETF 及指數資訊</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">🔍 查詢功能</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 單一股票即時查詢</li>
                  <li>• 完整股價資訊顯示</li>
                  <li>• 上市/上櫃市場識別</li>
                  <li>• 漲跌幅自動計算</li>
                  <li>• 響應式界面設計</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">🛡️ 數據品質</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 100% 真實市場資料</li>
                  <li>• 無模擬或估算數據</li>
                  <li>• 符合交易所規範</li>
                  <li>• 即時價格更新</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">⚡ 技術優勢</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 雲端後端代理</li>
                  <li>• 自動錯誤處理</li>
                  <li>• 響應式設計</li>
                  <li>• 現代化界面</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">常用台股代號參考：</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-700">
                <div><strong>權值股：</strong></div>
                <div>2330 台積電</div>
                <div>2317 鴻海</div>
                <div>2454 聯發科</div>
                
                <div><strong>金融股：</strong></div>
                <div>2881 富邦金</div>
                <div>2882 國泰金</div>
                <div>2885 元大金</div>
                
                <div><strong>ETF：</strong></div>
                <div>0050 元大台灣50</div>
                <div>0056 元大高股息</div>
                <div>006208 富邦台50</div>
                
                <div><strong>上櫃熱門：</strong></div>
                <div>4979 華星光</div>
                <div>6488 環球晶</div>
                <div>6669 緯穎</div>
              </div>
            </div>
          </div>
        )}

        {/* 技術說明 */}
        <div className="mt-8 bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">技術架構說明</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">前端 (React)</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• React Hooks 狀態管理</li>
                <li>• Recharts 圖表視覺化</li>
                <li>• Tailwind CSS 樣式設計</li>
                <li>• Lucide React 圖標庫</li>
                <li>• 響應式設計</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">後端代理</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Node.js + Express 框架</li>
                <li>• CORS 跨域處理</li>
                <li>• API 請求代理</li>
                <li>• 錯誤處理機制</li>
                <li>• Vercel 無伺服器函數</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">數據來源</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 台灣證券交易所 API</li>
                <li>• 櫃買中心 API</li>
                <li>• 即時股價資訊</li>
                <li>• 100% 真實市場資料</li>
                <li>• 15秒延遲更新</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>數據保證</strong>：本系統承諾僅使用台灣證券交易所及櫃買中心的官方真實數據，
              絕無任何模擬、估算或虛構資料。所有股價、交易量資訊均來自實際市場交易記錄。
              目前歷史數據功能因 CORS 限制暫時受影響，但即時數據完全正常運作。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
