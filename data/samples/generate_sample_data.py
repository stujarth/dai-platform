#!/usr/bin/env python3
"""
Generate interconnected demo datasets for the DAI platform.

Produces:
  - customers.parquet  (500 rows)
  - products.parquet   (50 rows)
  - sales_orders.parquet (5000 rows)
  - sales_orders.csv     (same data)

Usage:
    python generate_sample_data.py
"""

import math
import os
import random
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# ---------------------------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------------------------
SEED = 42
random.seed(SEED)

# Output directory = same directory as this script
OUTPUT_DIR = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------

FIRST_NAMES = [
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael",
    "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan",
    "Joseph", "Jessica", "Thomas", "Sarah", "Christopher", "Karen",
    "Charles", "Lisa", "Daniel", "Nancy", "Matthew", "Betty", "Anthony",
    "Margaret", "Mark", "Sandra", "Donald", "Ashley", "Steven", "Dorothy",
    "Andrew", "Kimberly", "Paul", "Emily", "Joshua", "Donna", "Kenneth",
    "Michelle", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
    "Timothy", "Deborah", "Ronald", "Stephanie", "Edward", "Rebecca",
    "Jason", "Sharon", "Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob",
    "Kathleen", "Gary", "Amy", "Nicholas", "Angela", "Eric", "Shirley",
    "Jonathan", "Anna", "Stephen", "Brenda", "Larry", "Pamela", "Justin",
    "Emma", "Scott", "Nicole", "Brandon", "Helen", "Benjamin", "Samantha",
    "Samuel", "Katherine", "Raymond", "Christine", "Gregory", "Debra",
    "Frank", "Rachel", "Alexander", "Carolyn", "Patrick", "Janet",
    "Jack", "Catherine", "Dennis", "Maria", "Jerry", "Heather",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
    "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
    "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
    "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green",
    "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz",
    "Parker", "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris",
    "Morales", "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan",
    "Cooper", "Peterson", "Bailey", "Reed", "Kelly", "Howard", "Ramos",
    "Kim", "Cox", "Ward", "Richardson", "Watson", "Brooks", "Chavez",
    "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes",
    "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long",
    "Ross", "Foster", "Jimenez", "Powell",
]

COMPANIES = [
    "Acme Corp", "Globex Industries", "Initech Solutions", "Umbrella Group",
    "Soylent Corp", "Cyberdyne Systems", "Stark Industries", "Wayne Enterprises",
    "Oscorp Technologies", "Aperture Science", "Massive Dynamic", "Prestige Worldwide",
    "Vandelay Industries", "Sterling Cooper", "Hooli", "Pied Piper",
    "Dunder Mifflin", "Wernham Hogg", "Bluth Company", "Wonka Industries",
    "Tyrell Corporation", "Weyland Corp", "LexCorp", "Benthic Petroleum",
    "Nakatomi Trading", "Gekko & Co", "Omni Consumer Products", "Rekall Inc",
    "Genco Pura", "Spacely Sprockets", "Cogswell Cogs", "Slate Rock",
    "Primatech Paper", "InGen Biotech", "Virtucon", "Strickland Propane",
    "Oceanic Airlines", "Sirius Cybernetics", "MomCorp", "Planet Express",
    "TechNova Solutions", "Pinnacle Systems", "NexGen Analytics", "Vertex Data",
    "Meridian Health", "Quantum Leap Inc", "Horizon Partners", "Atlas Group",
    "Summit Enterprises", "Keystone Labs", "Redwood Analytics", "Vanguard Digital",
    "Cascade Networks", "Polaris Software", "Cobalt Dynamics",
]

INDUSTRIES = [
    "Technology", "Healthcare", "Finance", "Retail",
    "Manufacturing", "Education", "Energy", "Real Estate",
]

