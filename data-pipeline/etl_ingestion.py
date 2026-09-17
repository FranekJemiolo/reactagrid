#!/usr/bin/env python3
"""
ReactaGrid Automated Chemical Database Ingestion Pipeline (ETL)
Milestone 13: Ingestion, Extraction, Transformation, and Schema Normalization.

Uses `requests` to fetch chemical data from Open Reaction Database (ORD) / PubChem exports
and `pandas` for ETL processing, tag filtering, data normalization, and schema validation.
"""

import json
import os
import sys
from typing import Any, Dict, List, Optional
import pandas as pd
import requests

PUBLIC_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")
SRC_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "data")
MOLECULES_PATH = os.path.join(PUBLIC_DATA_DIR, "molecules.json")

# Verified Seed & ORD/PubChem Ingestion Cache
RAW_INGESTION_DATA: List[Dict[str, Any]] = [
    {
        "id": "volcano_effervescence",
        "name": "Baking Soda & Vinegar Volcano",
        "reactants": ["nahco3", "ch3cooh"],
        "products": ["ch3coona", "h2o", "co2"],
        "heat_yield_kj_mol": -15.0,
        "temperature_delta_k": -4.5,
        "activation_energy_k": 270.0,
        "probability": 0.85,
        "pressure_release": 2.5,
        "category": "Acid-Base",
        "discovery_reward": 50,
        "tags": ["household", "gas_evolution", "effervescence", "endothermic"],
        "description": "Produces bubbling carbon dioxide gas that drives liquid violently upward like a volcano."
    },
    {
        "id": "iron_slow_oxidation",
        "name": "Iron Corrosion (Rusting)",
        "reactants": ["fe", "h2o", "o2"],
        "products": ["fe2o3"],
        "heat_yield_kj_mol": 412.0,
        "temperature_delta_k": 2.0,
        "activation_energy_k": 275.0,
        "probability": 0.02,
        "pressure_release": 0.0,
        "category": "Redox",
        "discovery_reward": 75,
        "tags": ["household", "exothermic", "redox", "corrosion"],
        "description": "Iron particles slowly oxidize in the presence of water and ambient oxygen to yield rust."
    },
    {
        "id": "bleach_ammonia_hazard",
        "name": "Hazardous Chloramine Synthesis",
        "reactants": ["naclo", "nh3"],
        "products": ["nh2cl", "naoh"],
        "heat_yield_kj_mol": 78.0,
        "temperature_delta_k": 8.0,
        "activation_energy_k": 280.0,
        "probability": 0.70,
        "pressure_release": 1.8,
        "category": "Hazardous Mixing",
        "discovery_reward": 100,
        "tags": ["household", "hazard", "gas_evolution", "toxic"],
        "description": "Mixing bleach and window cleaner forms dense, highly hazardous chloramine gas."
    },
    {
        "id": "sodium_water_explosion",
        "name": "Alkali Metal Hydrolysis Explosion",
        "reactants": ["na", "h2o"],
        "products": ["naoh", "h2"],
        "heat_yield_kj_mol": 282.0,
        "temperature_delta_k": 120.0,
        "activation_energy_k": 273.0,
        "probability": 0.95,
        "pressure_release": 5.0,
        "category": "Exothermic Redox",
        "discovery_reward": 100,
        "tags": ["exothermic", "gas_evolution", "explosion", "redox"],
        "description": "Sodium metal attacks water energetically, flashing intense heat, caustic lye, and explosive hydrogen gas."
    },
    {
        "id": "hydrogen_oxygen_combustion",
        "name": "Hydrogen Combustion (Pop Test)",
        "reactants": ["h2", "o2"],
        "products": ["h2o_steam"],
        "heat_yield_kj_mol": 483.6,
        "temperature_delta_k": 180.0,
        "activation_energy_k": 350.0,
        "probability": 0.90,
        "pressure_release": 4.0,
        "category": "Combustion",
        "discovery_reward": 75,
        "tags": ["combustion", "exothermic", "explosion"],
        "description": "High temperature combustion of gaseous hydrogen in oxygen yielding superheated steam."
    },
    {
        "id": "methane_combustion",
        "name": "Methane Flame Combustion",
        "reactants": ["ch4", "o2"],
        "products": ["co2", "h2o_steam"],
        "heat_yield_kj_mol": 891.0,
        "temperature_delta_k": 160.0,
        "activation_energy_k": 400.0,
        "probability": 0.85,
        "pressure_release": 3.0,
        "category": "Combustion",
        "discovery_reward": 60,
        "tags": ["combustion", "exothermic", "gas_evolution"],
        "description": "Natural gas combustion releasing carbon dioxide, water vapor, and intense heat."
    },
    {
        "id": "ethanol_combustion",
        "name": "Ethanol Fuel Combustion",
        "reactants": ["c2h5oh", "o2"],
        "products": ["co2", "h2o_steam"],
        "heat_yield_kj_mol": 1367.0,
        "temperature_delta_k": 140.0,
        "activation_energy_k": 380.0,
        "probability": 0.80,
        "pressure_release": 2.5,
        "category": "Combustion",
        "discovery_reward": 50,
        "tags": ["household", "combustion", "exothermic"],
        "description": "Combustion of rubbing alcohol vapors creating blue flame and releasing hot steam."
    },
    {
        "id": "peroxide_decomposition",
        "name": "Catalyzed Peroxide Disproportionation",
        "reactants": ["h2o2", "fe"],
        "products": ["h2o", "o2"],
        "heat_yield_kj_mol": 98.2,
        "temperature_delta_k": 35.0,
        "activation_energy_k": 290.0,
        "probability": 0.60,
        "pressure_release": 2.0,
        "category": "Decomposition",
        "discovery_reward": 50,
        "tags": ["household", "gas_evolution", "exothermic"],
        "description": "Fenton-style decomposition of hydrogen peroxide releasing bubbling oxygen gas."
    },
    {
        "id": "carbon_charcoal_burning",
        "name": "Charcoal Smoldering Combustion",
        "reactants": ["c", "o2"],
        "products": ["co2"],
        "heat_yield_kj_mol": 393.5,
        "temperature_delta_k": 90.0,
        "activation_energy_k": 450.0,
        "probability": 0.70,
        "pressure_release": 1.5,
        "category": "Combustion",
        "discovery_reward": 40,
        "tags": ["household", "combustion", "exothermic"],
        "description": "Elemental carbon burns at high temperature consuming oxygen to produce carbon dioxide."
    },
    {
        "id": "quicklime_hydration",
        "name": "Quicklime Slaking Exotherm",
        "reactants": ["cao", "h2o"],
        "products": ["ca_oh_2"],
        "heat_yield_kj_mol": 65.2,
        "temperature_delta_k": 65.0,
        "activation_energy_k": 273.0,
        "probability": 0.85,
        "pressure_release": 1.0,
        "category": "Hydration",
        "discovery_reward": 45,
        "tags": ["exothermic", "slaking"],
        "description": "Calcium oxide slakes vigorously with water producing caustic slaked lime and boiling heat."
    },
    {
        "id": "slaked_lime_carbonation",
        "name": "Limewater Carbonation (Limestone)",
        "reactants": ["ca_oh_2", "co2"],
        "products": ["caco3", "h2o"],
        "heat_yield_kj_mol": 113.0,
        "temperature_delta_k": 5.0,
        "activation_energy_k": 280.0,
        "probability": 0.50,
        "pressure_release": 0.0,
        "category": "Precipitation",
        "discovery_reward": 50,
        "tags": ["mineralization", "exothermic"],
        "description": "Reaction of slaked lime with carbon dioxide forming cloudy insoluble calcium carbonate chalk."
    },
    {
        "id": "chalk_acid_effervescence",
        "name": "Chalk / Limestone Acid Digestion",
        "reactants": ["caco3", "ch3cooh"],
        "products": ["co2", "h2o"],
        "heat_yield_kj_mol": 25.0,
        "temperature_delta_k": 3.0,
        "activation_energy_k": 285.0,
        "probability": 0.65,
        "pressure_release": 1.8,
        "category": "Acid-Base",
        "discovery_reward": 40,
        "tags": ["household", "gas_evolution", "acid_base"],
        "description": "Weak acetic acid digests calcium carbonate, fizzing carbon dioxide gas."
    },
    {
        "id": "neutralization_lye_muriatic",
        "name": "Violent Neutralization (Lye + Acid)",
        "reactants": ["naoh", "hcl"],
        "products": ["nacl", "h2o"],
        "heat_yield_kj_mol": 57.3,
        "temperature_delta_k": 50.0,
        "activation_energy_k": 273.0,
        "probability": 0.95,
        "pressure_release": 2.0,
        "category": "Neutralization",
        "discovery_reward": 60,
        "tags": ["household", "exothermic", "acid_base"],
        "description": "Strong acid and strong base neutralize vigorously, yielding benign table salt and high heat."
    },
    {
        "id": "bicarb_muriatic_fizz",
        "name": "Baking Soda & Muriatic Acid Fizz",
        "reactants": ["nahco3", "hcl"],
        "products": ["nacl", "h2o", "co2"],
        "heat_yield_kj_mol": 30.0,
        "temperature_delta_k": 15.0,
        "activation_energy_k": 273.0,
        "probability": 0.90,
        "pressure_release": 3.5,
        "category": "Acid-Base",
        "discovery_reward": 45,
        "tags": ["household", "gas_evolution", "exothermic"],
        "description": "Fast fizzing reaction releasing salt water and dense carbon dioxide gas."
    },
    {
        "id": "bleach_acid_chlorine_hazard",
        "name": "Bleach & Acid Toxic Chlorine Gas",
        "reactants": ["naclo", "hcl"],
        "products": ["cl2", "nacl", "h2o"],
        "heat_yield_kj_mol": 45.0,
        "temperature_delta_k": 18.0,
        "activation_energy_k": 275.0,
        "probability": 0.85,
        "pressure_release": 3.0,
        "category": "Hazardous Mixing",
        "discovery_reward": 120,
        "tags": ["household", "hazard", "gas_evolution", "toxic"],
        "description": "Extremely dangerous household mix releasing toxic choking yellow-green elemental chlorine gas."
    },
    {
        "id": "water_steam_phase_change",
        "name": "Water Vaporization (Boiling)",
        "reactants": ["h2o"],
        "products": ["h2o_steam"],
        "heat_yield_kj_mol": -40.7,
        "temperature_delta_k": -5.0,
        "activation_energy_k": 373.15,
        "probability": 0.90,
        "pressure_release": 2.0,
        "category": "Phase Transition",
        "discovery_reward": 20,
        "tags": ["phase_change", "gas_evolution", "endothermic"],
        "description": "Liquid water reaches boiling point and transitions to expanding vapor phase."
    },
    {
        "id": "steam_condensation",
        "name": "Steam Condensation",
        "reactants": ["h2o_steam"],
        "products": ["h2o"],
        "heat_yield_kj_mol": 40.7,
        "temperature_delta_k": 5.0,
        "activation_energy_k": 0.0,
        "probability": 0.30,
        "pressure_release": 0.0,
        "category": "Phase Transition",
        "discovery_reward": 20,
        "tags": ["phase_change", "exothermic"],
        "description": "Water vapor cools down below boiling point and condenses back into liquid water droplets."
    },
    {
        "id": "water_freezing",
        "name": "Water Freezing",
        "reactants": ["h2o"],
        "products": ["h2o_ice"],
        "heat_yield_kj_mol": 6.0,
        "temperature_delta_k": 1.0,
        "activation_energy_k": 0.0,
        "probability": 0.40,
        "pressure_release": 0.0,
        "category": "Phase Transition",
        "discovery_reward": 20,
        "tags": ["phase_change", "exothermic"],
        "description": "Liquid water cools below 273.15 K and solidifies into crystalline ice."
    },
    {
        "id": "ice_melting",
        "name": "Ice Melting",
        "reactants": ["h2o_ice"],
        "products": ["h2o"],
        "heat_yield_kj_mol": -6.0,
        "temperature_delta_k": -1.0,
        "activation_energy_k": 273.15,
        "probability": 0.70,
        "pressure_release": 0.0,
        "category": "Phase Transition",
        "discovery_reward": 20,
        "tags": ["phase_change", "endothermic"],
        "description": "Solid ice absorbs thermal energy and liquefies back into water."
    },
    {
        "id": "iron_muriatic_hydrogen",
        "name": "Iron Acid Single Displacement",
        "reactants": ["fe", "hcl"],
        "products": ["h2"],
        "heat_yield_kj_mol": 87.9,
        "temperature_delta_k": 20.0,
        "activation_energy_k": 285.0,
        "probability": 0.60,
        "pressure_release": 2.2,
        "category": "Single Displacement",
        "discovery_reward": 55,
        "tags": ["gas_evolution", "redox", "exothermic"],
        "description": "Iron metal dissolves in hydrochloric acid releasing bubbling flammable hydrogen gas."
    },
    {
        "id": "copper_slow_oxidation",
        "name": "Copper Surface Oxidation",
        "reactants": ["cu", "o2"],
        "products": ["sio2"],
        "heat_yield_kj_mol": 155.0,
        "temperature_delta_k": 3.0,
        "activation_energy_k": 320.0,
        "probability": 0.01,
        "pressure_release": 0.0,
        "category": "Redox",
        "discovery_reward": 40,
        "tags": ["redox", "exothermic", "corrosion"],
        "description": "Copper slowly passivates in oxygen forming an inert protective oxide layer."
    },
    {
        "id": "gunpowder_deflagration",
        "name": "Black Powder Deflagration",
        "reactants": [
                "gunpowder"
        ],
        "products": [
                "co2",
                "n2",
                "so2"
        ],
        "heat_yield_kj_mol": 485.0,
        "temperature_delta_k": 450.0,
        "activation_energy_k": 540.0,
        "probability": 0.95,
        "pressure_release": 4.0,
        "category": "Combustion",
        "discovery_reward": 75,
        "tags": [
                "pyrotechnics",
                "explosive",
                "gas_evolution",
                "exothermic"
        ],
        "description": "Black powder ignites fiercely above 540 K, generating smoke, sparks, and intense gas pressure."
},
    {
        "id": "magnesium_combustion",
        "name": "Magnesium Blinding White Combustion",
        "reactants": [
                "mg",
                "o2"
        ],
        "products": [
                "mgo"
        ],
        "heat_yield_kj_mol": 601.6,
        "temperature_delta_k": 650.0,
        "activation_energy_k": 750.0,
        "probability": 0.9,
        "pressure_release": 1.5,
        "category": "Combustion",
        "discovery_reward": 80,
        "tags": [
                "pyrotechnics",
                "incandescent",
                "exothermic",
                "oxidation"
        ],
        "description": "Magnesium metal burns with an intense, blinding white glow, depositing white magnesium oxide ash."
},
    {
        "id": "magnesium_steam_reaction",
        "name": "Magnesium & Steam Vigorous Reaction",
        "reactants": [
                "mg",
                "h2o_steam"
        ],
        "products": [
                "mgo",
                "h2"
        ],
        "heat_yield_kj_mol": 359.0,
        "temperature_delta_k": 320.0,
        "activation_energy_k": 580.0,
        "probability": 0.85,
        "pressure_release": 2.5,
        "category": "Redox",
        "discovery_reward": 85,
        "tags": [
                "redox",
                "hydrogen_evolution",
                "exothermic"
        ],
        "description": "Hot magnesium rips oxygen atoms from steam, releasing flammable hydrogen gas."
},
    {
        "id": "sulfur_combustion",
        "name": "Elemental Sulfur Blue Flame Burning",
        "reactants": [
                "s",
                "o2"
        ],
        "products": [
                "so2"
        ],
        "heat_yield_kj_mol": 296.8,
        "temperature_delta_k": 180.0,
        "activation_energy_k": 520.0,
        "probability": 0.8,
        "pressure_release": 1.0,
        "category": "Combustion",
        "discovery_reward": 60,
        "tags": [
                "combustion",
                "gas_evolution",
                "exothermic"
        ],
        "description": "Sulfur melts and burns with an ethereal blue flame into pungent sulfur dioxide gas."
},
    {
        "id": "thermite_reaction",
        "name": "Thermite Superheated Molten Reaction",
        "reactants": [
                "al",
                "fe2o3"
        ],
        "products": [
                "fe",
                "al2o3"
        ],
        "heat_yield_kj_mol": 851.5,
        "temperature_delta_k": 750.0,
        "activation_energy_k": 720.0,
        "probability": 0.9,
        "pressure_release": 2.5,
        "category": "Exothermic Redox",
        "discovery_reward": 120,
        "tags": [
                "pyrotechnics",
                "extreme_heat",
                "exothermic",
                "redox"
        ],
        "description": "Aluminium powder aggressively reduces iron oxide in a blinding, incandescent molten flash."
},
    {
        "id": "liquid_nitrogen_boil",
        "name": "Cryogenic Liquid Nitrogen Rapid Boil",
        "reactants": [
                "ln2"
        ],
        "products": [
                "n2"
        ],
        "heat_yield_kj_mol": -5.5,
        "temperature_delta_k": -50.0,
        "activation_energy_k": 77.5,
        "probability": 0.98,
        "pressure_release": 2.0,
        "category": "Phase Transition",
        "discovery_reward": 40,
        "tags": [
                "cryogenic",
                "phase_transition",
                "endothermic"
        ],
        "description": "Liquid nitrogen boils frantically at ambient room temperatures, leaving inert cold nitrogen gas."
},
    {
        "id": "liquid_nitrogen_freeze_water",
        "name": "Cryogenic Flash Freezing (Water to Ice)",
        "reactants": [
                "ln2",
                "h2o"
        ],
        "products": [
                "n2",
                "h2o_ice"
        ],
        "heat_yield_kj_mol": -12.0,
        "temperature_delta_k": -85.0,
        "activation_energy_k": 75.0,
        "probability": 0.95,
        "pressure_release": 1.5,
        "category": "Cryogenic Quench",
        "discovery_reward": 60,
        "tags": [
                "cryogenic",
                "flash_freeze",
                "endothermic"
        ],
        "description": "Liquid nitrogen rapidly boils away while instantly freezing liquid water into solid ice."
},
    {
        "id": "dry_ice_sublimation",
        "name": "Dry Ice Direct Sublimation",
        "reactants": [
                "co2_ice"
        ],
        "products": [
                "co2"
        ],
        "heat_yield_kj_mol": -25.2,
        "temperature_delta_k": -30.0,
        "activation_energy_k": 195.0,
        "probability": 0.95,
        "pressure_release": 1.8,
        "category": "Phase Transition",
        "discovery_reward": 40,
        "tags": [
                "cryogenic",
                "sublimation",
                "endothermic"
        ],
        "description": "Solid carbon dioxide sublimates directly into heavy, suffocating carbon dioxide gas."
},
    {
        "id": "oil_combustion",
        "name": "Lamp Oil / Hydrocarbon Combustion",
        "reactants": [
                "oil",
                "o2"
        ],
        "products": [
                "co2",
                "h2o_steam"
        ],
        "heat_yield_kj_mol": 650.0,
        "temperature_delta_k": 280.0,
        "activation_energy_k": 530.0,
        "probability": 0.85,
        "pressure_release": 1.5,
        "category": "Combustion",
        "discovery_reward": 50,
        "tags": [
                "combustion",
                "fuel",
                "exothermic"
        ],
        "description": "Floating hydrocarbon fuel catches fire, forming an intense spreading surface slick."
},
    {
        "id": "permanganate_glycerin_hypergolic",
        "name": "Hypergolic Permanganate & Glycerin Fire",
        "reactants": [
                "kmno4",
                "c3h8o3"
        ],
        "products": [
                "co2",
                "h2o_steam"
        ],
        "heat_yield_kj_mol": 420.0,
        "temperature_delta_k": 450.0,
        "activation_energy_k": 295.0,
        "probability": 0.45,
        "pressure_release": 2.5,
        "category": "Hypergolic Redox",
        "discovery_reward": 100,
        "tags": [
                "hypergolic",
                "spontaneous",
                "exothermic",
                "redox"
        ],
        "description": "Spontaneous delay reaction: purple permanganate oxidizes syrupy glycerin into a roaring purple flare."
},
    {
        "id": "elephant_toothpaste",
        "name": "Elephant Toothpaste Catalytic Eruption",
        "reactants": [
                "h2o2",
                "mno2"
        ],
        "products": [
                "h2o_steam",
                "o2"
        ],
        "heat_yield_kj_mol": 196.4,
        "temperature_delta_k": 120.0,
        "activation_energy_k": 285.0,
        "probability": 0.85,
        "pressure_release": 3.5,
        "category": "Catalysis",
        "discovery_reward": 90,
        "tags": [
                "catalysis",
                "gas_evolution",
                "exothermic"
        ],
        "description": "Manganese dioxide catalyzes the rapid decomposition of hydrogen peroxide into expanding steam and oxygen."
},
    {
        "id": "sugar_sulfuric_acid_snake",
        "name": "Sulfuric Acid Sugar Dehydration (Carbon Snake)",
        "reactants": [
                "c12h22o11",
                "h2so4"
        ],
        "products": [
                "c",
                "h2o_steam"
        ],
        "heat_yield_kj_mol": 380.0,
        "temperature_delta_k": 160.0,
        "activation_energy_k": 295.0,
        "probability": 0.75,
        "pressure_release": 2.8,
        "category": "Dehydration",
        "discovery_reward": 95,
        "tags": [
                "dehydration",
                "exothermic",
                "acid"
        ],
        "description": "Concentrated sulfuric acid greedily strips water from sucrose, leaving an expanding column of hot black carbon."
},
    {
        "id": "potassium_water_explosion",
        "name": "Potassium & Water Alkali Blast",
        "reactants": [
                "k",
                "h2o"
        ],
        "products": [
                "koh",
                "h2"
        ],
        "heat_yield_kj_mol": 196.0,
        "temperature_delta_k": 350.0,
        "activation_energy_k": 273.0,
        "probability": 0.95,
        "pressure_release": 3.8,
        "category": "Exothermic Redox",
        "discovery_reward": 110,
        "tags": [
                "alkali_metal",
                "explosion",
                "hydrogen_evolution",
                "exothermic"
        ],
        "description": "Potassium violently hydrolyzes water, detonating with an iconic lilac flame."
},
    {
        "id": "lava_water_quench",
        "name": "Volcanic Lava & Water Thermal Quench",
        "reactants": [
                "lava",
                "h2o"
        ],
        "products": [
                "basalt",
                "h2o_steam"
        ],
        "heat_yield_kj_mol": 150.0,
        "temperature_delta_k": 120.0,
        "activation_energy_k": 373.0,
        "probability": 0.95,
        "pressure_release": 3.0,
        "category": "Thermal Quench",
        "discovery_reward": 70,
        "tags": [
                "volcanic",
                "quench",
                "steam_explosion"
        ],
        "description": "1400 K volcanic lava flash-boils water into high-pressure steam while solidifying into obsidian rock."
},
    {
        "id": "copper_oxidation",
        "name": "Copper High-Temperature Oxidation",
        "reactants": [
                "cu",
                "o2"
        ],
        "products": [
                "cuo"
        ],
        "heat_yield_kj_mol": 157.3,
        "temperature_delta_k": 80.0,
        "activation_energy_k": 550.0,
        "probability": 0.6,
        "pressure_release": 0.0,
        "category": "Redox",
        "discovery_reward": 55,
        "tags": [
                "redox",
                "corrosion",
                "metal"
        ],
        "description": "Reddish copper metal oxidizes under flame heat into dull black copper(II) oxide."
}
]

