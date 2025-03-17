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

function useWindowSize() {
  const [width, setWidth] = useState<number>(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

export interface StockTickerProps extends BlockAttributes {
  symbol: string;
  weeks: number;
  logo: string;
}

export const StockTicker = ({ symbol, weeks, logo }: StockTickerProps): ReactElement => {
  const [companyName, setCompanyName] = useState<string>("");
  const [companyLogo, setCompanyLogo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closingPrices, setClosingPrices] = useState<number[]>([]);
  const [latestClose, setLatestClose] = useState<number | null>(null);
  const [prevClose, setPrevClose] = useState<number | null>(null);

  const width = useWindowSize();
  const isMid = width < 850;   
  const isSmall = width < 705; 

  const fontSize = isSmall ? "0.7rem" : isMid ? "0.85rem" : "1rem";

  const logoSize = isSmall ? 30 : isMid ? 35 : 50;

  const svgWidth = isSmall ? 70 : isMid ? 90 : 120;
  const svgHeight = isSmall ? 30 : isMid ? 30 : 40;

  const mainPriceFontSize = isSmall ? "0.8rem" : isMid ? "0.9rem" : "1rem";
  const dailyChangeFontSize = isSmall ? "0.7rem" : isMid ? "0.8rem" : "0.9rem";

  const containerStyle: React.CSSProperties = {
    padding: "1rem 0.5rem 0.5rem",
    width: "100%",
    boxSizing: "border-box",
    minHeight: "80px",
    fontSize,
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  };

  const logoContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: `${logoSize}px`,
    height: `${logoSize}px`,
    borderRadius: "50%",
    overflow: "hidden",
    backgroundColor: "#efefef",
    flexShrink: 0,
    marginBottom: "0.5rem",
  };

  const detailsStyle: React.CSSProperties = {
    flex: 1,
    textAlign: "left",
    marginLeft: "1rem",
    minWidth: "100px",
    marginBottom: "0.5rem",
  };

  const graphPriceStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexShrink: 0,
    marginBottom: "0.5rem",
  };

  const svgStyle: React.CSSProperties = {
    marginTop: "0px",
  };

  const priceInfoStyle: React.CSSProperties = {
    textAlign: "right",
  };

  const apiKey = "peVSYdi2zmCBJYWXc0pe0d_B0FP6dXO7";
  const fallbackSymbol = "VNI";
  const fallbackCompanyName = "Vandelay Industries";
  const fallbackLogo = "https://eirastaffbase.github.io/stock-ticker/resources/VNI.png";
  const fallbackClosingPrices = [
    141, 132, 147, 159, 163, 154, 120, 175, 160.02, 185.06,
  ];

  const effectiveWeeks = weeks || 2;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // Bypass API calls if symbol is "VNI"
      if (symbol === "VNI") {
        setCompanyName(fallbackCompanyName);
        setCompanyLogo(fallbackLogo);
        setClosingPrices(fallbackClosingPrices);
        setLatestClose(185.06);
        setPrevClose(160.02);
        setLoading(false);
        return;
      }

      try {
        // Always fetch details to get the company name
        const detailsUrl = `https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        if (!detailsResponse.ok) {
          throw new Error(`HTTP error! Status: ${detailsResponse.status}`);
        }
        const detailsData = await detailsResponse.json();

        // If a custom logo is provided, use that
        let logoDataUrl = "";
        if (logo) {
          logoDataUrl = logo;
        } else if (detailsData?.results?.branding?.logo_url) {
          const polygonLogoUrl = detailsData.results.branding.logo_url + "?apiKey=" + apiKey;
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

        // Prepare date range for the aggregator
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - effectiveWeeks * 7);
        const endDateStr = today.toISOString().split("T")[0];
        const startDateStr = startDate.toISOString().split("T")[0];

        const aggsUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDateStr}/${endDateStr}?adjusted=true&sort=asc&apiKey=${apiKey}`;
        const aggsResponse = await fetch(aggsUrl);
        if (!aggsResponse.ok) {
          throw new Error(`HTTP error! Status: ${aggsResponse.status}`);
        }
        const aggsData = await aggsResponse.json();

        if (aggsData.results?.length) {
          const allResults = aggsData.results;
          const closes = allResults.map((r: any) => r.c);

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
          throw new Error("No results found in Polygon daily aggregates.");
        }
      } catch (error) {
        console.error("Error fetching data:", error);

        // Fallback
        setCompanyName(fallbackCompanyName);
        setCompanyLogo(fallbackLogo);
        setClosingPrices(fallbackClosingPrices);
        setLatestClose(185.06);
        setPrevClose(160.02);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, effectiveWeeks, logo]);

  // Simple function to generate a smooth SVG path from closing prices
  const generateSvgPath = (prices: number[]): string => {
    if (!prices || prices.length < 2) return "";

    const width = 120;
    const height = 40;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const stepX = width / (prices.length - 1);

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
  const changeColor = priceChange && priceChange >= 0 ? "green" : "red";

  return (
    <div className="stockwidget-container" style={containerStyle}>
      <div className="stockwidget-row" style={rowStyle}>
        {/* Logo */}
        <div className="stockwidget-logo" style={logoContainerStyle}>
          {companyLogo && (
            <img
              src={companyLogo}
              alt={`${companyName} Logo`}
              style={{ maxWidth: "70%", maxHeight: "70%", display: "block" }}
            />
          )}
        </div>

        {/* Symbol & Name */}
        <div className="stockwidget-details" style={detailsStyle}>
          <h2
            style={{
              margin: 0,
              fontWeight: 600,
              whiteSpace: "wrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: "15px",
            }}
          >
            {symbol}
          </h2>
          <p
            style={{
              whiteSpace: "wrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              margin: 0,
            }}
          >
            {companyName || ""}
          </p>
          {loading && <p>Loading data...</p>}
        </div>

        {/* Chart + Price Info */}
        <div className="stockwidget-graphPrice" style={graphPriceStyle}>
          {/* Chart */}
          {closingPrices.length > 1 && (
            <svg
              className="stockwidget-chart"
              width={svgWidth}
              height={svgHeight}
              viewBox="0 0 130 40"
              style={svgStyle}
            >
              <path
                d={generateSvgPath(closingPrices)}
                stroke="green"
                strokeWidth={2}
                fill="none"
              />
            </svg>
          )}

          {/* Price & Daily Change */}
          <div className="stockwidget-price" style={priceInfoStyle}>
            {latestClose !== null && (
              <div style={{ fontSize: mainPriceFontSize, fontWeight: 600 }}>
                ${latestClose.toFixed(2)}
              </div>
            )}
            {priceChange !== null && (
              <div style={{ color: changeColor, fontSize: dailyChangeFontSize }}>
                {priceChange >= 0 ? "+" : ""}
                ${Math.abs(priceChange).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
