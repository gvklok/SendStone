"""Quick test script to verify Supabase connection and query data."""
import os
from dotenv import load_dotenv
from supabase import create_client

# Load .env
load_dotenv()

# Connect
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY")
print(f"Connecting to: {url}")

client = create_client(url, key)
supabase = client.schema("v2")  # Use v2 schema!

# Test 1: Query routes table
print("\n=== Testing routes table (v2 schema) ===")
try:
    response = supabase.table("routes").select("*").limit(3).execute()
    print(f"Found {len(response.data)} routes")
    if response.data:
        print(f"Sample route keys: {list(response.data[0].keys())}")
        print(f"Sample route: {response.data[0]}")
except Exception as e:
    print(f"Error querying routes: {e}")

# Test 2: Query route_holds table
print("\n=== Testing route_holds table (v2 schema) ===")
try:
    response = supabase.table("route_holds").select("*").limit(5).execute()
    print(f"Found {len(response.data)} holds")
    if response.data:
        print(f"Sample hold keys: {list(response.data[0].keys())}")
        print(f"Sample holds: {response.data[:2]}")
except Exception as e:
    print(f"Error querying route_holds: {e}")

# Test 3: Query profiles table
print("\n=== Testing profiles table (v2 schema) ===")
try:
    response = supabase.table("profiles").select("*").limit(2).execute()
    print(f"Found {len(response.data)} profiles")
    if response.data:
        print(f"Sample profile keys: {list(response.data[0].keys())}")
except Exception as e:
    print(f"Error querying profiles: {e}")

# Test 4: Try routes_with_holds view
print("\n=== Testing routes_with_holds view (v2 schema) ===")
try:
    response = supabase.table("routes_with_holds").select("*").limit(2).execute()
    print(f"Found {len(response.data)} routes from view")
    if response.data:
        print(f"Sample route keys: {list(response.data[0].keys())}")
except Exception as e:
    print(f"Error querying routes_with_holds: {e}")

print("\n=== Done ===")