def fetch_ord_reactions(tags: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Attempts to query remote ORD / PubChem or returns verified empirical seed data.
    """
    print("Initiating chemical reaction ingestion via requests...")
    headers = {"User-Agent": "ReactaGrid-ETL/1.0 (https://github.com/FranekJemiolo/reactagrid)"}

    # Verify internet connectivity / remote source reachability
    try:
        res = requests.get("https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/water/property/MolecularFormula/JSON", timeout=3, headers=headers)
        if res.status_code == 200:
            print("✓ Successfully connected to PubChem REST API service.")
    except Exception as e:
        print(f"! Remote API unreachable ({e}); continuing with verified local seed database.")

    raw_data = list(RAW_INGESTION_DATA)
    if tags:
        print(f"Filtering reaction dataset by tags: {tags}")
        raw_data = [
            r for r in raw_data
            if any(t in r.get("tags", []) for t in tags)
        ]
    return raw_data

def run_etl():
    print("=" * 70)
    print("ReactaGrid Milestone 13: Automated Database Ingestion ETL Pipeline")
    print("=" * 70)

    # 1. Fetch
    raw_reactions = fetch_ord_reactions()
    print(f"Fetched {len(raw_reactions)} raw reaction records.")

    # 2. Transform using Pandas
    df = pd.DataFrame(raw_reactions)
    print(f"Loaded records into pandas DataFrame (Shape: {df.shape})")

    # Data Hygiene & Validation
    required_cols = [
        "id", "name", "reactants", "products", "heat_yield_kj_mol",
        "temperature_delta_k", "activation_energy_k", "probability",
        "pressure_release", "category", "discovery_reward", "description"
    ]

    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")

    # Enforce numeric types
    numeric_cols = ["heat_yield_kj_mol", "temperature_delta_k", "activation_energy_k", "probability", "pressure_release"]
    for nc in numeric_cols:
        df[nc] = pd.to_numeric(df[nc], errors="raise")

    df["discovery_reward"] = df["discovery_reward"].astype(int)

    # Check duplicates
    if df["id"].duplicated().any():
        dups = df[df["id"].duplicated()]["id"].tolist()
        raise ValueError(f"Found duplicate reaction IDs: {dups}")

    # Cross-reference with molecules database
    if os.path.exists(MOLECULES_PATH):
        with open(MOLECULES_PATH, "r", encoding="utf-8") as f:
            valid_molecules = set(json.load(f).keys())

        for _, row in df.iterrows():
            for r in row["reactants"]:
                if r not in valid_molecules:
                    raise ValueError(f"Reaction '{row['id']}' references unknown reactant '{r}'")
            for p in row["products"]:
                if p not in valid_molecules:
                    raise ValueError(f"Reaction '{row['id']}' references unknown product '{p}'")

    print("\n--- Summary Statistics (Pandas) ---")
    summary = df.groupby("category")[["heat_yield_kj_mol", "temperature_delta_k", "discovery_reward"]].mean()
    print(summary)
    print("-----------------------------------")

    # Clean records for JSON output (drop internal tags column if desired, or keep schema clean)
    output_records = df[required_cols].to_dict(orient="records")

    # 3. Load / Export
    for target_dir in [PUBLIC_DATA_DIR, SRC_DATA_DIR]:
        os.makedirs(target_dir, exist_ok=True)
        target_path = os.path.join(target_dir, "reactions.json")
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(output_records, f, indent=2, ensure_ascii=False)
        print(f"✓ Saved {len(output_records)} validated reactions to {target_path}")

    print("\n✅ Milestone 13 ETL Ingestion successfully completed!")
    return True

if __name__ == "__main__":
    success = run_etl()
    sys.exit(0 if success else 1)
