import React from "react"
import {screen, render} from "@testing-library/react"

import {StockTicker} from "./stock-ticker";

describe("StockTicker", () => {
    it("should render the component", () => {
        render(<StockTicker contentLanguage="en_US" symbol="World"/>);

        expect(screen.getByText(/Hello World/)).toBeInTheDocument();
    })
})
