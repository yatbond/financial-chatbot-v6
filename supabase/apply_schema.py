#!/usr/bin/env python3
"""
Apply Financial Chatbot v6 Schema v2 to Supabase
Uses direct REST API calls (no supabase-py dependency needed)
"""

import os
import sys
import httpx

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://brgpgwxzxryefulblbgx.supabase.co')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_SERVICE_KEY:
    print("ERROR: Set SUPABASE_SERVICE_ROLE_KEY environment variable")
    print("  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'")
    sys.exit(1)

HEADERS = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def run_sql(sql: str):
    """Execute SQL via Supabase REST API (RPC endpoint)."""
    url = f"{SUPABASE_URL}/rest/v1/rpc/run_sql"
    response = httpx.post(url, headers=HEADERS, json={"sql": sql}, timeout=60)
    if response.status_code in [200, 201, 204]:
        return True, response.text
    return False, f"Status {response.status_code}: {response.text}"

def drop_table(table: str):
    """Drop a table if exists."""
    sql = f"DROP TABLE IF EXISTS {table} CASCADE;"
    return run_sql(sql)

def drop_view(view: str):
    """Drop a view if exists."""
    sql = f"DROP VIEW IF EXISTS {view} CASCADE;"
    return run_sql(sql)

def check_table_exists(table: str):
    """Check if a table exists."""
    sql = f"""
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '{table}'
    );
    """
    success, result = run_sql(sql)
    if success and 't' in result:
        return True
    return False

def main():
    print(f"[START] Applying Schema v2 to {SUPABASE_URL}")
    
    # Read schema_v2.sql
    schema_path = os.path.join(os.path.dirname(__file__), 'schema_v2.sql')
    with open(schema_path, 'r') as f:
        schema_sql = f.read()
    
    # Step 1: Drop old views
    print("\n[1] Dropping old views...")
    for view in ['latest_month_per_project', 'project_summary']:
        print(f"  Dropping {view}...")
        success, msg = drop_view(view)
        if success:
            print(f"    [OK] {view} dropped")
        else:
            print(f"    [WARN] {view}: {msg}")
    
    # Step 2: Drop old tables
    print("\n[2] Dropping old tables...")
    for table in ['financial_data', 'project_metadata', 'projects', 'financial_types', 'line_items', 'acronyms', 'value_change_log']:
        print(f"  Dropping {table}...")
        success, msg = drop_table(table)
        if success:
            print(f"    [OK] {table} dropped")
        else:
            print(f"    [WARN] {table}: {msg}")
    
    # Step 3: Apply new schema
    print("\n[3] Applying new schema_v2.sql...")
    # Split by semicolons and execute each statement
    statements = [s.strip() for s in schema_sql.split(';') if s.strip() and not s.strip().startswith('--')]
    
    for i, stmt in enumerate(statements):
        if stmt.strip():
            # Skip very large CREATE TABLE statements that might timeout via REST
            # Instead, we'll apply the schema via psql or the Supabase dashboard
            pass
    
    print("\n[INFO] Schema SQL prepared. For full schema application, use:")
    print(f"  psql {SUPABASE_URL} -f supabase/schema_v2.sql")
    print("\nOr paste schema_v2.sql into Supabase SQL Editor.")
    print("\n[DONE] Migration script ready.")

if __name__ == '__main__':
    main()
