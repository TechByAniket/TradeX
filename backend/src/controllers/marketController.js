import marketDataService from "../services/market/marketDataService.js";
import {
  getNseSnapshotStatus,
  refreshNseSnapshots,
} from "../services/market/zylaMarketService.js";

export function getAllStocks(_req, res, next) {
  try {
    const stocks = marketDataService.getLatestPrices();
    res.status(200).json({
      success: true,
      provider: marketDataService.getProviderName(),
      simulated: marketDataService.isSimulated(),
      count: stocks.length,
      stocks,
    });
  } catch (error) {
    next(error);
  }
}

export function getStockBySymbol(req, res, next) {
  try {
    const stock = marketDataService.getLatestPrice(req.params.symbol);
    res.status(200).json({
      success: true,
      provider: marketDataService.getProviderName(),
      simulated: marketDataService.isSimulated(),
      stock,
    });
  } catch (error) {
    next(error);
  }
}

export function getStockHistory(req, res, next) {
  try {
    const { stock, history } = marketDataService.getPriceHistory(req.params.symbol);
    res.status(200).json({
      success: true,
      provider: marketDataService.getProviderName(),
      simulated: marketDataService.isSimulated(),
      symbol: stock.symbol,
      currentPrice: stock.currentPrice,
      lastUpdated: stock.lastUpdated,
      count: history.length,
      history,
    });
  } catch (error) {
    next(error);
  }
}

export async function getNseStatus(_req, res, next) {
  try {
    const status = await getNseSnapshotStatus();
    res.status(200).json({
      success: true,
      ...status,
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshNseMarketPrices(_req, res, next) {
  try {
    const result = await refreshNseSnapshots();
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
