import json
import os
import sys
import io
from dotenv import load_dotenv

# Ensure stdout and stderr handle unicode on all Windows terminals safely
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from agents.agent_pipeline import AgentPipeline
from llm.groq_client import get_groq_client

load_dotenv()


def display_pipeline_result(result) -> None:
    """Format and print the multi-agent pipeline result."""
    print("\n" + "=" * 70)
    print(" PIPELINE EXECUTION RESULTS")
    print("=" * 70)

    # 1. Intent Section
    print("\n## INTENT")
    intent_data = result.intent
    print(f"  Domain        : {intent_data.get('domain')}")
    print(f"  Analysis Type : {intent_data.get('analysis')}")
    print(f"  Metric        : {intent_data.get('metric')}")
    print(f"  Time Period   : {intent_data.get('time_period')}")
    print(f"  Grouping      : {intent_data.get('grouping')}")
    print(f"  Filters       : {intent_data.get('filters')}")
    print(f"  Is RCA Query  : {intent_data.get('is_root_cause_query')}")

    # 2. SQL Section
    print("\n## SQL")
    sql_data = result.sql
    print(f"  Generated Query :\n    {sql_data.get('sql')}")
    print(f"  Tables Used     : {sql_data.get('tables_used')}")
    print(f"  Explanation     : {sql_data.get('explanation')}")

    # 3. Analytics Section
    print("\n## ANALYTICS")
    analytics_data = result.analytics
    print(f"  Executive Summary :\n    {analytics_data.get('summary')}")
    print("\n  Key Insights:")
    for insight in analytics_data.get("key_insights", []):
        print(f"    * {insight}")

    if analytics_data.get("anomalies"):
        print("\n  Anomalies Detected:")
        for anomaly in analytics_data.get("anomalies", []):
            print(f"    ! {anomaly}")

    if analytics_data.get("recommendations"):
        print("\n  Recommendations:")
        for rec in analytics_data.get("recommendations", []):
            print(f"    > {rec}")

    if analytics_data.get("suggested_chart_type"):
        print(f"\n  Suggested Visualization : {analytics_data.get('suggested_chart_type')}")

    # 4. Root Cause Section (if triggered)
    if result.root_cause:
        print("\n## ROOT CAUSE (RCA DIAGNOSTIC REPORT)")
        rca_data = result.root_cause
        print(f"  Primary Contributor : {rca_data.get('primary_contributor')}")
        print(f"  Confidence Level    : {rca_data.get('confidence')}")
        print(f"  Diagnostic Summary  :\n    {rca_data.get('findings_summary')}")

        if rca_data.get("evidence"):
            print("\n  Evaluated Evidence:")
            for ev in rca_data.get("evidence", []):
                support_badge = f"[{ev.get('support', '').upper()}]"
                contrib_badge = f" (Contribution: {ev.get('contribution_percent')}%)" if ev.get('contribution_percent') else ""
                print(f"    * {support_badge}{contrib_badge} {ev.get('hypothesis_id')}: {ev.get('finding')}")

        if rca_data.get("recommendations"):
            print("\n  Diagnostic Action Items:")
            for r in rca_data.get("recommendations", []):
                print(f"    > {r}")

    # 5. Trace Section
    print("\n## TRACE")
    print(f"  Pipeline Flow : {' -> '.join(result.trace)}")
    print("=" * 70 + "\n")


def main() -> None:
    """Run the interactive AgentVerse terminal loop."""
    print("=" * 70)
    print("  AgentVerse-2K26 - Agent Layer CLI")
    print("=" * 70)

    # Check for GROQ_API_KEY
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key or api_key == "your_api_key_here":
        print("\n[CONFIGURATION NOTICE] GROQ_API_KEY is not set or using placeholder.")
        print("To run with real Groq LLM inference, configure your .env file:")
        print("  GROQ_API_KEY=gsk_yourActualApiKey\n")
        print("Starting in offline mode (unit tests are still fully operational).\n")

    try:
        pipeline = AgentPipeline()
    except Exception as e:
        print(f"[INITIALIZATION ERROR] {e}")
        print("Please check your .env configuration or run tests with: python -m unittest discover tests")
        return

    print("Pipeline ready! Try asking:")
    print("  1. 'Show monthly sales trend for the last year.'")
    print("  2. 'Show revenue by category.'")
    print("  3. 'What is total revenue this month?'")
    print("  4. 'Show employee distribution by department.'")
    print("  5. 'Why did sales decrease last month?'")
    print("\nType 'exit' or 'quit' to stop.\n")

    while True:
        try:
            user_question = input("Enter your business question:\n> ").strip()
            if not user_question:
                continue

            if user_question.lower() in ("exit", "quit", "q"):
                print("Goodbye!")
                break

            print("\nProcessing across Agent Layer...")
            result = pipeline.process_question(user_question)
            display_pipeline_result(result)

        except KeyboardInterrupt:
            print("\nExiting. Goodbye!")
            break
        except Exception as e:
            print(f"\n[EXECUTION ERROR] {e}\n")


if __name__ == "__main__":
    main()
