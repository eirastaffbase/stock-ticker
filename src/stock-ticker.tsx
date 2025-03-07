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
  symbol: string;
}

export const StockTicker = ({ symbol }: StockTickerProps): ReactElement => {
  const [companyName, setCompanyName] = useState<string>("");
  const [companyLogo, setCompanyLogo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closingPrices, setClosingPrices] = useState<number[]>([]);
  const [latestClose, setLatestClose] = useState<number | null>(null);
  const [prevClose, setPrevClose] = useState<number | null>(null);
  const apiKey = "peVSYdi2zmCBJYWXc0pe0d_B0FP6dXO7";
  const defaultData = [170, 172, 175, 173, 178, 180, 179, 182, 185, 183, 186];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const detailsUrl = `https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${apiKey}`;
        const detailsResponse = await fetch(detailsUrl);

        if (!detailsResponse.ok) {
          throw new Error(`HTTP error! Status: ${detailsResponse.status}`);
        }
        const detailsData = await detailsResponse.json();

        if (detailsData?.results?.name) {
          setCompanyName(detailsData.results.name);
        }

        // Fetch company logo
        if (detailsData?.results?.branding?.logo_url) {
          const logoUrl = detailsData.results.branding.logo_url;
          try {
            const logoResponse = await fetch(logoUrl + "?apiKey=" + apiKey);
            if (logoResponse.ok) {
              const svgText = await logoResponse.text();
              console.log(svgText);
              const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
              setCompanyLogo(dataUrl);
            }
          } catch (logoError) {
            console.error("Error fetching logo:", logoError);
          }
        }

        const today = new Date();
        const twoWeeksAgo = new Date(today);
        twoWeeksAgo.setDate(today.getDate() - 14);

        const endDate = today.toISOString().split("T")[0];
        const startDate = twoWeeksAgo.toISOString().split("T")[0];

        const aggsUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&apiKey=${apiKey}`;
        const aggsResponse = await fetch(aggsUrl);

        if (!aggsResponse.ok) {
          throw new Error(`HTTP error! Status: ${aggsResponse.status}`);
        }
        const aggsData = await aggsResponse.json();

        if (aggsData.results?.length) {
          const allResults = aggsData.results;
          const closes = allResults.map((result: any) => result.c);
          setClosingPrices(closes);
          const lastCloseVal = closes[closes.length - 1];
          setLatestClose(lastCloseVal);
          if (closes.length > 1) {
            setPrevClose(closes[closes.length - 2]);
          } else {
            setPrevClose(null);
          }
        } else {
          console.warn("No results found in Polygon.io daily aggregates.");
          setClosingPrices(defaultData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data. Using default values.");
        setClosingPrices(defaultData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  const generateSvgPath = (prices: number[]): string => {
    if (!prices || prices.length === 0) return "";
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const width = 300;
    const height = 75;
    const stepX = width / (prices.length - 1);
    let path = `M 0 ${height - ((prices[0] - minPrice) / priceRange) * height}`;
    for (let i = 1; i < prices.length; i++) {
      const x = i * stepX;
      const y = height - ((prices[i] - minPrice) / priceRange) * height;
      path += ` L ${x} ${y}`;
    }
    return path;
  };

  let priceChange: number | null = null;
  if (latestClose != null && prevClose != null) {
    priceChange = latestClose - prevClose;
  }
  const changeColor = priceChange && priceChange >= 0 ? "green" : "red";

  return (
    <div>
      {/* Company Logo in a Circle */}
      {companyLogo && (
        <div style={{ paddingRight: "50px", width: "50px", height: "50px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#efefef" }}>
          <img src={companyLogo} alt={`${companyName} Logo`} style={{ width: "30px", marginTop: "50%" }} />
        </div>
      )}

      <div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 600 }}>
          {symbol}
        </h1>
        <p>
          {companyName && <span>{companyName}</span>}
        </p>

        {loading && <p>Loading data...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {!loading && (
          <div>
            {latestClose !== null && (
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                ${latestClose.toFixed(2)}
              </div>
            )}

            {priceChange !== null && (
              <div style={{ color: changeColor, fontSize: "1.1rem" }}>
                ${Math.abs(priceChange).toFixed(2)}
              </div>
            )}

            {closingPrices.length > 0 && (
              <svg width="300" height="80" style={{ marginTop: "10px" }}>
                <path
                  d={generateSvgPath(closingPrices)}
                  stroke="green"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  );
};