CITY_STATE = [
    ("New York", "NY"), ("Los Angeles", "CA"), ("Chicago", "IL"),
    ("Houston", "TX"), ("Phoenix", "AZ"), ("Philadelphia", "PA"),
    ("San Antonio", "TX"), ("San Diego", "CA"), ("Dallas", "TX"),
    ("San Jose", "CA"), ("Austin", "TX"), ("Jacksonville", "FL"),
    ("Fort Worth", "TX"), ("Columbus", "OH"), ("Charlotte", "NC"),
    ("Indianapolis", "IN"), ("San Francisco", "CA"), ("Seattle", "WA"),
    ("Denver", "CO"), ("Nashville", "TN"), ("Oklahoma City", "OK"),
    ("Portland", "OR"), ("Las Vegas", "NV"), ("Memphis", "TN"),
    ("Louisville", "KY"), ("Baltimore", "MD"), ("Milwaukee", "WI"),
    ("Albuquerque", "NM"), ("Tucson", "AZ"), ("Fresno", "CA"),
    ("Mesa", "AZ"), ("Sacramento", "CA"), ("Atlanta", "GA"),
    ("Kansas City", "MO"), ("Omaha", "NE"), ("Colorado Springs", "CO"),
    ("Raleigh", "NC"), ("Long Beach", "CA"), ("Virginia Beach", "VA"),
    ("Miami", "FL"), ("Minneapolis", "MN"), ("Tampa", "FL"),
    ("Boston", "MA"), ("Salt Lake City", "UT"), ("Pittsburgh", "PA"),
    ("Detroit", "MI"), ("Cincinnati", "OH"), ("Cleveland", "OH"),
    ("Honolulu", "HI"), ("St. Louis", "MO"),
]

PRODUCT_NAMES = [
    "DataSync Pro", "CloudBridge Enterprise", "InsightEngine Core",
    "QueryMaster Plus", "PipelineX Standard", "FlowConnect Basic",
    "AnalyticaHub", "VaultStream Secure", "MetricWave Lite",
    "ReportForge Advanced", "StreamLink Pro", "DataMesh Gateway",
    "NexusQuery Enterprise", "CacheBoost Ultra", "SchemaSync Pro",
    "BatchRunner Standard", "LiveDash Premium", "IndexPilot Core",
    "TableauConnect Plus", "LogHarbor Secure", "ETL Express",
    "WarehouseOne Basic", "LakeView Analytics", "SparkBridge Pro",
    "ModelDeploy Enterprise", "FeatureStore Lite", "GraphQuery Plus",
    "TimeSeriesX Advanced", "AlertMonitor Pro", "DataGovernor Suite",
    "ComplianceGuard Secure", "IdentityVault Core", "AccessShield Pro",
    "EncryptStream Enterprise", "AuditTrail Plus", "StorageGrid Basic",
    "ObjectStore Premium", "ArchiveManager Lite", "ReplicaSync Standard",
    "BackupForge Ultra", "ComputeScale Pro", "ServerlessEdge Core",
    "ContainerBridge Plus", "AutoScale Advanced", "LoadBalancer Enterprise",
    "IngestPipeline Lite", "TransformHub Standard", "CleanseEngine Pro",
    "CatalogManager Suite", "LineageTracker Core",
]

PRODUCT_CATEGORIES = ["Analytics", "Integration", "Storage", "Compute", "Security"]

REGIONS = ["North America", "Europe", "APAC", "LATAM"]
REGION_WEIGHTS = [0.40, 0.30, 0.20, 0.10]

STATUSES = ["completed", "pending", "cancelled", "refunded"]
STATUS_WEIGHTS = [0.70, 0.15, 0.10, 0.05]

DISCOUNT_OPTIONS = [0, 5, 10, 15, 20]
DISCOUNT_WEIGHTS = [0.50, 0.20, 0.15, 0.10, 0.05]


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def weighted_choice(options: list, weights: list):
    """Pick a single item using cumulative-weight binary search."""
    cum = []
    total = 0.0
    for w in weights:
        total += w
        cum.append(total)
    r = random.random() * total
    for i, c in enumerate(cum):
        if r <= c:
            return options[i]
    return options[-1]


def random_date(start: datetime, end: datetime) -> datetime:
    """Uniform random datetime between *start* and *end*."""
    delta = end - start
    secs = int(delta.total_seconds())
    return start + timedelta(seconds=random.randint(0, secs))


def skewed_float(low: float, high: float, skew: float = 2.0) -> float:
    """Return a float in [low, high] skewed toward *low*."""
    return low + (high - low) * (random.random() ** skew)


# ---------------------------------------------------------------------------
# 1. Customers
# ---------------------------------------------------------------------------

