import { settings, connectionConfig } from '../src/config.js';
import { SourceRegistry } from '../src/source-registry.js';
import { MetadataService } from '../src/metadata-service.js';
import { QueryService } from '../src/query-service.js';

const base = connectionConfig(settings.sources.find((source) => source.id === 'ecommerce_db'));
for (const source of settings.sources.filter((item) => item.id !== 'ecommerce_db')) {
  const prefix = source.envPrefix;
  process.env[`${prefix}_HOST`] ??= base.host;
  process.env[`${prefix}_PORT`] ??= String(base.port);
  process.env[`${prefix}_NAME`] ??= source.id;
  process.env[`${prefix}_USER`] ??= base.user;
  process.env[`${prefix}_PASSWORD`] ??= String(base.password);
  process.env[`${prefix}_SSL`] ??= 'false';
}
const logger = { info() {}, warn() {}, error() {} };
const registry = new SourceRegistry(settings.sources, logger);
const metadata = new MetadataService(registry, settings);
const queries = new QueryService(registry, settings, logger);
const checks = {
  ecommerce_db: 'SELECT count(*) AS orders FROM public.orders',
  hrms_db: `SELECT count(*) AS employees,
    (SELECT count(*) FROM attendance) AS attendance,(SELECT count(*) FROM payroll) AS payroll,
    (SELECT count(*) FROM attendance a LEFT JOIN employees e USING(employee_id) WHERE e.employee_id IS NULL) AS orphans FROM employees`,
  crm_db: `SELECT count(*) AS customers,(SELECT count(*) FROM leads) AS leads,
    (SELECT count(*) FROM opportunities) AS opportunities,(SELECT count(*) FROM activities) AS activities,
    (SELECT count(*) FROM quote_items) AS quote_items,(SELECT count(*) FROM customer_tickets) AS tickets,
    (SELECT count(*) FROM opportunities o LEFT JOIN customers c USING(customer_id) WHERE c.customer_id IS NULL) AS orphans FROM customers`,
  erp_db: `SELECT count(*) AS products,(SELECT count(*) FROM suppliers) AS suppliers,
    (SELECT count(*) FROM inventory) AS inventory,(SELECT count(*) FROM purchase_orders) AS purchase_orders,
    (SELECT count(*) FROM purchase_order_items) AS purchase_order_items,(SELECT count(*) FROM sales_orders) AS sales_orders,
    (SELECT count(*) FROM sales_order_items) AS sales_order_items,(SELECT count(*) FROM invoices) AS invoices,
    (SELECT count(*) FROM payments) AS payments,(SELECT count(*) FROM expenses) AS expenses,
    (SELECT count(*) FROM shipments) AS shipments,
    (SELECT count(*) FROM sales_order_items i LEFT JOIN sales_orders o USING(sales_order_id) WHERE o.sales_order_id IS NULL) AS orphans FROM products`
};
const analytics = {
  ecommerce_db: `SELECT date_trunc('month',o.order_date)::date AS month,sum(i.quantity*i.unit_price) AS revenue FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.status='completed' GROUP BY 1 ORDER BY 1 DESC LIMIT 2`,
  hrms_db: `SELECT d.department_name,count(*) FILTER(WHERE e.employment_status='Active') AS active_headcount,round(avg(e.salary),2) AS average_salary FROM employees e JOIN departments d USING(department_id) GROUP BY 1 ORDER BY active_headcount DESC LIMIT 3`,
  crm_db: `SELECT opportunity_stage,count(*) AS opportunities,sum(estimated_value) AS pipeline_value FROM opportunities GROUP BY 1 ORDER BY pipeline_value DESC LIMIT 3`,
  erp_db: `SELECT payment_status,count(*) AS invoices,sum(outstanding_amount) AS outstanding_amount FROM invoices GROUP BY 1 ORDER BY outstanding_amount DESC`
};
try {
  const report = { sources: registry.list(), databases: {} };
  for (const source of settings.sources) {
    const tables = await metadata.listTables(source.id);
    const sampleTable = source.id === 'ecommerce_db' ? 'payments' : source.id === 'hrms_db' ? 'employees' : source.id === 'crm_db' ? 'opportunities' : 'invoices';
    const description = await metadata.describeTable(source.id, `public.${sampleTable}`);
    const result = await queries.execute(source.id, checks[source.id]);
    const analyticResult = await queries.execute(source.id, analytics[source.id]);
    report.databases[source.id] = { tableCount: tables.length, sampleTable, sampleColumns: description.columns.length, counts: result.rows[0], analyticsSample: analyticResult.rows };
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally { await registry.close(); }
