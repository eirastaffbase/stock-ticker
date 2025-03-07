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
  // Values to use if nothing loads from Polygon:
  const fallbackSymbol = "VNI";
  const fallbackCompanyName = "Vandelay Industries";
  // The fallback logo you provided:
  const fallbackLogo =
    "https://app.staffbase.com/api/media/secure/external/v2/image/upload/c_limit,w_2000,h_2000/67b8d9d39089da19934cdc66.png";
  const fallbackClosingPrices = [141, 132.0, 159, 163, 175, 180, 179, 182, 185.06];


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Fetch Ticker Details for company name
        const detailsUrl = `https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        if (!detailsResponse.ok) {
          throw new Error(`HTTP error! Status: ${detailsResponse.status}`);
        }
        const detailsData = await detailsResponse.json();

        // 2) Possibly fetch a logo if the branding is there
        let logoDataUrl = "";
        if (detailsData?.results?.branding?.logo_url) {
          const polygonLogoUrl =
            detailsData.results.branding.logo_url + "?apiKey=" + apiKey;
          try {
            const logoResponse = await fetch(polygonLogoUrl);
            if (logoResponse.ok) {
              const svgText = await logoResponse.text();
              logoDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
            }
          } catch (logoError) {
            console.error("Error fetching logo:", logoError);
          }
        }

        // 3) Fetch daily aggregates for the chart and pricing
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

        // If we actually got results
        if (aggsData.results?.length) {
          const allResults = aggsData.results;
          const closes = allResults.map((r: any) => r.c);

          // Use Polygon name if available:
          if (detailsData?.results?.name) {
            setCompanyName(detailsData.results.name);
          }
          setCompanyLogo(logoDataUrl);
          setClosingPrices(closes);

          const lastCloseVal = closes[closes.length - 1];
          setLatestClose(lastCloseVal);

          if (closes.length > 1) {
            setPrevClose(closes[closes.length - 2]);
          } else {
            setPrevClose(null);
          }
        } else {
          // If no results, treat as a fail and use fallback data
          throw new Error("No results found in Polygon daily aggregates.");
        }
      } catch (error) {
        console.error("Error fetching data:", error);

        // -- Fallback data if ANYTHING fails --
        // Symbol
        symbol = fallbackSymbol;
        setCompanyName(fallbackCompanyName);
        setCompanyLogo(fallbackLogo);
        setClosingPrices(fallbackClosingPrices);
        setLatestClose(185.06);
        // If we want the difference to be 53.06 exactly,
        // then the previous close must be 132.0
        setPrevClose(132.0);

        // Hide the error in the UI, only log to console:
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  // Creates a smooth cubic Bézier curve path from closing prices
  const generateSvgPath = (prices: number[]): string => {
    if (!prices || prices.length < 2) return "";

    const width = 150; // total width of chart
    const height = 60; // total height of chart
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const stepX = width / (prices.length - 1);

    // Convert each price to (x,y)
    const points = prices.map((price, i) => {
      const x = i * stepX;
      const y = height - ((price - minPrice) / priceRange) * height;
      return { x, y };
    });

    let pathD = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      const cp0 = { x: cpX, y: p0.y };
      const cp1 = { x: cpX, y: p1.y };
      pathD += ` C ${cp0.x},${cp0.y} ${cp1.x},${cp1.y} ${p1.x},${p1.y}`;
    }

    return pathD;
  };

  let priceChange: number | null = null;
  if (latestClose !== null && prevClose !== null) {
    priceChange = latestClose - prevClose;
  }

  // Choose color based on the sign of priceChange
  const changeColor = priceChange && priceChange >= 0 ? "green" : "red";

  return (
    <div
      style={{
        padding: "1rem 0.5rem 0.5rem",
        display: "flex",
        alignItems: "center",
        width: "100%",
        boxSizing: "border-box",
        justifyContent: "space-between",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          overflow: "hidden",
          backgroundColor: "#efefef",
        }}
      >
        {companyLogo && (
          <img
            src={companyLogo}
            alt={`${companyName} Logo`}
            style={{
              maxWidth: "70%",
              maxHeight: "70%",
              display: "block",
            }}
          />
        )}
      </div>

      {/* Symbol & Name */}
      <div style={{ flex: 1, textAlign: "left", marginLeft: "1rem" }}>
        <h2 style={{ margin: 0, fontWeight: 600 }}>{symbol}</h2>
        <p style={{ margin: "4px 0" }}>{companyName || ""}</p>
        {loading && <p>Loading data...</p>}
        {/* We do NOT render the error, we only log it in the console */}
      </div>

      {/* Chart + Price Info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        {/* Chart */}
        {closingPrices.length > 1 && (
          <svg width="140" height="80" style={{ marginTop: "10px"}}>
            <path
              d={generateSvgPath(closingPrices)}
              stroke="green"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        )}

        {/* Price & Daily Change */}
        <div style={{ textAlign: "right", minWidth: "70px" }}>
          {latestClose !== null && (
            <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
              ${latestClose.toFixed(2)}
            </div>
          )}
          {priceChange !== null && (
            <div style={{ color: changeColor }}>
              {priceChange >= 0 ? "+" : ""}
              ${Math.abs(priceChange).toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};