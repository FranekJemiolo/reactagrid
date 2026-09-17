#!/usr/bin/env python3
"""
Master Build Script for Chemical Ledgers.

Executes the Python extraction and ETL pipelines to generate verified
chemical data ledgers for ReactaGrid and verifies them against the strict schemas.
Ensures public/ledgers/ and public/data/ remain synchronized.
"""

import os
import shutil
import subprocess
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_PIPELINE_DIR = os.path.join(BASE_DIR, "data-pipeline")
PUBLIC_DATA_DIR = os.path.join(BASE_DIR, "public", "data")
PUBLIC_LEDGERS_DIR = os.path.join(BASE_DIR, "public", "ledgers")

def run_step(script_name: str, description: str) -> None:
    print(f"==> {description} ({script_name})...")
    script_path = os.path.join(DATA_PIPELINE_DIR, script_name)
    result = subprocess.run([sys.executable, script_path], cwd=BASE_DIR)
    if result.returncode != 0:
        print(f"Error: Step {script_name} failed with exit code {result.returncode}")
        sys.exit(result.returncode)

def sync_ledgers() -> None:
    print(f"==> Synchronizing ledgers to {PUBLIC_LEDGERS_DIR}...")
    os.makedirs(PUBLIC_LEDGERS_DIR, exist_ok=True)
    if os.path.exists(PUBLIC_DATA_DIR):
        for filename in os.listdir(PUBLIC_DATA_DIR):
            if filename.endswith(".json"):
                src_file = os.path.join(PUBLIC_DATA_DIR, filename)
                dst_file = os.path.join(PUBLIC_LEDGERS_DIR, filename)
                shutil.copy2(src_file, dst_file)
                print(f"  Copied {filename} -> public/ledgers/")

def main() -> None:
    print("Starting ReactaGrid Chemical Ledger Build Pipeline...")
    
    # 1. Chemical Extraction from Empirical Sources
    run_step("extract_chemistry.py", "Extracting empirical molecule & reaction data")

    # 2. Automated ETL Ingestion & Tag Filtering
    run_step("etl_ingestion.py", "Running automated ETL ingestion & tag normalization")

    # 3. Synchronize to public/ledgers/ directory
    sync_ledgers()

    # 4. Strict Schema & Integrity Validation
    run_step("validate_schema.py", "Validating chemical ledgers against JSON schemas")

    print("\n✓ Chemical Ledgers built and verified successfully!")

if __name__ == "__main__":
    main()