def generate_customers(n: int = 500) -> pd.DataFrame:
    print(f"Generating {n} customers …")
    today = datetime.now()
    three_years_ago = today - timedelta(days=3 * 365)

    rows = []
    used_names: set[str] = set()

    for i in range(1, n + 1):
        # Ensure unique names
        while True:
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            full = f"{first} {last}"
            if full not in used_names:
                used_names.add(full)
                break

        city, state = random.choice(CITY_STATE)
        email = f"{first.lower()}.{last.lower()}@{random.choice(['gmail.com', 'outlook.com', 'yahoo.com', 'company.io', 'mail.com'])}"

        rows.append(
            {
                "customer_id": f"C{i:03d}",
                "name": full,
                "email": email,
                "company": random.choice(COMPANIES),
                "industry": random.choice(INDUSTRIES),
                "city": city,
                "state": state,
                "country": "US",
                "signup_date": random_date(three_years_ago, today).date(),
                "lifetime_value": round(skewed_float(500, 50000, skew=2.5), 2),
            }
        )

    df = pd.DataFrame(rows)
    df["signup_date"] = pd.to_datetime(df["signup_date"])
    return df


# ---------------------------------------------------------------------------
# 2. Products
# ---------------------------------------------------------------------------

def generate_products(n: int = 50) -> pd.DataFrame:
    print(f"Generating {n} products …")
    today = datetime.now()
    five_years_ago = today - timedelta(days=5 * 365)

    rows = []
    for i in range(1, n + 1):
        price = round(random.uniform(29.99, 999.99), 2)
        cost_ratio = random.uniform(0.30, 0.60)
        rows.append(
            {
                "product_id": f"P{i:03d}",
                "name": PRODUCT_NAMES[i - 1],
                "category": random.choice(PRODUCT_CATEGORIES),
                "price": price,
                "cost": round(price * cost_ratio, 2),
                "launch_date": random_date(five_years_ago, today).date(),
                "is_active": random.random() < 0.85,
            }
        )

    df = pd.DataFrame(rows)
    df["launch_date"] = pd.to_datetime(df["launch_date"])
    return df


# ---------------------------------------------------------------------------
# 3. Sales Orders (with trend + seasonality)
# ---------------------------------------------------------------------------

def generate_sales_orders(
    customers_df: pd.DataFrame,
    products_df: pd.DataFrame,
    n: int = 5000,
) -> pd.DataFrame:
    print(f"Generating {n} sales orders …")
    today = datetime.now()
    two_years_ago = today - timedelta(days=2 * 365)
    total_days = (today - two_years_ago).days

    customer_ids = customers_df["customer_id"].tolist()
    product_ids = products_df["product_id"].tolist()
    product_prices = dict(
        zip(products_df["product_id"], products_df["price"])
    )

    # ------------------------------------------------------------------
    # Build a probability density over each day in the 2-year window that
    # incorporates (a) linear growth and (b) a Q4 seasonal bump.
    # ------------------------------------------------------------------
    day_weights: list[float] = []
    for d in range(total_days + 1):
        dt = two_years_ago + timedelta(days=d)
        # Linear growth component: ramps from 1.0 to 3.0
        growth = 1.0 + 2.0 * (d / total_days)
        # Seasonal Q4 bump (Oct-Dec)
        month = dt.month
        if month >= 10:
            seasonality = 1.0 + 0.5 * ((month - 9) / 3)  # up to 1.5×
        elif month <= 2:
            seasonality = 0.85  # post-holiday dip
        else:
            seasonality = 1.0
        day_weights.append(growth * seasonality)

    # Pre-compute cumulative weights for fast sampling
    cum_weights: list[float] = []
    running = 0.0
    for w in day_weights:
        running += w
        cum_weights.append(running)
    total_weight = cum_weights[-1]

    def _sample_day_index() -> int:
        r = random.random() * total_weight
        lo, hi = 0, len(cum_weights) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            if cum_weights[mid] < r:
                lo = mid + 1
            else:
                hi = mid
        return lo

    rows = []
    for i in range(1, n + 1):
        day_idx = _sample_day_index()
        order_dt = two_years_ago + timedelta(
            days=day_idx,
            hours=random.randint(6, 22),
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59),
        )

        pid = random.choice(product_ids)
        base_price = product_prices[pid]
        # Small price variance (+-5 %)
        unit_price = round(base_price * random.uniform(0.95, 1.05), 2)
        quantity = random.randint(1, 20)
        discount_pct = weighted_choice(DISCOUNT_OPTIONS, DISCOUNT_WEIGHTS)
        total_amount = round(quantity * unit_price * (1 - discount_pct / 100), 2)

        rows.append(
            {
                "order_id": f"ORD-{i:05d}",
                "customer_id": random.choice(customer_ids),
                "product_id": pid,
                "order_date": order_dt,
                "quantity": quantity,
                "unit_price": unit_price,
                "discount_pct": discount_pct,
                "total_amount": total_amount,
                "status": weighted_choice(STATUSES, STATUS_WEIGHTS),
                "region": weighted_choice(REGIONS, REGION_WEIGHTS),
            }
        )

    df = pd.DataFrame(rows)
    df["order_date"] = pd.to_datetime(df["order_date"])
    # Sort by order_date so the file reads chronologically
    df = df.sort_values("order_date").reset_index(drop=True)
    return df


