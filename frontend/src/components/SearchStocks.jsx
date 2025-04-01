// import React, { useState } from "react";
// import axios from "axios";
// import { toast } from "react-hot-toast";

// const SearchStocks = ({ onAddStock }) => {
//   const [query, setQuery] = useState("");
//   const [results, setResults] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);

//   const searchStocks = async () => {
//     try {
//       setIsLoading(true);
//       const token = localStorage.getItem("token");
      
//       console.log("Searching for:", query); // Debug log
      
//       const response = await axios.get("/api/stocks/search", {
//         params: { query },
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
      
//       console.log("API Response:", response.data); // Debug log
      
//       if (response.data.error) {
//         toast.error(response.data.error);
//         setResults([]);
//       } else {
//         setResults(response.data.bestMatches || []);
//       }
//     } catch (error) {
//       console.error("Search error details:", {
//         message: error.message,
//         response: error.response,
//         stack: error.stack
//       });
//       toast.error(error.response?.data?.error || "Failed to search stocks");
//       setResults([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="mb-6">
//       <div className="flex gap-2">
//         <input
//           type="text"
//           value={query}
//           onChange={(e) => setQuery(e.target.value)}
//           placeholder="Search stocks (e.g. AAPL)"
//           className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           onKeyPress={(e) => e.key === "Enter" && searchStocks()}
//         />
//         <button
//           onClick={searchStocks}
//           disabled={isLoading}
//           className={`px-4 py-2 rounded-lg ${
//             isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
//           } text-white`}
//         >
//           {isLoading ? "Searching..." : "Search"}
//         </button>
//       </div>

//       {results.length > 0 && (
//         <div className="mt-4 border rounded-lg divide-y">
//           {results.map((stock) => (
//             <div
//               key={stock["1. symbol"]}
//               className="p-3 flex justify-between items-center"
//             >
//               <div>
//                 <span className="font-bold">{stock["1. symbol"]}</span> -{" "}
//                 {stock["2. name"]}
//               </div>
//               <button
//                 onClick={() => onAddStock(stock["1. symbol"])}
//                 className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
//               >
//                 Add
//               </button>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default SearchStocks;

















import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const SearchStocks = ({ onAddStock }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMockData, setIsMockData] = useState(false);

  const searchStocks = async () => {
    try {
      setIsLoading(true);
      setIsMockData(false);
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Please login first");
        return;
      }

      const response = await axios.get("/api/stocks/search", {
        params: { query },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.error) {
        toast.error(response.data.error);
      }

      setResults(response.data.bestMatches || []);
      setIsMockData(response.data.isMockData || false);

      if (response.data.isMockData) {
        toast("Showing mock data as API is unavailable", { 
          icon: 'ℹ️',
          duration: 3000
        });
      }

    } catch (error) {
      console.error("Search error:", error.response?.data || error.message);
      toast.error(error.response?.data?.error || "Failed to search stocks");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks (e.g. HDFC, RELIANCE)"
          className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => e.key === "Enter" && searchStocks()}
        />
        <button
          onClick={searchStocks}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg ${
            isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </div>

      {isMockData && (
        <div className="mt-2 text-yellow-600 text-sm">
          Note: Showing mock data as API limit reached
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 border rounded-lg divide-y">
          {results.map((stock) => (
            <div
              key={stock["1. symbol"]}
              className="p-3 flex justify-between items-center"
            >
              <div>
                <span className="font-bold">{stock["1. symbol"]}</span> -{" "}
                {stock["2. name"]}
              </div>
              <button
                onClick={() => onAddStock(stock["1. symbol"])}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchStocks;