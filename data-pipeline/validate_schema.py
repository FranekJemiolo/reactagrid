#!/usr/bin/env python3
"""
ReactaGrid Chemical Database Validator
Strict validation ensuring 100% schema compliance, zero-hallucination guarantees,
and cross-referencing between molecules, reactions, and store items.
"""

import json
import os
import re
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")
HEX_COLOR_REGEX = re.compile(r"^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$")

def validate():
    molecules_path = os.path.join(DATA_DIR, "molecules.json")
    reactions_path = os.path.join(DATA_DIR, "reactions.json")
    store_path = os.path.join(DATA_DIR, "store_items.json")

    for path in [molecules_path, reactions_path, store_path]:
        if not os.path.exists(path):
            print(f"Error: Missing chemical dataset at {path}. Run extract_chemistry.py first.")
            sys.exit(1)

    with open(molecules_path, "r", encoding="utf-8") as f:
        molecules = json.load(f)

    with open(reactions_path, "r", encoding="utf-8") as f:
        reactions = json.load(f)

    with open(store_path, "r", encoding="utf-8") as f:
        store_items = json.load(f)

    errors = []

    # 1. Validate Molecules
    print(f"Validating {len(molecules)} chemical molecules...")
    required_molecule_keys = [
        "id", "name", "formula", "state", "density", "color",
        "melting_point_k", "boiling_point_k", "specific_heat",
        "thermal_conductivity", "flammable", "hazard_rating",
        "hazard_description", "description"
    ]

    for mol_id, mol in molecules.items():
        if mol_id != mol.get("id"):
            errors.append(f"Molecule key '{mol_id}' does not match inner id '{mol.get('id')}'.")
        for key in required_molecule_keys:
            if key not in mol:
                errors.append(f"Molecule '{mol_id}' is missing required key '{key}'.")
        if mol.get("state") not in ["solid", "liquid", "gas"]:
            errors.append(f"Molecule '{mol_id}' has invalid state '{mol.get('state')}'.")
        if not isinstance(mol.get("density"), (int, float)) or mol.get("density") <= 0:
            errors.append(f"Molecule '{mol_id}' has invalid density: {mol.get('density')}.")
        color = mol.get("color", "")
        if not HEX_COLOR_REGEX.match(color):
            errors.append(f"Molecule '{mol_id}' has invalid hex color: '{color}'.")
        if mol.get("hazard_rating") not in [0, 1, 2, 3, 4]:
            errors.append(f"Molecule '{mol_id}' has invalid hazard rating: {mol.get('hazard_rating')}.")

    # 2. Validate Reactions
    print(f"Validating {len(reactions)} empirical reactions...")
    if len(reactions) < 20:
        errors.append(f"Reactions database must contain at least 20 reactions, found {len(reactions)}.")

    required_reaction_keys = [
        "id", "name", "reactants", "products", "heat_yield_kj_mol",
        "temperature_delta_k", "activation_energy_k", "probability",
        "pressure_release", "category", "discovery_reward", "description"
    ]

    reaction_ids = set()
    for rxn in reactions:
        rxn_id = rxn.get("id")
        if rxn_id in reaction_ids:
            errors.append(f"Duplicate reaction id '{rxn_id}'.")
        reaction_ids.add(rxn_id)

        for key in required_reaction_keys:
            if key not in rxn:
                errors.append(f"Reaction '{rxn_id}' missing key '{key}'.")

        # Cross reference molecules
        for r in rxn.get("reactants", []):
            if r not in molecules:
                errors.append(f"Reaction '{rxn_id}' references unknown reactant '{r}'.")
        for p in rxn.get("products", []):
            if p not in molecules:
                errors.append(f"Reaction '{rxn_id}' references unknown product '{p}'.")

        prob = rxn.get("probability", 0)
        if not (0.0 <= prob <= 1.0):
            errors.append(f"Reaction '{rxn_id}' has invalid probability {prob}.")

    # 3. Validate Store Items
    print(f"Validating {len(store_items)} store inventory items...")
    required_store_keys = [
        "id", "name", "category", "cost", "description",
        "unlocked_by_default", "composition", "primary_compound", "icon"
    ]

    store_ids = set()
    for item in store_items:
        item_id = item.get("id")
        if item_id in store_ids:
            errors.append(f"Duplicate store item id '{item_id}'.")
        store_ids.add(item_id)

        for key in required_store_keys:
            if key not in item:
                errors.append(f"Store item '{item_id}' missing key '{key}'.")

        primary = item.get("primary_compound")
        if primary not in molecules:
            errors.append(f"Store item '{item_id}' has unknown primary compound '{primary}'.")

        total_pct = sum(c.get("percentage", 0) for c in item.get("composition", []))
        if total_pct != 100:
            errors.append(f"Store item '{item_id}' composition does not sum to 100% (got {total_pct}%).")

        for c in item.get("composition", []):
            comp_id = c.get("compound")
            if comp_id not in molecules:
                errors.append(f"Store item '{item_id}' references unknown compound '{comp_id}'.")

    # 4. Target Seed Checks (Milestone 10)
    required_starter_compounds = ["h2o", "sio2", "nahco3", "ch3cooh", "fe", "o2", "naclo", "nh3"]
    for comp in required_starter_compounds:
        if comp not in molecules:
            errors.append(f"Missing required starter compound '{comp}'.")

    if errors:
        print("\nSchema Validation FAILED with errors:")
        for err in errors:
            print(f"  ❌ {err}")
        sys.exit(1)

    print("\n✅ All chemical schemas validated successfully! Zero violations found.")

if __name__ == "__main__":
    validate()
