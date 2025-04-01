import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import StockCard from "../components/StockCard";
import SearchStocks from "../components/SearchStocks";
import { toast } from "react-hot-toast";
import api from "../utils/api";
import { Link } from "react-router-dom"; // Import Link for navigation

export default function Dashboard() {
  const [watchlist, setWatchlist] = useState([]);
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Set up WebSocket connection and fetch watchlist
  useEffect(() => {
    const newSocket = io("http://localhost:5000", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
      withCredentials: true,
      extraHeaders: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected:", reason);
    });

    newSocket.on("connect_error", (err) => {
      console.log("Connection error:", err);
    });

    newSocket.on("stock_update", (data) => {
      setStockData((prev) => ({ ...prev, [data.symbol]: data.price }));
    });

    fetchWatchlist();

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Fetch watchlist from API
  const fetchWatchlist = async () => {
    try {
      const response = await api.get("/watchlist");
      setWatchlist(response.data);
      if (socket && response.data.length > 0) {
        socket.emit("subscribe_stocks", { symbols: response.data });
      }
    } catch (err) {
      console.error("Failed to fetch watchlist:", err);
      toast.error("Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  };

  // Add a stock to the watchlist
  const addToWatchlist = async (symbol) => {
    try {
      await api.post("/watchlist", { symbol });
      setWatchlist((prev) => [...prev, symbol]);
      if (socket) {
        socket.emit("subscribe_stocks", { symbols: [symbol] });
      }
      toast.success(`${symbol} added to watchlist`);
    } catch (err) {
      console.error("Failed to add stock:", err);
      toast.error(err.response?.data?.error || "Failed to add stock");
    }
  };

  // Remove a stock from the watchlist
  const removeFromWatchlist = (removedSymbol) => {
    setWatchlist(watchlist.filter((s) => s !== removedSymbol));
    if (socket) {
      socket.emit("unsubscribe_stocks", { symbols: [removedSymbol] });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Stock Watchlist</h1>
        <Link
          to="/alerts"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          View Alerts
        </Link>
      </div>

      <SearchStocks onAddStock={addToWatchlist} />

      {loading ? (
        <div className="text-center py-8">Loading watchlist...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {watchlist.map((symbol) => (
              <StockCard
                key={symbol}
                symbol={symbol}
                price={stockData[symbol] || "Loading..."}
                onRemove={removeFromWatchlist}
              />
            ))}
          </div>

          {/* Additional button for managing price alerts */}
          <div className="mt-8 text-center">
            <Link
              to="/alerts"
              className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-lg font-medium transition"
            >
              Manage Price Alerts
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
