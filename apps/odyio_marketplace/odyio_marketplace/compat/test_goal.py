import frappe
from frappe.query_builder.utils import DocType
from frappe.tests.utils import FrappeTestCase

from odyio_marketplace.compat.goal import build_monthly_results_query, get_monthly_results


class TestGoalCompatibility(FrappeTestCase):
	def test_postgres_goal_aggregation_uses_column_expression(self):
		if frappe.db.db_type != "postgres":
			return

		table = DocType("Sales Invoice")
		query = build_monthly_results_query(
			"Sales Invoice",
			table,
			"base_grand_total",
			"posting_date",
			"MM-YYYY",
			{"docstatus": 1},
			"sum",
		)
		sql = query.get_sql()

		self.assertNotIn("sum('base_grand_total')", sql)
		self.assertIn('"base_grand_total"', sql)

	def test_postgres_goal_aggregation_executes(self):
		result = get_monthly_results(
			"Sales Invoice",
			"base_grand_total",
			"posting_date",
			{"docstatus": 1},
			"sum",
		)

		self.assertIsInstance(result, dict)