# ---------------------------------------------------------------------------
# Write helpers
# ---------------------------------------------------------------------------

def write_parquet(df: pd.DataFrame, path: Path) -> None:
    table = pa.Table.from_pandas(df)
    pq.write_table(table, str(path))
    size_mb = path.stat().st_size / (1024 * 1024)
    print(f"  -> {path.name}  ({len(df):,} rows, {size_mb:.2f} MB)")


def write_csv(df: pd.DataFrame, path: Path) -> None:
    df.to_csv(path, index=False)
    size_mb = path.stat().st_size / (1024 * 1024)
    print(f"  -> {path.name}  ({len(df):,} rows, {size_mb:.2f} MB)")


# ---------------------------------------------------------------------------
# Summary stats
# ---------------------------------------------------------------------------

def print_summary(
    customers: pd.DataFrame,
    products: pd.DataFrame,
    orders: pd.DataFrame,
) -> None:
    print("\n" + "=" * 60)
    print("DATASET SUMMARY")
    print("=" * 60)

    print(f"\nCustomers: {len(customers):,} rows")
    print(f"  Industries: {customers['industry'].nunique()}")
    print(f"  Avg lifetime value: ${customers['lifetime_value'].mean():,.2f}")
    print(f"  Signup range: {customers['signup_date'].min().date()} → {customers['signup_date'].max().date()}")

    print(f"\nProducts: {len(products):,} rows")
    print(f"  Categories: {products['category'].nunique()}")
    print(f"  Price range: ${products['price'].min():.2f} – ${products['price'].max():.2f}")
    print(f"  Active: {products['is_active'].sum()} / {len(products)}")

    print(f"\nSales Orders: {len(orders):,} rows")
    print(f"  Date range: {orders['order_date'].min().date()} → {orders['order_date'].max().date()}")
    print(f"  Unique customers: {orders['customer_id'].nunique()}")
    print(f"  Unique products: {orders['product_id'].nunique()}")
    print(f"  Total revenue: ${orders['total_amount'].sum():,.2f}")
    print(f"  Avg order value: ${orders['total_amount'].mean():,.2f}")
    print("\n  Status distribution:")
    for status, count in orders["status"].value_counts().items():
        print(f"    {status:12s}  {count:>5,}  ({count / len(orders) * 100:.1f}%)")
    print("\n  Region distribution:")
    for region, count in orders["region"].value_counts().items():
        print(f"    {region:16s}  {count:>5,}  ({count / len(orders) * 100:.1f}%)")

    # Quarterly revenue to show growth + seasonality
    quarterly = (
        orders.set_index("order_date")
        .resample("QE")["total_amount"]
        .sum()
    )
    print("\n  Quarterly revenue:")
    for period, rev in quarterly.items():
        print(f"    {period.strftime('%Y-Q') + str((period.month - 1) // 3 + 1):>8s}  ${rev:>12,.2f}")

    print("\n" + "=" * 60)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print(f"Output directory: {OUTPUT_DIR}\n")

    customers = generate_customers(500)
    products = generate_products(50)
    orders = generate_sales_orders(customers, products, 5000)

    print("\nWriting files …")
    write_parquet(customers, OUTPUT_DIR / "customers.parquet")
    write_parquet(products, OUTPUT_DIR / "products.parquet")
    write_parquet(orders, OUTPUT_DIR / "sales_orders.parquet")
    write_csv(orders, OUTPUT_DIR / "sales_orders.csv")

    print_summary(customers, products, orders)
    print("\nDone.")


if __name__ == "__main__":
    main()
