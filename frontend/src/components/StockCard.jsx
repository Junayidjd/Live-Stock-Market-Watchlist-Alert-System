import React, { useState } from 'react';
import { FaTrash, FaBell } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const StockCard = ({ symbol, price, onRemove }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleRemove = async () => {
    try {
      setIsLoading(true);
      await api.delete('/watchlist', {
        data: { symbol }
      });
      toast.success(`${symbol} removed from watchlist`);
      onRemove(symbol);
    } catch (error) {
      toast.error('Failed to remove stock');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAlert = () => {
    toast.success(`Create alert for ${symbol} clicked`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold">{symbol}</h3>
        <div className="flex space-x-2">
          <button 
            onClick={handleCreateAlert}
            className="text-blue-500 hover:text-blue-700"
            title="Create Alert"
          >
            <FaBell size={16} />
          </button>
          <button 
            onClick={handleRemove}
            disabled={isLoading}
            className="text-red-500 hover:text-red-700"
            title="Remove Stock"
          >
            <FaTrash size={16} />
          </button>
        </div>
      </div>
      
      <div className="mt-2">
        <p className="text-gray-600">Current Price</p>
        <p className="text-2xl font-semibold">
          {price === 'Loading...' ? (
            <span className="text-gray-400">{price}</span>
          ) : (
            `$${Number(price).toFixed(2)}`
          )}
        </p>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <button 
          onClick={handleCreateAlert}
          className="w-full py-1 px-3 bg-blue-100 text-blue-600 rounded-md text-sm hover:bg-blue-200 transition"
        >
          Set Price Alert
        </button>
      </div>
    </div>
  );
};

export default StockCard;