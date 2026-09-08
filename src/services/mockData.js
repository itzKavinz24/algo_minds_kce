/**
 * Standardized High-Fidelity Mock Dataset for AGENTVERSE.
 * Matches the backend contract exactly.
 */

export const MOCK_RESPONSES = {
  // Scenario 1: Monthly Sales Trend
  "monthly sales trend": {
    query: "Show monthly sales trend for the last year.",
    intent: {
      domain: "ecommerce",
      analysis: "trend",
      metric: "revenue"
    },
    sql: `SELECT 
  TO_CHAR(order_date, 'Mon') AS month,
  EXTRACT(MONTH FROM order_date) AS month_num,
  ROUND(SUM(total_amount), 2) AS revenue,
  COUNT(order_id) AS orders
FROM orders
WHERE order_date >= NOW() - INTERVAL '12 months'
  AND status = 'completed'
GROUP BY month, month_num
ORDER BY month_num ASC;`,
    data: [
      { month: "Jan", revenue: 1180000, orders: 1240 },
      { month: "Feb", revenue: 1250000, orders: 1310 },
      { month: "Mar", revenue: 1420000, orders: 1540 },
      { month: "Apr", revenue: 1380000, orders: 1460 },
      { month: "May", revenue: 1510000, orders: 1620 },
      { month: "Jun", revenue: 1640000, orders: 1780 },
      { month: "Jul", revenue: 1590000, orders: 1710 },
      { month: "Aug", revenue: 1720000, orders: 1850 },
      { month: "Sep", revenue: 1680000, orders: 1790 },
      { month: "Oct", revenue: 1890000, orders: 2010 },
      { month: "Nov", revenue: 2150000, orders: 2340 },
      { month: "Dec", revenue: 2480000, orders: 2710 }
    ],
    kpis: [
      { title: "Total Annual Revenue", value: 19890000, delta: "+28.4%", trend: "up", caption: "vs. previous 12 months" },
      { title: "Total Orders", value: 21360, delta: "+19.2%", trend: "up", caption: "Completed transactions" },
      { title: "Peak Month", value: "December", delta: "₹24.8L", trend: "up", caption: "Highest holiday sales" }
    ],
    visualizations: [
      {
        type: "line",
        title: "Monthly Revenue Performance",
        x: "month",
        y: "revenue",
        color: "#3F8F68"
      }
    ],
    insight: "Revenue demonstrated consistent upward momentum throughout the year, culminating in strong 46% expansion during Q4 driven by festive demand and promotional campaigns.",
    recommendations: [
      "Prepare inventory buffers — Establish safety stock 60 days prior to Q4 surge to avoid stockouts.",
      "Replicate promotional strategy — Launch the November bundle structure during Q2 mid-season.",
      "Optimize fulfillment SLAs — Streamline warehouse dispatch to maintain 24-hour delivery commitments."
    ],
    trace: [
      "intent",
      "schema",
      "sql",
      "validation",
      "query",
      "visualization"
    ],
    traceDetails: [
      { agent: "Intent Agent", status: "completed", duration: "118ms", detail: "Domain: ecommerce | Analysis: time-series trend | Metric: revenue" },
      { agent: "MCP Schema Discovery", status: "completed", duration: "245ms", detail: "Catalog: ecommerce_db | Matched tables: [orders, order_items]" },
      { agent: "SQL Agent", status: "completed", duration: "320ms", detail: "Generated aggregation query with 12-month window" },
      { agent: "Governance & Security", status: "completed", duration: "92ms", detail: "AST verified: Read-only SELECT, no schema mutations, tenant isolation validated" },
      { agent: "MCP Query Execution", status: "completed", duration: "184ms", detail: "Returned 12 rows in 184ms via connection pool" },
      { agent: "Visualization Agent", status: "completed", duration: "140ms", detail: "Selected LINE_CHART: optimal for sequential chronological trend" },
      { agent: "Insight Agent", status: "completed", duration: "210ms", detail: "Calculated Q4 acceleration and synthesized 3 strategic recommendations" }
    ]
  },

  // Scenario 2: Revenue by Category
  "revenue by category": {
    query: "Show revenue by category.",
    intent: {
      domain: "ecommerce",
      analysis: "category_comparison",
      metric: "revenue"
    },
    sql: `SELECT 
  c.category_name AS category,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue,
  COUNT(DISTINCT o.order_id) AS total_orders
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
JOIN categories c ON p.category_id = c.category_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY c.category_name
ORDER BY revenue DESC;`,
    data: [
      { category: "Electronics", revenue: 4850000, total_orders: 5400 },
      { category: "Fashion & Apparel", revenue: 3240000, total_orders: 7100 },
      { category: "Home & Kitchen", revenue: 2150000, total_orders: 3900 },
      { category: "Beauty & Personal", revenue: 1480000, total_orders: 4200 },
      { category: "Sports & Fitness", revenue: 980000, total_orders: 1950 },
      { category: "Books & Media", revenue: 420000, total_orders: 1800 }
    ],
    kpis: [
      { title: "Top Category", value: "Electronics", delta: "37% of Total", trend: "up", caption: "₹48.5L generated" },
      { title: "Active Categories", value: 6, caption: "Across all product catalogs" },
      { title: "Total Category Sales", value: 13120000, delta: "+15.8%", trend: "up", caption: "Sum across all sectors" }
    ],
    visualizations: [
      {
        type: "bar",
        title: "Revenue by Product Category",
        x: "category",
        y: "revenue",
        color: "#3F8F68"
      }
    ],
    insight: "Electronics and Fashion represent over 61% of gross enterprise revenue. Home & Kitchen shows the highest average order value despite moderate transaction volume.",
    recommendations: [
      "Expand warranty cross-sells — Bundle accessories with Electronics devices to drive incremental margin.",
      "Increase Home & Kitchen allocation — Boost inventory ahead of upcoming seasonal home décor cycle.",
      "Review media pricing — Calibrate discount thresholds for Books & Media to improve unit turn rates."
    ],
    trace: [
      "intent",
      "schema",
      "sql",
      "validation",
      "query",
      "visualization"
    ],
    traceDetails: [
      { agent: "Intent Agent", status: "completed", duration: "105ms", detail: "Domain: ecommerce | Analysis: categorical distribution" },
      { agent: "MCP Schema Discovery", status: "completed", duration: "210ms", detail: "Matched: [categories, products, order_items, orders]" },
      { agent: "SQL Agent", status: "completed", duration: "290ms", detail: "Multi-table INNER JOIN with GROUP BY category_name" },
      { agent: "Governance & Security", status: "completed", duration: "85ms", detail: "Query approved without partition overrides" },
      { agent: "MCP Query Execution", status: "completed", duration: "165ms", detail: "Fetched 6 grouped records" },
      { agent: "Visualization Agent", status: "completed", duration: "120ms", detail: "Selected BAR_CHART: optimal for categorical rank comparison" },
      { agent: "Insight Agent", status: "completed", duration: "195ms", detail: "Identified category concentration and margin levers" }
    ]
  },

  // Scenario 3: Total Revenue This Month (Single KPI)
  "total revenue this month": {
    query: "What is total revenue this month?",
    intent: {
      domain: "ecommerce",
      analysis: "metric",
      metric: "revenue"
    },
    sql: `SELECT 
  ROUND(SUM(total_amount), 2) AS current_month_revenue,
  COUNT(order_id) AS total_orders,
  ROUND(AVG(total_amount), 2) AS average_order_value
FROM orders
WHERE DATE_TRUNC('month', order_date) = DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'completed';`,
    data: [
      {
        current_month_revenue: 1420000,
        total_orders: 1540,
        average_order_value: 922.08
      }
    ],
    kpis: [
      {
        title: "Current Month Revenue",
        value: 1420000,
        delta: "+14.2%",
        trend: "up",
        caption: "vs. same period last month (₹12.44L)"
      },
      {
        title: "Month-to-Date Orders",
        value: 1540,
        delta: "+8.5%",
        trend: "up",
        caption: "Target on track (82% of monthly pacing)"
      },
      {
        title: "Avg Order Value",
        value: 922.08,
        delta: "+5.2%",
        trend: "up",
        caption: "Average basket size"
      }
    ],
    visualizations: [
      {
        type: "kpi",
        title: "Monthly Revenue Metric",
        key: "current_month_revenue"
      }
    ],
    insight: "Month-to-date performance is pacing 14.2% ahead of last month, driven primarily by an increase in average order value and steady checkout conversion.",
    recommendations: [
      "Maintain active acquisition campaigns through the remaining fiscal month.",
      "Ensure warehouse fulfillment times remain within standard 24h SLA to protect delivery ratings."
    ],
    trace: [
      "intent",
      "schema",
      "sql",
      "validation",
      "query",
      "visualization"
    ],
    traceDetails: [
      { agent: "Intent Agent", status: "completed", duration: "95ms", detail: "Domain: ecommerce | Analysis: single aggregate metric" },
      { agent: "MCP Schema Discovery", status: "completed", duration: "160ms", detail: "Table: orders | Target: total_amount" },
      { agent: "SQL Agent", status: "completed", duration: "210ms", detail: "Generated DATE_TRUNC filter for current calendar month" },
      { agent: "Governance & Security", status: "completed", duration: "78ms", detail: "Validated read-only aggregate" },
      { agent: "MCP Query Execution", status: "completed", duration: "135ms", detail: "1 record returned in 135ms" },
      { agent: "Visualization Agent", status: "completed", duration: "90ms", detail: "Selected KPI Card: single point-in-time metric requested" },
      { agent: "Insight Agent", status: "completed", duration: "170ms", detail: "Synthesized run-rate pacing analysis" }
    ]
  },

  // Scenario 4: HRMS Employee Distribution (Proves Application Independence)
  "employee distribution by department": {
    query: "Show employee distribution by department.",
    intent: {
      domain: "hrms",
      analysis: "distribution",
      metric: "headcount"
    },
    sql: `SELECT 
  d.department_name AS department,
  COUNT(e.employee_id) AS employees,
  ROUND(AVG(e.salary), 2) AS avg_salary,
  COUNT(CASE WHEN e.employment_status = 'Full-Time' THEN 1 END) AS full_time
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id
WHERE e.is_active = TRUE
GROUP BY d.department_name
ORDER BY employees DESC;`,
    data: [
      { department: "Engineering", employees: 245, avg_salary: 1450000, full_time: 240 },
      { department: "Product & Design", employees: 68, avg_salary: 1320000, full_time: 65 },
      { department: "Sales & Marketing", employees: 182, avg_salary: 980000, full_time: 175 },
      { department: "Operations & Logistics", employees: 134, avg_salary: 680000, full_time: 128 },
      { department: "Customer Support", employees: 96, avg_salary: 540000, full_time: 88 },
      { department: "HR & People", employees: 32, avg_salary: 820000, full_time: 32 },
      { department: "Finance & Legal", employees: 24, avg_salary: 1150000, full_time: 24 }
    ],
    kpis: [
      { title: "Total Active Headcount", value: 781, delta: "+12.4%", trend: "up", caption: "Across 7 global departments" },
      { title: "Largest Department", value: "Engineering", delta: "31.4% of total", caption: "245 team members" },
      { title: "Average Company Salary", value: 1045000, caption: "Annual CTC across organization" }
    ],
    visualizations: [
      {
        type: "bar",
        title: "Active Headcount by Department",
        x: "department",
        y: "employees",
        color: "#3b82f6"
      },
      {
        type: "pie",
        title: "Headcount Share by Department",
        x: "department",
        y: "employees"
      }
    ],
    insight: "Engineering and Sales comprise 54.6% of the workforce. Engineering retention rate is 94.2%, with ongoing hiring targeted at specialized AI and Platform Engineering roles.",
    recommendations: [
      "Calibrate talent acquisition pipelines for Product & Design where open requisitions remain highest.",
      "Review compensation benchmarking in Customer Support to sustain quarterly retention goals.",
      "Expand internal mobility programs between Operations and Sales teams."
    ],
    trace: [
      "intent",
      "schema",
      "sql",
      "validation",
      "query",
      "visualization"
    ],
    traceDetails: [
      { agent: "Intent Agent", status: "completed", duration: "110ms", detail: "Domain: hrms | Analysis: departmental distribution | Metric: headcount" },
      { agent: "MCP Schema Discovery", status: "completed", duration: "230ms", detail: "Target schema: hrms_core | Tables: [departments, employees]" },
      { agent: "SQL Agent", status: "completed", duration: "280ms", detail: "Generated group aggregation with active status filters" },
      { agent: "Governance & Security", status: "completed", duration: "95ms", detail: "PII masking applied: Individual salaries masked into departmental averages" },
      { agent: "MCP Query Execution", status: "completed", duration: "155ms", detail: "Executed across HRMS replica in 155ms" },
      { agent: "Visualization Agent", status: "completed", duration: "135ms", detail: "Selected dual BAR & PIE visualizations for volume and proportion" },
      { agent: "Insight Agent", status: "completed", duration: "180ms", detail: "Generated headcount concentration and staffing insights" }
    ]
  },

  // Scenario 5: Root Cause Analysis
  "why did sales decrease": {
    query: "Why did sales decrease last month?",
    intent: {
      domain: "ecommerce",
      analysis: "root_cause",
      metric: "revenue"
    },
    sql: `WITH monthly_comparison AS (
  SELECT 
    c.category_name,
    SUM(CASE WHEN DATE_TRUNC('month', o.order_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN oi.quantity * oi.unit_price ELSE 0 END) AS last_month_rev,
    SUM(CASE WHEN DATE_TRUNC('month', o.order_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 month') THEN oi.quantity * oi.unit_price ELSE 0 END) AS prior_month_rev
  FROM order_items oi
  JOIN products p ON oi.product_id = p.product_id
  JOIN categories c ON p.category_id = c.category_id
  JOIN orders o ON oi.order_id = o.order_id
  GROUP BY c.category_name
)
SELECT 
  category_name,
  last_month_rev,
  prior_month_rev,
  ROUND((last_month_rev - prior_month_rev), 2) AS absolute_diff,
  ROUND(((last_month_rev - prior_month_rev) / NULLIF(prior_month_rev, 0)) * 100, 2) AS pct_change
FROM monthly_comparison
ORDER BY absolute_diff ASC;`,
    data: [
      { factor: "Electronics Product Outage", impact_pct: 62, revenue_loss: 480000, category: "Product Supply" },
      { factor: "Checkout Gateway Latency", impact_pct: 21, revenue_loss: 160000, category: "Platform Tech" },
      { factor: "Regional Logistics Disruption (North)", impact_pct: 11, revenue_loss: 85000, category: "Fulfillment" },
      { factor: "Increased Cart Abandonment", impact_pct: 6, revenue_loss: 45000, category: "User Experience" }
    ],
    kpis: [
      { title: "Net Sales Contraction", value: "-18.4%", delta: "-₹7.7L", trend: "down", caption: "Month-over-month decline" },
      { title: "Primary Drag", value: "Electronics", delta: "62% of loss", trend: "down", caption: "Supply chain bottleneck" },
      { title: "Estimated Recovery Potential", value: "₹6.4L", delta: "+83%", trend: "up", caption: "With stock stabilization" }
    ],
    rootCauseAnalysis: {
      headline: "Root Cause: High-Ticket Electronics Inventory Depletion",
      metricDecline: "-18.4%",
      metricPeriod: "Last Month vs. Prior Month",
      contributingFactors: [
        { name: "Electronics Category Drop", share: 62, amount: "₹4.8L", reason: "Flagship smartphone stockout lasted 11 consecutive days during sale week" },
        { name: "Payment Gateway Failure Spike", share: 21, amount: "₹1.6L", reason: "Transient timeouts at checkout on Oct 14-16 caused 380 aborted carts" },
        { name: "Regional Fulfillment Delays (North)", share: 11, amount: "₹0.85L", reason: "Warehouse flooding caused delivery SLA suspension in Delhi NCR" },
        { name: "Organic Traffic Softness", share: 6, amount: "₹0.45L", reason: "Lower search traffic following conclusion of September campaign" }
      ],
      diagnosis: "The 18.4% month-over-month revenue decline was overwhelmingly concentrated in the Electronics category (accounting for 62% of the total loss). A supply chain disruption delayed delivery of top-tier smartphones by 11 days, coinciding with a temporary 3-day payment gateway failure spike.",
      evidence: [
        "Inventory log indicates SKU #EL-894 went out of stock on day 3 of the month.",
        "Payment gateway error logs showed a 4.8% failure spike between the 14th and 16th.",
        "Other categories (Fashion, Beauty) maintained steady growth of +3.2% MoM."
      ],
      recommendation: "Establish automated safety stock triggers at 20% inventory threshold for Tier-1 SKUs, and enable multi-gateway payment fallback routing to prevent checkout failure spikes."
    },
    visualizations: [
      {
        type: "bar",
        title: "Attribution of Revenue Loss by Factor (₹)",
        x: "factor",
        y: "revenue_loss",
        color: "#ef4444"
      }
    ],
    insight: "62% of the revenue drop is directly attributable to stockouts in a single flagship Electronics SKU group, compounded by payment gateway timeout spikes in mid-month.",
    recommendations: [
      "Activate dual-supplier replenishment contracts for high-velocity electronics items.",
      "Integrate redundant payment gateway failover with dynamic routing.",
      "Offer automated back-in-stock notification discounts to recover lost intent."
    ],
    trace: [
      "intent",
      "schema",
      "sql",
      "validation",
      "query",
      "visualization"
    ],
    traceDetails: [
      { agent: "Intent Agent", status: "completed", duration: "130ms", detail: "Identified diagnostic Root Cause Analysis query pattern" },
      { agent: "MCP Schema Discovery", status: "completed", duration: "280ms", detail: "Queried orders, line items, and payment_transactions logs" },
      { agent: "SQL Agent", status: "completed", duration: "340ms", detail: "Generated MoM comparative CTE with category differential variance" },
      { agent: "Governance & Security", status: "completed", duration: "100ms", detail: "Validated read-only variance query" },
      { agent: "MCP Query Execution", status: "completed", duration: "210ms", detail: "Calculated delta components across 18,400 transaction rows" },
      { agent: "Visualization Agent", status: "completed", duration: "160ms", detail: "Generated Root Cause Diagnostic presentation & attribution chart" },
      { agent: "Insight Agent", status: "completed", duration: "250ms", detail: "Synthesized multi-factor causality chain and corrective playbook" }
    ]
  },

  // Scenario 6: Executive Sales Dashboard (Multiple Visualizations)
  "executive sales dashboard": {
    query: "Create an executive sales dashboard.",
    intent: {
      domain: "ecommerce",
      analysis: "executive_overview",
      metric: "all"
    },
    sql: `SELECT 
  DATE_TRUNC('month', order_date) AS month,
  ROUND(SUM(total_amount), 2) AS total_revenue,
  COUNT(order_id) AS total_orders,
  COUNT(DISTINCT customer_id) AS active_customers
FROM orders
WHERE order_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY month
ORDER BY month ASC;`,
    data: [
      { month: "Jul", revenue: 1590000, orders: 1710, customers: 1420 },
      { month: "Aug", revenue: 1720000, orders: 1850, customers: 1530 },
      { month: "Sep", revenue: 1680000, orders: 1790, customers: 1490 },
      { month: "Oct", revenue: 1890000, orders: 2010, customers: 1680 },
      { month: "Nov", revenue: 2150000, orders: 2340, customers: 1940 },
      { month: "Dec", revenue: 2480000, orders: 2710, customers: 2210 }
    ],
    categoryBreakdown: [
      { category: "Electronics", revenue: 4850000 },
      { category: "Apparel", revenue: 3240000 },
      { category: "Home & Living", revenue: 2150000 },
      { category: "Beauty", revenue: 1480000 }
    ],
    regionBreakdown: [
      { region: "North Zone", revenue: 4200000, share: 36 },
      { region: "West Zone", revenue: 3500000, share: 30 },
      { region: "South Zone", revenue: 2450000, share: 21 },
      { region: "East Zone", revenue: 1510000, share: 13 }
    ],
    kpis: [
      { title: "H2 Gross Revenue", value: 11510000, delta: "+24.8%", trend: "up", caption: "₹1.15 Cr over last 6 months" },
      { title: "Total Volume", value: 12410, delta: "+18.3%", trend: "up", caption: "Completed orders" },
      { title: "Average Order Value", value: 3384, delta: "+6.5%", trend: "up", caption: "Per checkout" },
      { title: "Active Customers", value: 8270, delta: "+14.1%", trend: "up", caption: "Unique buyers" }
    ],
    visualizations: [
      {
        type: "line",
        title: "Revenue Velocity (Last 6 Months)",
        x: "month",
        y: "revenue",
        color: "#6366f1"
      },
      {
        type: "bar",
        title: "Category Contribution",
        x: "category",
        y: "revenue",
        data: [
          { category: "Electronics", revenue: 4850000 },
          { category: "Apparel", revenue: 3240000 },
          { category: "Home & Living", revenue: 2150000 },
          { category: "Beauty", revenue: 1480000 }
        ],
        color: "#10b981"
      },
      {
        type: "pie",
        title: "Regional Sales Distribution",
        x: "region",
        y: "share",
        data: [
          { region: "North Zone", share: 36 },
          { region: "West Zone", share: 30 },
          { region: "South Zone", share: 21 },
          { region: "East Zone", share: 13 }
        ]
      },
      {
        type: "table",
        title: "Monthly Operational Metrics",
        x: "month",
        y: "revenue"
      }
    ],
    insight: "Executive performance signals strong acceleration into Q4, with revenue reaching a half-year high of ₹24.8L in December. North and West regions continue to generate 66% of regional sales.",
    recommendations: [
      "Allocate 40% of Q1 marketing budget to North Zone to capitalize on high-conversion cohorts.",
      "Scale up regional fulfillment centers in Bangalore to expand Southern zone delivery speed.",
      "Retain Q4 seasonal buyers through automated VIP loyalty onboarding campaigns."
    ],
    trace: [
      "intent",
      "schema",
      "sql",
      "validation",
      "query",
      "visualization"
    ],
    traceDetails: [
      { agent: "Intent Agent", status: "completed", duration: "140ms", detail: "Parsed multi-faceted executive dashboard request" },
      { agent: "MCP Schema Discovery", status: "completed", duration: "290ms", detail: "Federated 3 data models: orders, customers, regional_hubs" },
      { agent: "SQL Agent", status: "completed", duration: "380ms", detail: "Synthesized multi-aggregate metrics and dimensional rollups" },
      { agent: "Governance & Security", status: "completed", duration: "90ms", detail: "Audit trail validated: Executive role access permissions verified" },
      { agent: "MCP Query Execution", status: "completed", duration: "240ms", detail: "Parallel sub-queries executed in 240ms" },
      { agent: "Visualization Agent", status: "completed", duration: "170ms", detail: "Composed 4-part executive grid: Line + Bar + Donut + Table" },
      { agent: "Insight Agent", status: "completed", duration: "230ms", detail: "Synthesized executive briefing and capital allocation recommendations" }
    ]
  },

  // Scenario 7: Follow-up Query: "Now show only Electronics."
  "now show only electronics": {
    query: "Now show only Electronics.",
    intent: {
      domain: "ecommerce",
      analysis: "filtered_trend",
      metric: "revenue",
      filter: { category: "Electronics" }
    },
    sql: `SELECT 
  TO_CHAR(o.order_date, 'Mon') AS month,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue,
  COUNT(oi.order_item_id) AS items_sold
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
JOIN categories c ON p.category_id = c.category_id
JOIN orders o ON oi.order_id = o.order_id
WHERE c.category_name = 'Electronics'
  AND o.order_date >= NOW() - INTERVAL '12 months'
  AND o.status = 'completed'
GROUP BY month, EXTRACT(MONTH FROM o.order_date)
ORDER BY EXTRACT(MONTH FROM o.order_date) ASC;`,
    data: [
      { month: "Jan", revenue: 380000, items_sold: 420 },
      { month: "Feb", revenue: 410000, items_sold: 455 },
      { month: "Mar", revenue: 490000, items_sold: 520 },
      { month: "Apr", revenue: 470000, items_sold: 495 },
      { month: "May", revenue: 530000, items_sold: 560 },
      { month: "Jun", revenue: 590000, items_sold: 630 },
      { month: "Jul", revenue: 560000, items_sold: 590 },
      { month: "Aug", revenue: 620000, items_sold: 670 },
      { month: "Sep", revenue: 610000, items_sold: 650 },
      { month: "Oct", revenue: 710000, items_sold: 760 },
      { month: "Nov", revenue: 840000, items_sold: 910 },
      { month: "Dec", revenue: 990000, items_sold: 1080 }
    ],
    kpis: [
      { title: "Electronics Annual Revenue", value: 7300000, delta: "+31.2%", trend: "up", caption: "Total segment contribution" },
      { title: "Units Sold", value: 7740, delta: "+22.5%", trend: "up", caption: "Smartphones, audio, computing" },
      { title: "Avg Unit Price", value: 943.15, delta: "+7.1%", trend: "up", caption: "Gross realization per item" }
    ],
    visualizations: [
      {
        type: "line",
        title: "Electronics Monthly Revenue Trend",
        x: "month",
        y: "revenue",
        color: "#06b6d4"
      },
      {
        type: "table",
        title: "Electronics Monthly Breakdown",
        x: "month",
        y: "revenue"
      }
    ],
    insight: "Contextual filter applied: Electronics accounted for ₹73.0L in annual gross receipts, experiencing strong holiday expansion to ₹9.9L in December.",
    recommendations: [
      "Expand inventory in premium audio and wearable accessories to complement core device sales.",
      "Partner with financing providers for EMI promotional offers during mid-year sale cycles."
    ],
    trace: [
      "intent",
      "schema",
      "sql",
      "validation",
      "query",
      "visualization"
    ],
    traceDetails: [
      { agent: "Intent Agent", status: "completed", duration: "105ms", detail: "Conversation context inherited: Filtered previous trend query to 'Electronics'" },
      { agent: "MCP Schema Discovery", status: "completed", duration: "180ms", detail: "Reused schema cache: [order_items, products, categories]" },
      { agent: "SQL Agent", status: "completed", duration: "260ms", detail: "Injected WHERE c.category_name = 'Electronics' clause" },
      { agent: "Governance & Security", status: "completed", duration: "75ms", detail: "Filter predicates validated; no full table scan hazard" },
      { agent: "MCP Query Execution", status: "completed", duration: "140ms", detail: "12 filtered rows returned in 140ms" },
      { agent: "Visualization Agent", status: "completed", duration: "115ms", detail: "Refreshed Line Chart and tabular breakdown" },
      { agent: "Insight Agent", status: "completed", duration: "175ms", detail: "Synthesized Electronics category specific performance summary" }
    ]
  },

  // Fallback Scenario (Unknown Chart Type -> Tests Graceful Fallback to Table)
  "test fallback": {
    query: "Test fallback visualization handling.",
    intent: {
      domain: "ecommerce",
      analysis: "unknown_chart_fallback",
      metric: "test"
    },
    sql: "SELECT test_name, score, status FROM system_tests;",
    data: [
      { test_name: "Security Isolation", score: 99.4, status: "Passed" },
      { test_name: "SQL Sanitization", score: 100.0, status: "Passed" },
      { test_name: "Latency Benchmark", score: 94.2, status: "Passed" },
      { test_name: "Schema Resolver", score: 98.1, status: "Passed" }
    ],
    visualizations: [
      {
        type: "unsupported_3d_galaxy_chart",
        title: "Test Unsupported Visualization Type",
        x: "test_name",
        y: "score"
      }
    ],
    insight: "The analytics engine produced a visualization spec not natively supported by the UI. The renderer gracefully caught the exception and presented the raw data as an interactive table.",
    recommendations: [
      "Fallback successful. No crash or rendering stall occurred."
    ],
    trace: ["intent", "schema", "sql", "validation", "query", "visualization"],
    traceDetails: [
      { agent: "Intent Agent", status: "completed", duration: "80ms", detail: "Diagnostics test" },
      { agent: "Visualization Agent", status: "completed", duration: "60ms", detail: "Emitted unsupported type to test UI resilience" }
    ]
  }
};

