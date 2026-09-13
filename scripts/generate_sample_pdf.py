import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf():
    os.makedirs("public/samples", exist_ok=True)
    pdf_path = "public/samples/equity_valuation.pdf"
    
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#111111'),
        spaceAfter=15
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1a1a1a'),
        spaceBefore=14,
        spaceAfter=10
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#2d3748'),
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor('#222222'),
        spaceAfter=8
    )

    formula_style = ParagraphStyle(
        'Formula_Custom',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#0f172a'),
        leftIndent=20,
        spaceBefore=6,
        spaceAfter=8
    )

    quote_style = ParagraphStyle(
        'Quote_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569'),
        leftIndent=15,
        spaceBefore=6,
        spaceAfter=8
    )

    story = []

    # Page 1: Title & Overview
    story.append(Paragraph("CFA Level I Study Program", quote_style))
    story.append(Paragraph("Equity Valuation & Financial Analysis", title_style))
    story.append(Paragraph("Volume 4: Corporate Finance & Asset Valuation Frameworks", h2_style))
    story.append(Spacer(1, 15))
    story.append(Paragraph(
        "Welcome to the comprehensive study module on Equity Valuation. In this curriculum, "
        "candidates explore fundamental valuation principles, discounted cash flow (DCF) models, "
        "multi-stage dividend discount techniques, the Weighted Average Cost of Capital (WACC), "
        "and Terminal Value computations. As future portfolio managers and financial analysts, "
        "mastering these foundational formulas and concepts is paramount for rigorous asset pricing.",
        body_style
    ))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Chapter Outline & Learning Objectives", h2_style))
    story.append(Paragraph("• Chapter 1: Foundations of Intrinsic Value and Market Price", body_style))
    story.append(Paragraph("• Chapter 2: Discounted Cash Flow (DCF) & Free Cash Flow Models", body_style))
    story.append(Paragraph("• Chapter 3: The Weighted Average Cost of Capital (WACC)", body_style))
    story.append(Paragraph("• Chapter 4: Terminal Value and Multi-Stage Growth Horizons", body_style))
    story.append(Paragraph("• Chapter 5: Market Multiples & Comparative Valuation", body_style))
    story.append(Paragraph("• Chapter 6: Review Questions, Scenarios & Practice Exercises", body_style))
    story.append(PageBreak())

    # Page 2: Chapter 1 - Intrinsic Value
    story.append(Paragraph("Chapter 1: Foundations of Intrinsic Value", h1_style))
    story.append(Paragraph(
        "Intrinsic value represents the estimated true or fundamental value of an asset based on complete "
        "analysis of its qualitative and quantitative characteristics, independent of current market quotation. "
        "An equity security is said to be undervalued if market price is lower than intrinsic value, and "
        "overvalued if market price exceeds intrinsic value.",
        body_style
    ))
    story.append(Paragraph("The Convergence Hypothesis", h2_style))
    story.append(Paragraph(
        "Financial theory posits that in the long run, efficient market forces will drive market price toward "
        "intrinsic value. Discrepancies persist in the short term due to informational asymmetry, cognitive "
        "biases, liquidity constraints, and varying analyst projections.",
        body_style
    ))
    story.append(Paragraph(
        "Alpha Generation Formula:",
        h2_style
    ))
    story.append(Paragraph("Alpha = Realized Return - Expected Return (based on CAPM)", formula_style))
    story.append(Paragraph(
        "Where the Capital Asset Pricing Model (CAPM) specifies expected return as: "
        "E(R) = Rf + Beta * [E(Rm) - Rf]. Here Rf denotes the risk-free benchmark and [E(Rm) - Rf] is the equity risk premium.",
        body_style
    ))
    story.append(PageBreak())

    # Page 3: Chapter 2 - Discounted Cash Flow
    story.append(Paragraph("Chapter 2: Discounted Cash Flow (DCF) Valuation", h1_style))
    story.append(Paragraph(
        "The Discounted Cash Flow approach values an asset based on the present value of its expected future cash flows, "
        "discounted at a rate that reflects the inherent riskiness of those cash flows.",
        body_style
    ))
    story.append(Paragraph("Free Cash Flow to Firm (FCFF)", h2_style))
    story.append(Paragraph(
        "FCFF represents cash flow available to all capital providers (both debt and equity holders) after fulfilling all "
        "operating expenses, taxes, working capital investments, and fixed capital expenditures:",
        body_style
    ))
    story.append(Paragraph("FCFF = NI + NCC + Int * (1 - TaxRate) - FCInv - WCInv", formula_style))
    story.append(Paragraph(
        "Where NI is Net Income, NCC is Non-Cash Charges (e.g., depreciation and amortization), "
        "Int is interest expense, FCInv is fixed capital investment, and WCInv is net working capital investment.",
        body_style
    ))
    story.append(Paragraph("Free Cash Flow to Equity (FCFE)", h2_style))
    story.append(Paragraph("FCFE = FCFF - Int * (1 - TaxRate) + Net Borrowing", formula_style))
    story.append(Paragraph(
        "FCFE represents the residual cash flow remaining specifically for common shareholders.",
        body_style
    ))
    story.append(PageBreak())

    # Page 4: Chapter 3 - WACC
    story.append(Paragraph("Chapter 3: Weighted Average Cost of Capital (WACC)", h1_style))
    story.append(Paragraph(
        "The Weighted Average Cost of Capital is the overall required rate of return of a firm, weighted according to "
        "the market values of its debt and equity financing components.",
        body_style
    ))
    story.append(Paragraph("WACC Formulation:", h2_style))
    story.append(Paragraph("WACC = (Wd * Rd * (1 - t)) + (We * Re) + (Wp * Rp)", formula_style))
    story.append(Paragraph(
        "Where Wd is the weight of debt, Rd is pre-tax cost of debt, t is the marginal corporate tax rate, "
        "We is the weight of common equity, Re is cost of equity, Wp is weight of preferred stock, and Rp is cost of preferred.",
        body_style
    ))
    story.append(Paragraph("Cost of Debt After Tax", h2_style))
    story.append(Paragraph(
        "Because interest payments on debt are tax-deductible in most jurisdictions, the after-tax cost of debt "
        "is reduced to Rd * (1 - t). Conversely, dividends paid to equity holders are not tax-deductible.",
        body_style
    ))
    story.append(Paragraph("Pitfalls in WACC Calculation", h2_style))
    story.append(Paragraph(
        "A frequent error made by candidates is employing book value weights instead of market value weights. "
        "Market value weights accurately capture the economic opportunity cost of capital committed to the firm.",
        body_style
    ))
    story.append(PageBreak())

    # Page 5: Chapter 4 - Terminal Value
    story.append(Paragraph("Chapter 4: Terminal Value & Long-Term Growth", h1_style))
    story.append(Paragraph(
        "In a standard two-stage DCF, detailed forecasts are formulated for an explicit forecast horizon (typically 5 to 10 years). "
        "The Terminal Value (TV) captures the value of all cash flows beyond this forecast window.",
        body_style
    ))
    story.append(Paragraph("Gordon Growth Model for Terminal Value:", h2_style))
    story.append(Paragraph("Terminal Value (TV_n) = (FCFF_(n+1)) / (WACC - g)", formula_style))
    story.append(Paragraph(
        "Where FCFF_(n+1) = FCFF_n * (1 + g), and g is the perpetual long-term growth rate. Note that g must not exceed "
        "the sustainable long-term growth rate of the macroeconomic economy (typically 2% to 3.5%).",
        body_style
    ))
    story.append(Paragraph("Exit Multiple Approach", h2_style))
    story.append(Paragraph(
        "Alternatively, analysts estimate TV by applying an industry benchmark multiple (such as EV/EBITDA or P/E) to the "
        "terminal year financial metric: TV_n = EBITDA_n * Benchmark Multiple.",
        body_style
    ))
    story.append(PageBreak())

    # Page 6: Chapter 5 - Market Multiples
    story.append(Paragraph("Chapter 5: Market Multiples & Relative Valuation", h1_style))
    story.append(Paragraph(
        "Relative valuation compares a company's price to an underlying financial metric across comparable peers in the same industry.",
        body_style
    ))
    story.append(Paragraph("Price-to-Earnings Ratio (P/E)", h2_style))
    story.append(Paragraph(
        "Trailing P/E utilizes earnings over the previous 12 months, whereas Forward P/E utilizes estimated earnings for the next 12 months.",
        body_style
    ))
    story.append(Paragraph("Enterprise Value Multiples (EV/EBITDA)", h2_style))
    story.append(Paragraph(
        "Enterprise Value is calculated as: EV = Market Capitalization + Market Value of Debt + Preferred Stock + Minority Interest - Cash & Short Term Investments.",
        body_style
    ))
    story.append(Paragraph(
        "EV/EBITDA is capital structure neutral, making it ideal for cross-border comparisons or companies with disparate leverage levels.",
        body_style
    ))
    story.append(PageBreak())

    # Page 7: Chapter 6 - Practice Questions
    story.append(Paragraph("Chapter 6: Practice Examination Questions", h1_style))
    story.append(Paragraph("Question 1 (Topic: WACC)", h2_style))
    story.append(Paragraph(
        "A company has a target capital structure of 40% debt and 60% equity. Its pre-tax cost of debt is 6%, "
        "its cost of equity is 11%, and its marginal tax rate is 25%. What is the company's WACC?",
        body_style
    ))
    story.append(Paragraph("A) 7.80%    B) 8.40%    C) 9.00%    D) 9.50%", body_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Question 2 (Topic: Terminal Value)", h2_style))
    story.append(Paragraph(
        "In a Gordon Growth Model valuation, if the perpetual growth rate (g) exceeds the discount rate (r), "
        "what is the mathematical implication for the calculated asset value?",
        body_style
    ))
    story.append(Paragraph(
        "A) The value approaches zero.\n"
        "B) The model produces an undefined or negative valuation.\n"
        "C) The value remains stable at the current book value.\n"
        "D) The valuation converges to the risk-free rate.",
        body_style
    ))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Question 3 (Topic: Intrinsic Value)", h2_style))
    story.append(Paragraph(
        "According to modern equity valuation theory, intrinsic value is defined as:",
        body_style
    ))
    story.append(Paragraph(
        "A) The latest closing market price on an organized stock exchange.\n"
        "B) The liquidation value of assets under forced bankruptcy conditions.\n"
        "C) The estimated fundamental value based on future cash flows and qualitative characteristics.\n"
        "D) Historical purchase cost adjusted solely for cumulative inflation.",
        body_style
    ))
    story.append(PageBreak())

    # Page 8: Formula Summary Cheat Sheet
    story.append(Paragraph("Formula Summary Cheat Sheet", h1_style))
    story.append(Paragraph("1. Capital Asset Pricing Model (CAPM):", h2_style))
    story.append(Paragraph("Re = Rf + Beta * (Rm - Rf)", formula_style))
    story.append(Paragraph("2. Weighted Average Cost of Capital (WACC):", h2_style))
    story.append(Paragraph("WACC = [Wd * Rd * (1 - t)] + [We * Re]", formula_style))
    story.append(Paragraph("3. Gordon Growth Dividend Model:", h2_style))
    story.append(Paragraph("P0 = D1 / (r - g) = [D0 * (1 + g)] / (r - g)", formula_style))
    story.append(Paragraph("4. Free Cash Flow to Firm (from Net Income):", h2_style))
    story.append(Paragraph("FCFF = NI + NCC + Int*(1 - t) - FCInv - WCInv", formula_style))
    story.append(Paragraph("5. Enterprise Value:", h2_style))
    story.append(Paragraph("EV = Market Cap + Total Debt + Preferred - Cash", formula_style))

    doc.build(story)
    print(f"Generated sample academic PDF at {pdf_path}")

if __name__ == "__main__":
    generate_pdf()
