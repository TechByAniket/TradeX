import marketDataService from "../services/market/marketDataService.js";

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