/**
 * Finds the closest mock response matching a user query string.
 */
export function getMockResponse(query) {
  if (!query) return MOCK_RESPONSES["monthly sales trend"];

  const q = query.toLowerCase().trim();

  if (q.includes("trend") || (q.includes("monthly") && q.includes("sales"))) {
    return MOCK_RESPONSES["monthly sales trend"];
  }
  if (q.includes("category") || q.includes("categories")) {
    return MOCK_RESPONSES["revenue by category"];
  }
  if (q.includes("this month") || q.includes("total revenue this month") || (q.includes("total revenue") && !q.includes("last year"))) {
    return MOCK_RESPONSES["total revenue this month"];
  }
  if (q.includes("employee") || q.includes("department") || q.includes("hrms") || q.includes("headcount")) {
    return MOCK_RESPONSES["employee distribution by department"];
  }
  if (q.includes("decrease") || q.includes("why did") || q.includes("root cause") || q.includes("drop")) {
    return MOCK_RESPONSES["why did sales decrease"];
  }
  if (q.includes("executive") || q.includes("dashboard") || q.includes("sales dashboard")) {
    return MOCK_RESPONSES["executive sales dashboard"];
  }
  if (q.includes("electronics") || q.includes("only electronics")) {
    return MOCK_RESPONSES["now show only electronics"];
  }
  if (q.includes("fallback") || q.includes("test")) {
    return MOCK_RESPONSES["test fallback"];
  }

  // Sensible default
  const defaultResp = { ...MOCK_RESPONSES["monthly sales trend"] };
  defaultResp.query = query;
  return defaultResp;
}
