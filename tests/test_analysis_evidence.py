"""Tests for execution-derived analysis evidence."""

import unittest

from orchestrator.analysis_evidence import build_analysis_evidence


class TestAnalysisEvidence(unittest.TestCase):
    def test_builds_evidence_from_executed_query(self):
        response = {
            "status": "success",
            "source": "crm_db",
            "sources": ["crm_db"],
            "data": [{"name": "A", "total_sales": 10}],
            "sourceResults": [{"source": "crm_db", "rowCount": 1}],
        }
        details = [{
            "source": "crm_db",
            "sql": "SELECT sr.name, SUM(q.total_amount) FROM sales_representatives sr JOIN quotes q ON sr.sales_rep_id=q.sales_rep_id WHERE q.status='Accepted' GROUP BY sr.name LIMIT 5",
            "tablesUsed": ["sales_representatives", "quotes"],
            "columnsUsed": ["name", "total_amount", "sales_rep_id", "status"],
        }]
        evidence = build_analysis_evidence(response, details)
        self.assertEqual(evidence["databasesAccessed"], ["crm_db"])
        self.assertEqual(evidence["recordsReturned"], 1)
        self.assertIn("quotes", evidence["tablesAccessed"])
        self.assertTrue(any(item.startswith("WHERE") for item in evidence["importantFilters"]))
        self.assertTrue(any(item.upper().startswith("SUM") for item in evidence["keyCalculations"]))

    def test_does_not_copy_unrelated_or_secret_fields(self):
        response = {
            "status": "success", "source": "ecommerce_db",
            "sql": "SELECT COUNT(*) FROM orders", "data": [{"count": 2}],
            "password": "do-not-expose", "connectionString": "secret",
        }
        evidence = build_analysis_evidence(response)
        serialized = str(evidence)
        self.assertNotIn("do-not-expose", serialized)
        self.assertNotIn("connectionString", serialized)


if __name__ == "__main__":
    unittest.main()

