/*!
 * Copyright 2024, Staffbase GmbH and contributors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { ReactElement, useState, useEffect } from "react";
import { BlockAttributes } from "widget-sdk";

/**
 * React Component
 */
export interface StockTickerProps extends BlockAttributes {
  message: string;
}

export const StockTicker = ({ message, contentLanguage }: StockTickerProps): ReactElement => {
  const [closingPrices, setClosingPrices] = useState<number[]>([]);
  const apiKey = "peVSYdi2zmCBJYWXc0pe0d_B0FP6dXO7"; // Replace with your actual API key

  useEffect(() => {
    const fetchClosingPrices = async () => {
      const today = new Date();
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(today.getDate() - 14);

      const endDate = today.toISOString().split("T")[0]; // YYYY-MM-DD
      const startDate = twoWeeksAgo.toISOString().split("T")[0];

      const apiUrl = `https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&apiKey=${apiKey}`;

      try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.results) {
          const prices = data.results.map((result: any) => result.c);
          setClosingPrices(prices);
        } else {
          console.error("No results found in Polygon.io response.", data);
        }
      } catch (error) {
        console.error("Error fetching AAPL closing prices:", error);
      }
    };

    fetchClosingPrices();
  }, []); // Empty dependency array ensures this runs only once on mount

  const generateSvgPath = (prices: number[]): string => {
    if (!prices || prices.length === 0) return "";

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    const width = 300; // Adjust as needed
    const height = 100; // Adjust as needed
    const stepX = width / (prices.length - 1);

    let path = `M 0 ${height - ((prices[0] - minPrice) / priceRange) * height}`;

    for (let i = 1; i < prices.length; i++) {
      const x = i * stepX;
      const y = height - ((prices[i] - minPrice) / priceRange) * height;
      path += ` L ${x} ${y}`;
    }

    return path;
  };

  return (
    <div>
      <h3>AAPL Closing Prices (Last 2 Weeks)</h3>
      {closingPrices.length > 0 ? (
        <div>
          <svg width="300" height="100">
            <path
              d={generateSvgPath(closingPrices)}
              stroke="green"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};