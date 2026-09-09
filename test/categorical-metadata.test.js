import assert from 'node:assert/strict';
import test from 'node:test';
import { MetadataService } from '../src/metadata-service.js';
import { buildServices } from '../src/app.js';

test('categorical metadata: extracts enum-like check constraints and shapes column metadata', async () => {
  const pool = {
    async connect() { throw new Error('connect should not be called'); },
    async query(query) {
      if (query.text.includes('FROM information_schema.tables')) {
        return { rows: [{ schema: 'public', name: 'employees' }], rowCount: 1 };
      }
      if (query.text.includes('FROM information_schema.columns')) {
        return {
          rows: [
            {
              ordinal_position: 1,
              name: 'id',
              data_type: 'bigint',
              formatted_data_type: 'bigint',
              nullable: false,
              description: null,
              estimated_rows: '240',
              enum_values: null,
              check_constraints: []
            },
            {
              ordinal_position: 2,
              name: 'employment_status',
              data_type: 'text',
              formatted_data_type: 'text',
              nullable: false,
              description: 'Current employment status',
              estimated_rows: '240',
              enum_values: null,
              check_constraints: [
                "CHECK (employment_status = ANY (ARRAY['Active'::text, 'Resigned'::text, 'On Leave'::text]))"
              ]
            },
            {
              ordinal_position: 3,
              name: 'email',
              data_type: 'character varying',
              formatted_data_type: 'character varying(150)',
              nullable: false,
              description: 'Employee email address',
              estimated_rows: '240',
              enum_values: null,
              check_constraints: []
            }
          ],
          rowCount: 3
        };
      }
      if (query.text.includes("con.contype='p'")) return { rows: [{ column: 'id' }], rowCount: 1 };
      if (query.text.includes("con.contype='f'")) return { rows: [], rowCount: 0 };
      throw new Error('Unexpected query');
    }
  };

  const registry = {
    source() { return { id: 'sample', schemas: ['public'], domainColumns: [] }; },
    pool() { return pool; }
  };

  const service = new MetadataService(registry);
  const table = await service.describeTable('sample', 'public.employees');

  const empStatus = table.columns.find((c) => c.name === 'employment_status');
  assert.equal(empStatus.column, 'employment_status');
  assert.equal(empStatus.type, 'text');
  assert.equal(empStatus.semantic_type, 'enum');
  assert.equal(empStatus.description, 'Current employment status');
  assert.deepEqual(empStatus.values, ['Active', 'Resigned', 'On Leave']);

  const email = table.columns.find((c) => c.name === 'email');
  assert.equal(email.column, 'email');
  assert.equal(email.values, null);
  assert.equal(email.semantic_type, null);
});

test('categorical metadata on live databases: exposes exact stored values for NL-to-SQL filtering', async () => {
  const services = buildServices();
  try {
    // 1. HRMS: employees.employment_status
    const hrmsDesc = await services.metadata.describeTable('hrms_db', 'public.employees');
    const empStatus = hrmsDesc.columns.find((c) => c.name === 'employment_status');
    assert.ok(empStatus);
    assert.equal(empStatus.column, 'employment_status');
    assert.equal(empStatus.semantic_type, 'enum');
    assert.deepEqual(empStatus.values, ['Active', 'On Leave', 'Resigned']);

    // PII protection: employees.email should not dump values
    const empEmail = hrmsDesc.columns.find((c) => c.name === 'email');
    assert.ok(empEmail);
    assert.equal(empEmail.values, null);
    assert.equal(empEmail.semantic_type, null);

    // 2. CRM: opportunities.opportunity_stage & leads.lead_status
    const oppDesc = await services.metadata.describeTable('crm_db', 'public.opportunities');
    const stage = oppDesc.columns.find((c) => c.name === 'opportunity_stage');
    assert.ok(stage);
    assert.equal(stage.semantic_type, 'enum');
    assert.deepEqual(stage.values, [
      'Closed Lost', 'Closed Won', 'Discovery', 'Negotiation', 'Proposal', 'Qualification'
    ]);

    const leadDesc = await services.metadata.describeTable('crm_db', 'public.leads');
    const leadStatus = leadDesc.columns.find((c) => c.name === 'lead_status');
    assert.ok(leadStatus);
    assert.equal(leadStatus.semantic_type, 'enum');
    assert.deepEqual(leadStatus.values, [
      'Contacted', 'Converted', 'Disqualified', 'New', 'Qualified'
    ]);

    // 3. ERP: sales_orders.order_status & invoices.payment_status
    const soDesc = await services.metadata.describeTable('erp_db', 'public.sales_orders');
    const orderStatus = soDesc.columns.find((c) => c.name === 'order_status');
    assert.ok(orderStatus);
    assert.equal(orderStatus.semantic_type, 'enum');
    assert.deepEqual(orderStatus.values, ['Cancelled', 'Delivered', 'Processing', 'Shipped']);

    const invDesc = await services.metadata.describeTable('erp_db', 'public.invoices');
    const paymentStatus = invDesc.columns.find((c) => c.name === 'payment_status');
    assert.ok(paymentStatus);
    assert.equal(paymentStatus.semantic_type, 'enum');
    assert.deepEqual(paymentStatus.values, ['Overdue', 'Paid', 'Partially Paid', 'Unpaid']);

    // 4. E-Commerce: orders.status (verifying exact lowercase values)
    const ecomDesc = await services.metadata.describeTable('ecommerce_db', 'public.orders');
    const ecomStatus = ecomDesc.columns.find((c) => c.name === 'status');
    assert.ok(ecomStatus);
    assert.deepEqual(ecomStatus.values, ['cancelled', 'completed']);

  } finally {
    await services.registry.close();
  }
});
