#!/usr/bin/env python3
"""
Startup verification script for DARK project.
Checks all system and environment dependencies before running.
"""

from __future__ import annotations

import os
import sys
import shutil
import subprocess
from pathlib import Path


def print_header(message: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {message}")
    print(f"{'='*60}\n")


def check_python_version() -> bool:
    """Check if Python version is 3.8 or higher."""
    print("✓ Python version check...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"  ✗ FAIL: Python {version.major}.{version.minor} found, but 3.8+ required")
        return False
    print(f"  ✓ PASS: Python {version.major}.{version.minor}.{version.micro}")
    return True


def check_required_commands() -> bool:
    """Check for required system commands."""
    print("✓ System command check...")
    commands = {
        "tshark": "PCAP parsing and live capture (optional but recommended)",
        "node": "Node.js runtime for backend",
        "npm": "Node.js package manager",
        "python3": "Python runtime",
    }

    all_found = True
    for cmd, description in commands.items():
        if shutil.which(cmd):
            print(f"  ✓ {cmd}: {description}")
        else:
            status = "✗ MISSING" if cmd in ["node", "npm", "python3"] else "⚠ MISSING (optional)"
            print(f"  {status}: {cmd}: {description}")
            if cmd in ["node", "npm", "python3"]:
                all_found = False

    return all_found


def check_project_structure() -> bool:
    """Verify critical project directories exist."""
    print("✓ Project structure check...")
    required_dirs = [
        "backend",
        "frontend",
        "capture",
        "processing",
        "data",
        "tests",
    ]

    all_exist = True
    for d in required_dirs:
        if Path(d).exists() and Path(d).is_dir():
            print(f"  ✓ {d}/")
        else:
            print(f"  ✗ {d}/ MISSING")
            all_exist = False

    return all_exist


def check_dependencies() -> bool:
    """Check Node.js dependencies are installed."""
    print("✓ Node.js dependencies check...")

    dirs_to_check = {
        "backend": "Backend",
        "frontend": "Frontend",
    }

    all_ok = True
    for dir_name, label in dirs_to_check.items():
        node_modules = Path(dir_name) / "node_modules"
        if node_modules.exists():
            print(f"  ✓ {label} node_modules installed")
        else:
            print(f"  ⚠ {label} node_modules NOT installed - run: npm --prefix {dir_name} install")
            all_ok = False

    return all_ok


def check_env_files() -> bool:
    """Check environment files are configured."""
    print("✓ Environment configuration check...")

    env_checks = {
        "backend/.env": "Backend configuration",
        "frontend/.env.local": "Frontend API configuration",
    }

    all_ok = True
    for env_file, label in env_checks.items():
        if Path(env_file).exists():
            print(f"  ✓ {env_file}: {label}")
        else:
            print(f"  ⚠ {env_file} NOT found - using defaults")

    return all_ok


def check_data_files() -> bool:
    """Check if sample data exists."""
    print("✓ Sample data check...")

    data_files = {
        "tests/sample_data/replay_dataset.jsonl": "Replay dataset (JSONL)",
        "tests/sample_data/replay_dataset.csv": "Replay dataset (CSV)",
        "tests/sample_data/better_capture.pcap": "Sample PCAP file",
        "tests/sample_data/better_capture2.pcap": "Sample PCAP file 2",
        "tests/sample_data/live_capture.pcap": "Sample PCAP file 3",
    }

    all_exist = True
    for file_path, description in data_files.items():
        if Path(file_path).exists():
            print(f"  ✓ {file_path}: {description}")
        else:
            print(f"  ⚠ {file_path} NOT found - {description}")

    return all_exist


def print_summary(checks: dict[str, bool]) -> None:
    """Print summary of checks."""
    print_header("SETUP VERIFICATION SUMMARY")

    passed = sum(1 for v in checks.values() if v)
    total = len(checks)

    for name, result in checks.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {name}")

    print(f"\nResult: {passed}/{total} checks passed")

    if passed == total:
        print("\n✓ All critical checks passed! You can proceed with running DARK.")
        print("\nQuick start:")
        print("  1. Install Node dependencies: npm --prefix backend install && npm --prefix frontend install")
        print("  2. Start backend: npm --prefix backend run dev")
        print("  3. Start frontend: npm --prefix frontend run dev")
        print("  4. Open http://localhost:3000 in your browser")
    else:
        print("\n✗ Some critical checks failed. Please fix the issues above.")
        sys.exit(1)


def main() -> int:
    print_header("DARK Project Setup Verification")

    checks: dict[str, bool] = {
        "Python version (3.8+)": check_python_version(),
        "System commands": check_required_commands(),
        "Project structure": check_project_structure(),
        "Node.js dependencies": check_dependencies(),
        "Environment files": check_env_files(),
        "Sample data files": check_data_files(),
    }

    print_summary(checks)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
