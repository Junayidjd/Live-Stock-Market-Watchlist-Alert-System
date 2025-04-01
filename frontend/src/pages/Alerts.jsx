import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "../utils/api";

const Alerts = () => {
  const [activeTab, setActiveTab] = useState("active");
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [symbol, setSymbol] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState("above");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all alert data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [activeAlerts, alertHistory] = await Promise.all([
        api.get("/alerts"),
        api.get("/alert-history")
      ]);
      setAlerts(activeAlerts.data);
      setHistory(alertHistory.data);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to fetch alerts");
    } finally {
      setIsLoading(false);
    }
  };

  // Create new alert
  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!symbol || !targetPrice) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setIsLoading(true);
      await api.post("/alerts", { 
        symbol, 
        target_price: targetPrice, 
        condition 
      });
      toast.success("Alert created successfully");
      fetchData(); // Refresh both active alerts and history
      setSymbol("");
      setTargetPrice("");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create alert");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete alert
  const handleDeleteAlert = async (alertId) => {
    try {
      await api.delete("/alerts", { 
        data: { alert_id: alertId } 
      });
      toast.success("Alert deleted");
      fetchData(); // Refresh both active alerts and history
    } catch (error) {
      toast.error("Failed to delete alert");
    }
  };

  // Initial data load
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Price Alerts</h1>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === "active" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("active")}
        >
          Active Alerts
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === "history" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("history")}
        >
          Alert History
        </button>
      </div>

      {activeTab === "active" ? (
        <>
          {/* Create Alert Form */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Alert</h2>
            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Symbol
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL"
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Price
                </label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="e.g. 150.50"
                  step="0.01"
                  min="0"
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="above">Price Goes Above</option>
                  <option value="below">Price Goes Below</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2 px-4 rounded-md text-white ${
                  isLoading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isLoading ? "Creating..." : "Create Alert"}
              </button>
            </form>
          </div>

          {/* Active Alerts List */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Your Active Alerts</h2>
            {isLoading ? (
              <p>Loading...</p>
            ) : alerts.length === 0 ? (
              <p className="text-gray-500">No active alerts</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert._id}
                    className="flex justify-between items-center p-3 border-b"
                  >
                    <div>
                      <span className="font-medium">{alert.symbol}</span> - Alert
                      when price is {alert.condition} ${alert.target_price}
                      {alert.triggered && (
                        <span className="ml-2 text-green-600">(Triggered)</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(alert._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Alert History Tab */
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Alert History</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-500">No alert history yet</p>
          ) : (
            <div className="space-y-3">
              {history.map((alert, index) => (
                <div key={index} className="p-3 border-b">
                  <div className="flex justify-between">
                    <span className="font-medium">{alert.symbol}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(alert.triggered_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1">
                    Triggered when price was <strong>{alert.condition}</strong> ${alert.target_price}
                  </div>
                  <div className="mt-1 text-green-600">
                    Actual price: ${alert.actual_price}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Alerts;