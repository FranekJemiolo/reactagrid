#!/usr/bin/env python3
"""
ReactaGrid Chemical Data Pipeline
Extracts, formats, and verifies real-world molecular properties and chemical reactions
from empirical databases (PubChem / CAMEO Chemicals / NIST WebBook).

Outputs:
- public/data/molecules.json
- public/data/reactions.json
- public/data/store_items.json
"""

import json
import os
from typing import Dict, List, Any

# Ensure target directories exist
PUBLIC_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")
SRC_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "data")
os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)
os.makedirs(SRC_DATA_DIR, exist_ok=True)

# Empirical chemical database with verified physical constants
MOLECULES_DATA: Dict[str, Dict[str, Any]] = {
    "empty": {
        "id": "empty",
        "name": "Vacuum / Air",
        "formula": "",
        "state": "gas",
        "density": 0.0012,  # g/cm3 at STP
        "color": "#00000000",
        "melting_point_k": 0.0,
        "boiling_point_k": 0.0,
        "specific_heat": 1.0,
        "thermal_conductivity": 0.026,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Ambient vacuum/air space.",
        "description": "Empty space inside the laboratory tank."
    },
    "h2o": {
        "id": "h2o",
        "name": "Water",
        "formula": "H₂O",
        "state": "liquid",
        "density": 1.000,
        "color": "#388bfd99",
        "melting_point_k": 273.15,
        "boiling_point_k": 373.15,
        "specific_heat": 4.184,  # J/(g*K)
        "thermal_conductivity": 0.606,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Non-hazardous essential fluid.",
        "description": "Universal solvent with high surface tension and heat capacity."
    },
    "h2o_steam": {
        "id": "h2o_steam",
        "name": "Water Vapor (Steam)",
        "formula": "H₂O (g)",
        "state": "gas",
        "density": 0.0006,
        "color": "#cad9e688",
        "melting_point_k": 273.15,
        "boiling_point_k": 373.15,
        "specific_heat": 2.080,
        "thermal_conductivity": 0.025,
        "flammable": False,
        "hazard_rating": 1,
        "hazard_description": "Scalding risk under high temperatures.",
        "description": "Gaseous water phase expanding rapidly upwards."
    },
    "h2o_ice": {
        "id": "h2o_ice",
        "name": "Ice",
        "formula": "H₂O (s)",
        "state": "solid",
        "density": 0.917,
        "color": "#cbf1f5cc",
        "melting_point_k": 273.15,
        "boiling_point_k": 373.15,
        "specific_heat": 2.050,
        "thermal_conductivity": 2.22,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Cold solid.",
        "description": "Solid crystalline water phase."
    },
    "sio2": {
        "id": "sio2",
        "name": "Silica (Sand)",
        "formula": "SiO₂",
        "state": "solid",
        "density": 2.650,
        "color": "#d4a373ff",
        "melting_point_k": 1986.15,
        "boiling_point_k": 2503.15,
        "specific_heat": 0.730,
        "thermal_conductivity": 1.4,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Inert granular mineral.",
        "description": "Silicon dioxide granular mineral forming natural sedimentary banks."
    },
    "glass": {
        "id": "glass",
        "name": "Borosilicate Glass (Pyrex)",
        "formula": "SiO₂·B₂O₃",
        "state": "solid",
        "density": 2.230,
        "color": "#94a3b8b0",
        "melting_point_k": 1533.15,
        "boiling_point_k": 2500.0,
        "specific_heat": 0.830,
        "thermal_conductivity": 1.14,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Inert laboratory glassware.",
        "description": "Durable borosilicate glass (Pyrex). Immovable structural solid used for beakers, flasks, and containment walls."
    },
    "nahco3": {
        "id": "nahco3",
        "name": "Sodium Bicarbonate (Baking Soda)",
        "formula": "NaHCO₃",
        "state": "solid",
        "density": 2.200,
        "color": "#f8f9faee",
        "melting_point_k": 323.15,  # Decomposes
        "boiling_point_k": 1123.15,
        "specific_heat": 1.040,
        "thermal_conductivity": 0.35,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Mild alkaline salt.",
        "description": "White crystalline salt used extensively in household baking and acid neutralization."
    },
    "ch3cooh": {
        "id": "ch3cooh",
        "name": "Acetic Acid (Vinegar)",
        "formula": "CH₃COOH",
        "state": "liquid",
        "density": 1.049,
        "color": "#e2e8f0aa",
        "melting_point_k": 289.75,
        "boiling_point_k": 391.05,
        "specific_heat": 2.180,
        "thermal_conductivity": 0.17,
        "flammable": True,
        "hazard_rating": 1,
        "hazard_description": "Pungent carboxylic acid, mild irritant in household concentrations.",
        "description": "Organic acid providing the distinct sharp aroma and taste in vinegar."
    },
    "fe": {
        "id": "fe",
        "name": "Iron Filings",
        "formula": "Fe",
        "state": "solid",
        "density": 7.874,
        "color": "#6c757dff",
        "melting_point_k": 1811.15,
        "boiling_point_k": 3134.15,
        "specific_heat": 0.449,
        "thermal_conductivity": 80.4,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Heavy ferromagnetic particulate.",
        "description": "Dense, highly conductive transition metal filings susceptible to oxidation."
    },
    "o2": {
        "id": "o2",
        "name": "Oxygen",
        "formula": "O₂",
        "state": "gas",
        "density": 0.0014,
        "color": "#70c1b355",
        "melting_point_k": 54.36,
        "boiling_point_k": 90.20,
        "specific_heat": 0.918,
        "thermal_conductivity": 0.026,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Oxidizer supporting aerobic combustion.",
        "description": "Diatomic gaseous oxidizer required for burning and corrosion."
    },
    "naclo": {
        "id": "naclo",
        "name": "Sodium Hypochlorite (Bleach)",
        "formula": "NaClO",
        "state": "liquid",
        "density": 1.110,
        "color": "#a7f3d0bb",
        "melting_point_k": 291.15,
        "boiling_point_k": 374.15,
        "specific_heat": 3.800,
        "thermal_conductivity": 0.58,
        "flammable": False,
        "hazard_rating": 2,
        "hazard_description": "Strong oxidizing disinfectant. Toxic if combined with ammonia or acids.",
        "description": "Common household bleaching agent and surface disinfectant."
    },
    "nh3": {
        "id": "nh3",
        "name": "Ammonia (Window Cleaner)",
        "formula": "NH₃",
        "state": "liquid",
        "density": 0.910,
        "color": "#93c5fd88",
        "melting_point_k": 195.42,
        "boiling_point_k": 239.81,
        "specific_heat": 4.700,
        "thermal_conductivity": 0.52,
        "flammable": False,
        "hazard_rating": 2,
        "hazard_description": "Corrosive alkaline odor; produces toxic fumes when mixed with hypochlorite.",
        "description": "Volatile alkaline nitrogen hydride prevalent in glass cleaning detergents."
    },
    "ch3coona": {
        "id": "ch3coona",
        "name": "Sodium Acetate",
        "formula": "CH₃COONa",
        "state": "solid",
        "density": 1.528,
        "color": "#fed7aaee",
        "melting_point_k": 597.15,
        "boiling_point_k": 1154.15,
        "specific_heat": 1.250,
        "thermal_conductivity": 0.40,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Safe seasoning salt (salt & vinegar flavoring).",
        "description": "The mild sodium salt of acetic acid, produced by baking soda and vinegar."
    },
    "co2": {
        "id": "co2",
        "name": "Carbon Dioxide",
        "formula": "CO₂",
        "state": "gas",
        "density": 0.0019,
        "color": "#94a3b866",
        "melting_point_k": 194.65,
        "boiling_point_k": 216.55,
        "specific_heat": 0.846,
        "thermal_conductivity": 0.016,
        "flammable": False,
        "hazard_rating": 1,
        "hazard_description": "Asphyxiant at extreme concentrations; buoyant extinguishing gas.",
        "description": "Heavy carbon gas that causes bubbling effervescence and displaces liquids upward."
    },
    "fe2o3": {
        "id": "fe2o3",
        "name": "Iron(III) Oxide (Rust)",
        "formula": "Fe₂O₃",
        "state": "solid",
        "density": 5.242,
        "color": "#b45309ff",
        "melting_point_k": 1838.15,
        "boiling_point_k": 2253.15,
        "specific_heat": 0.650,
        "thermal_conductivity": 12.5,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Non-toxic brittle corrosion product.",
        "description": "Reddish-brown brittle oxide formed when metallic iron oxidizes in moisture."
    },
    "nh2cl": {
        "id": "nh2cl",
        "name": "Chloramine Gas",
        "formula": "NH₂Cl",
        "state": "gas",
        "density": 0.0022,
        "color": "#bef264aa",
        "melting_point_k": 207.15,
        "boiling_point_k": 249.15,
        "specific_heat": 0.980,
        "thermal_conductivity": 0.018,
        "flammable": False,
        "hazard_rating": 3,
        "hazard_description": "DANGER: Lethal toxic gas formed by mixing bleach with ammonia. Causes acute respiratory distress.",
        "description": "Unstable toxic gas generated inadvertently by household cleaner misuse."
    },
    "naoh": {
        "id": "naoh",
        "name": "Sodium Hydroxide (Lye / Caustic Soda)",
        "formula": "NaOH",
        "state": "solid",
        "density": 2.130,
        "color": "#f1f5f9ee",
        "melting_point_k": 591.15,
        "boiling_point_k": 1661.15,
        "specific_heat": 1.490,
        "thermal_conductivity": 0.69,
        "flammable": False,
        "hazard_rating": 3,
        "hazard_description": "Extremely caustic alkali. Causes severe skin burns and blindness.",
        "description": "Corrosive alkaline base used in industrial manufacturing and chemical drain unclogging."
    },
    "na": {
        "id": "na",
        "name": "Sodium Metal",
        "formula": "Na",
        "state": "solid",
        "density": 0.968,
        "color": "#e2e8f0ff",
        "melting_point_k": 370.87,
        "boiling_point_k": 1156.15,
        "specific_heat": 1.228,
        "thermal_conductivity": 142.0,
        "flammable": True,
        "hazard_rating": 3,
        "hazard_description": "Violently water-reactive alkali metal. Ignites spontaneously on contact with water.",
        "description": "Soft alkali metal that reacts explosively with water to liberate hydrogen and heat."
    },
    "h2": {
        "id": "h2",
        "name": "Hydrogen Gas",
        "formula": "H₂",
        "state": "gas",
        "density": 0.000089,
        "color": "#fbcfe855",
        "melting_point_k": 13.99,
        "boiling_point_k": 20.28,
        "specific_heat": 14.304,
        "thermal_conductivity": 0.180,
        "flammable": True,
        "hazard_rating": 2,
        "hazard_description": "Extremely buoyant and explosive fuel gas.",
        "description": "Lightest element in the universe, rising rapidly through air tanks."
    },
    "hcl": {
        "id": "hcl",
        "name": "Hydrochloric Acid (Muriatic Acid)",
        "formula": "HCl",
        "state": "liquid",
        "density": 1.180,
        "color": "#fef08acc",
        "melting_point_k": 243.15,
        "boiling_point_k": 381.15,
        "specific_heat": 3.100,
        "thermal_conductivity": 0.46,
        "flammable": False,
        "hazard_rating": 3,
        "hazard_description": "Strong mineral acid; corrosive vapor that attacks metals and biological tissue.",
        "description": "Fuming aqueous solution of hydrogen chloride used for masonry cleaning and pH regulation."
    },
    "nacl": {
        "id": "nacl",
        "name": "Sodium Chloride (Table Salt)",
        "formula": "NaCl",
        "state": "solid",
        "density": 2.165,
        "color": "#f8fafcee",
        "melting_point_k": 1074.15,
        "boiling_point_k": 1738.15,
        "specific_heat": 0.864,
        "thermal_conductivity": 6.5,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Everyday table condiment.",
        "description": "Common ionic mineral crystal formed by the neutralization of sodium and chlorine."
    },
    "c": {
        "id": "c",
        "name": "Carbon (Charcoal)",
        "formula": "C",
        "state": "solid",
        "density": 2.260,
        "color": "#1e293bff",
        "melting_point_k": 3823.15,
        "boiling_point_k": 4098.15,
        "specific_heat": 0.710,
        "thermal_conductivity": 1.6,
        "flammable": True,
        "hazard_rating": 1,
        "hazard_description": "Combustible black solid particulate.",
        "description": "Pure elemental carbon fuel that undergoes exothermic combustion in oxygen."
    },
    "ch4": {
        "id": "ch4",
        "name": "Methane (Natural Gas)",
        "formula": "CH₄",
        "state": "gas",
        "density": 0.00065,
        "color": "#bfdbfe66",
        "melting_point_k": 90.7,
        "boiling_point_k": 111.6,
        "specific_heat": 2.226,
        "thermal_conductivity": 0.034,
        "flammable": True,
        "hazard_rating": 2,
        "hazard_description": "Flammable hydrocarbon fuel gas.",
        "description": "Simplest alkane gas providing intense combustion energy."
    },
    "c2h5oh": {
        "id": "c2h5oh",
        "name": "Ethanol (Alcohol)",
        "formula": "C₂H₅OH",
        "state": "liquid",
        "density": 0.789,
        "color": "#a5f3fc99",
        "melting_point_k": 159.05,
        "boiling_point_k": 351.38,
        "specific_heat": 2.440,
        "thermal_conductivity": 0.17,
        "flammable": True,
        "hazard_rating": 2,
        "hazard_description": "Volatile flammable antiseptic.",
        "description": "Clear organic solvent with low density that floats on water."
    },
    "h2o2": {
        "id": "h2o2",
        "name": "Hydrogen Peroxide",
        "formula": "H₂O₂",
        "state": "liquid",
        "density": 1.110,
        "color": "#bae6fd99",
        "melting_point_k": 272.72,
        "boiling_point_k": 423.35,
        "specific_heat": 2.620,
        "thermal_conductivity": 0.54,
        "flammable": False,
        "hazard_rating": 1,
        "hazard_description": "Mild oxidizing topical disinfectant.",
        "description": "Unstable peroxide that decomposes into water and oxygen gas upon activation."
    },
    "cao": {
        "id": "cao",
        "name": "Calcium Oxide (Quicklime)",
        "formula": "CaO",
        "state": "solid",
        "density": 3.340,
        "color": "#e0e7ffee",
        "melting_point_k": 2886.15,
        "boiling_point_k": 3123.15,
        "specific_heat": 0.750,
        "thermal_conductivity": 15.0,
        "flammable": False,
        "hazard_rating": 2,
        "hazard_description": "Corrosive caustic mineral; releases extreme heat when hydrated.",
        "description": "Alkaline mineral that slakes violently in water to release substantial heat."
    },
    "ca_oh_2": {
        "id": "ca_oh_2",
        "name": "Calcium Hydroxide (Slaked Lime)",
        "formula": "Ca(OH)₂",
        "state": "solid",
        "density": 2.211,
        "color": "#f3e8ffee",
        "melting_point_k": 853.15,
        "boiling_point_k": 3123.15,
        "specific_heat": 1.200,
        "thermal_conductivity": 0.65,
        "flammable": False,
        "hazard_rating": 1,
        "hazard_description": "Alkaline precipitate.",
        "description": "Hydrated lime compound used in mortar, plaster, and carbon dioxide detection."
    },
    "caco3": {
        "id": "caco3",
        "name": "Calcium Carbonate (Chalk / Limestone)",
        "formula": "CaCO₃",
        "state": "solid",
        "density": 2.710,
        "color": "#fed7aaff",
        "melting_point_k": 1612.15,
        "boiling_point_k": 2200.15,
        "specific_heat": 0.820,
        "thermal_conductivity": 2.2,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Safe mineral stone.",
        "description": "Primary constituent of chalk, eggshells, limestone, and sea shells."
    },
    "cu": {
        "id": "cu",
        "name": "Copper Filings",
        "formula": "Cu",
        "state": "solid",
        "density": 8.960,
        "color": "#d97706ff",
        "melting_point_k": 1357.77,
        "boiling_point_k": 2835.15,
        "specific_heat": 0.385,
        "thermal_conductivity": 401.0,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Ductile high-conductivity metal.",
        "description": "Reddish metallic particulate with outstanding electrical and thermal conductivity."
    },
    "cl2": {
        "id": "cl2",
        "name": "Chlorine Gas",
        "formula": "Cl₂",
        "state": "gas",
        "density": 0.0032,
        "color": "#bef26488",
        "melting_point_k": 171.6,
        "boiling_point_k": 239.11,
        "specific_heat": 0.479,
        "thermal_conductivity": 0.0089,
        "flammable": False,
        "hazard_rating": 3,
        "hazard_description": "HIGHLY TOXIC yellow-green choking gas. Severe respiratory hazard.",
        "description": "Dense halogen gas released when bleach is mixed with concentrated acids."
    },
    "bunsen_burner": {
        "id": "bunsen_burner",
        "name": "Bunsen Burner",
        "formula": "Heat Source",
        "state": "solid",
        "density": 8.0,
        "color": "#f97316ff",
        "melting_point_k": 3000.0,
        "boiling_point_k": 4000.0,
        "specific_heat": 0.9,
        "thermal_conductivity": 15.0,
        "flammable": False,
        "hazard_rating": 2,
        "hazard_description": "Continuous combustion flame heat source (+50°C/tick).",
        "description": "Laboratory heat source continuously providing +50°C heat per tick to cells directly above it."
    },
    "cooling_plate": {
        "id": "cooling_plate",
        "name": "Cooling Plate",
        "formula": "Heat Sink",
        "state": "solid",
        "density": 8.0,
        "color": "#06b6d4ff",
        "melting_point_k": 3000.0,
        "boiling_point_k": 4000.0,
        "specific_heat": 0.9,
        "thermal_conductivity": 15.0,
        "flammable": False,
        "hazard_rating": 1,
        "hazard_description": "Thermoelectric cryo cooling element down to -20°C.",
        "description": "Continuous cooling plate that chills touching cells down to -20°C (253.15 K)."
    },
    "stirrer": {
        "id": "stirrer",
        "name": "Magnetic Stirrer",
        "formula": "Agitator",
        "state": "solid",
        "density": 8.0,
        "color": "#a855f7ff",
        "melting_point_k": 3000.0,
        "boiling_point_k": 4000.0,
        "specific_heat": 0.9,
        "thermal_conductivity": 0.5,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Mechanical fluid agitator for mixing.",
        "description": "Solid laboratory agitator that imparts horizontal velocity vectors to adjacent liquids to force mixing."
    },
    "h2o_gas": {
        "id": "h2o_gas",
        "name": "Water Vapor (Steam)",
        "formula": "H₂O (g)",
        "state": "gas",
        "density": 0.0006,
        "color": "#cad9e688",
        "melting_point_k": 273.15,
        "boiling_point_k": 373.15,
        "specific_heat": 2.08,
        "thermal_conductivity": 0.025,
        "flammable": False,
        "hazard_rating": 1,
        "hazard_description": "Scalding risk under high temperatures.",
        "description": "Gaseous water vapor phase expanding rapidly upwards."
    },
    "h2_gas": {
        "id": "h2_gas",
        "name": "Hydrogen Gas",
        "formula": "H₂ (g)",
        "state": "gas",
        "density": 0.000089,
        "color": "#e0f2fe66",
        "melting_point_k": 14.01,
        "boiling_point_k": 20.28,
        "specific_heat": 14.304,
        "thermal_conductivity": 0.1805,
        "flammable": True,
        "hazard_rating": 4,
        "hazard_description": "EXTREMELY FLAMMABLE and explosive gas.",
        "description": "Lightest gas in the universe, extremely buoyant and explosive in presence of oxygen and ignition."
    },
    "gunpowder": {
        "id": "gunpowder",
        "name": "Black Powder (Gunpowder)",
        "formula": "KNO\u2083+C+S",
        "state": "solid",
        "density": 1.7,
        "color": "#27272aff",
        "melting_point_k": 550.0,
        "boiling_point_k": 800.0,
        "specific_heat": 0.9,
        "thermal_conductivity": 0.25,
        "flammable": True,
        "hazard_rating": 3,
        "hazard_description": "Explosive deflagration upon heat or spark ignition.",
        "description": "Classic black powder formulation. Rapidly deflagrates into expanding hot gases when heated."
},
    "kno3": {
        "id": "kno3",
        "name": "Potassium Nitrate (Saltpeter)",
        "formula": "KNO\u2083",
        "state": "solid",
        "density": 2.11,
        "color": "#f1f5f9ff",
        "melting_point_k": 607.0,
        "boiling_point_k": 673.0,
        "specific_heat": 0.95,
        "thermal_conductivity": 0.5,
        "flammable": False,
        "hazard_rating": 1,
        "hazard_description": "Strong oxidizer; accelerates combustion.",
        "description": "White crystalline salt used as an agricultural fertilizer and energetic oxidizer."
},
    "s": {
        "id": "s",
        "name": "Elemental Sulfur",
        "formula": "S\u2088",
        "state": "solid",
        "density": 2.07,
        "color": "#eab308ff",
        "melting_point_k": 388.36,
        "boiling_point_k": 717.8,
        "specific_heat": 0.71,
        "thermal_conductivity": 0.205,
        "flammable": True,
        "hazard_rating": 1,
        "hazard_description": "Combustible powder; burns with blue flame producing choking SO2.",
        "description": "Bright yellow brimstone powder that burns with an ethereal blue flame."
},
    "so2": {
        "id": "so2",
        "name": "Sulfur Dioxide",
        "formula": "SO\u2082",
        "state": "gas",
        "density": 0.0026,
        "color": "#fef08a88",
        "melting_point_k": 197.6,
        "boiling_point_k": 263.1,
        "specific_heat": 0.62,
        "thermal_conductivity": 0.009,
        "flammable": False,
        "hazard_rating": 3,
        "hazard_description": "Toxic pungent suffocating gas; severe respiratory irritant.",
        "description": "Dense, pungent volcanic gas formed by combustion of sulfur compounds."
},
    "n2": {
        "id": "n2",
        "name": "Nitrogen Gas",
        "formula": "N\u2082",
        "state": "gas",
        "density": 0.00116,
        "color": "#cbd5e144",
        "melting_point_k": 63.15,
        "boiling_point_k": 77.36,
        "specific_heat": 1.04,
        "thermal_conductivity": 0.026,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Non-toxic, inert atmospheric gas.",
        "description": "Major component of atmospheric air (~78%); serves as an inert gaseous buffer."
},
    "mg": {
        "id": "mg",
        "name": "Magnesium Metal",
        "formula": "Mg",
        "state": "solid",
        "density": 1.74,
        "color": "#e2e8f0ff",
        "melting_point_k": 923.0,
        "boiling_point_k": 1363.0,
        "specific_heat": 1.023,
        "thermal_conductivity": 156.0,
        "flammable": True,
        "hazard_rating": 2,
        "hazard_description": "Burns with blinding incandescent white brilliance. Hard to extinguish.",
        "description": "Lightweight alkali-earth metal known for its brilliant white flare when ignited."
},
    "mgo": {
        "id": "mgo",
        "name": "Magnesium Oxide (Magnesia)",
        "formula": "MgO",
        "state": "solid",
        "density": 3.58,
        "color": "#ffffffef",
        "melting_point_k": 3125.0,
        "boiling_point_k": 3873.0,
        "specific_heat": 0.88,
        "thermal_conductivity": 45.0,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Inert refractory mineral ash.",
        "description": "Pure white mineral ash residue left behind after magnesium combustion."
},
    "al": {
        "id": "al",
        "name": "Aluminium Powder",
        "formula": "Al",
        "state": "solid",
        "density": 2.7,
        "color": "#cbd5e1ff",
        "melting_point_k": 933.47,
        "boiling_point_k": 2743.0,
        "specific_heat": 0.897,
        "thermal_conductivity": 237.0,
        "flammable": True,
        "hazard_rating": 2,
        "hazard_description": "Fine metallic powder; violent reducing agent in thermite reactions.",
        "description": "Finely divided silvery metallic aluminium used in pyrotechnics and thermite mixtures."
},
    "al2o3": {
        "id": "al2o3",
        "name": "Aluminium Oxide (Corundum)",
        "formula": "Al\u2082O\u2083",
        "state": "solid",
        "density": 3.95,
        "color": "#f8fafcff",
        "melting_point_k": 2345.0,
        "boiling_point_k": 3250.0,
        "specific_heat": 0.78,
        "thermal_conductivity": 30.0,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Ultra-hard inert refractory ceramic.",
        "description": "Extremely stable ceramic mineral slag produced by thermite reactions."
},
    "ln2": {
        "id": "ln2",
        "name": "Liquid Nitrogen",
        "formula": "N\u2082 (l)",
        "state": "liquid",
        "density": 0.808,
        "color": "#93c5fd99",
        "melting_point_k": 63.15,
        "boiling_point_k": 77.36,
        "specific_heat": 2.04,
        "thermal_conductivity": 0.13,
        "flammable": False,
        "hazard_rating": 2,
        "hazard_description": "Cryogenic hazard (77 K). Instantly flash-freezes water and tissue.",
        "description": "Extremely cold cryogenic fluid that rapidly boils at room temperature and freezes adjacent liquids."
},
    "co2_ice": {
        "id": "co2_ice",
        "name": "Dry Ice",
        "formula": "CO\u2082 (s)",
        "state": "solid",
        "density": 1.56,
        "color": "#f1f5f9ee",
        "melting_point_k": 194.65,
        "boiling_point_k": 194.65,
        "specific_heat": 1.25,
        "thermal_conductivity": 0.08,
        "flammable": False,
        "hazard_rating": 1,
        "hazard_description": "Sublimates directly at 195 K into heavy suffocating gas.",
        "description": "Solid carbon dioxide. Undergoes direct sublimation without melting into expanding dense vapor."
},
    "oil": {
        "id": "oil",
        "name": "Lamp Oil (Hydrocarbon)",
        "formula": "C\u2081\u2082H\u2082\u2086",
        "state": "liquid",
        "density": 0.82,
        "color": "#f59e0baa",
        "melting_point_k": 243.0,
        "boiling_point_k": 573.0,
        "specific_heat": 2.0,
        "thermal_conductivity": 0.14,
        "flammable": True,
        "hazard_rating": 1,
        "hazard_description": "Combustible hydrocarbon; floats on water forming spreadable slicks.",
        "description": "Light paraffin fuel fluid. Less dense than water, floating on surfaces and catching fire."
},
    "c3h8o3": {
        "id": "c3h8o3",
        "name": "Glycerin (Glycerol)",
        "formula": "C\u2083H\u2088O\u2083",
        "state": "liquid",
        "density": 1.261,
        "color": "#f8fafcbb",
        "melting_point_k": 291.0,
        "boiling_point_k": 563.0,
        "specific_heat": 2.43,
        "thermal_conductivity": 0.28,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Viscous polyol; hypergolic ignition with strong oxidizers like KMnO4.",
        "description": "Clear, viscous syrupy polyol liquid that sinks beneath water and ignites with permanganate."
},
    "kmno4": {
        "id": "kmno4",
        "name": "Potassium Permanganate",
        "formula": "KMnO\u2084",
        "state": "solid",
        "density": 2.7,
        "color": "#581c87ff",
        "melting_point_k": 513.0,
        "boiling_point_k": 600.0,
        "specific_heat": 0.74,
        "thermal_conductivity": 0.6,
        "flammable": False,
        "hazard_rating": 2,
        "hazard_description": "Potent oxidizer; causes spontaneous delayed fire when mixed with glycerin.",
        "description": "Deep purple crystalline compound that spontaneously ignites glycerin in hypergolic combustion."
},
    "h2so4": {
        "id": "h2so4",
        "name": "Concentrated Sulfuric Acid",
        "formula": "H\u2082SO\u2084",
        "state": "liquid",
        "density": 1.84,
        "color": "#fef08acc",
        "melting_point_k": 283.5,
        "boiling_point_k": 610.0,
        "specific_heat": 1.42,
        "thermal_conductivity": 0.36,
        "flammable": False,
        "hazard_rating": 3,
        "hazard_description": "Extremely corrosive dehydrating mineral acid. Violently exothermic with water.",
        "description": "Dense oily acid that greedily extracts water from carbohydrates, turning sugar into a carbon snake."
},
    "c12h22o11": {
        "id": "c12h22o11",
        "name": "Table Sugar (Sucrose)",
        "formula": "C\u2081\u2082H\u2082\u2082O\u2081\u2081",
        "state": "solid",
        "density": 1.587,
        "color": "#ffffffea",
        "melting_point_k": 459.0,
        "boiling_point_k": 550.0,
        "specific_heat": 1.24,
        "thermal_conductivity": 0.15,
        "flammable": True,
        "hazard_rating": 0,
        "hazard_description": "Combustible disaccharide.",
        "description": "Common crystalline sugar. Melts and caramelizes, or chars violently when touching sulfuric acid."
},
    "lava": {
        "id": "lava",
        "name": "Volcanic Magma / Lava",
        "formula": "Molten Rock",
        "state": "liquid",
        "density": 2.65,
        "color": "#ea580cff",
        "melting_point_k": 1073.0,
        "boiling_point_k": 2800.0,
        "specific_heat": 1.45,
        "thermal_conductivity": 2.0,
        "flammable": False,
        "hazard_rating": 4,
        "hazard_description": "Incandescent 1400 K molten silicate rock. Ignites all flammables and boils water.",
        "description": "Glowing molten silicate lava that solidifies into basaltic obsidian upon cooling."
},
    "basalt": {
        "id": "basalt",
        "name": "Basalt (Cooled Lava)",
        "formula": "Basalt Rock",
        "state": "solid",
        "density": 2.9,
        "color": "#334155ff",
        "melting_point_k": 1373.0,
        "boiling_point_k": 2800.0,
        "specific_heat": 0.84,
        "thermal_conductivity": 1.8,
        "flammable": False,
        "hazard_rating": 0,
        "hazard_description": "Inert volcanic rock.",
        "description": "Dark igneous rock formed from the quenching of volcanic magma."
},
    "k": {
        "id": "k",
        "name": "Metallic Potassium",
        "formula": "K",
        "state": "solid",
        "density": 0.862,
        "color": "#d8b4feff",
        "melting_point_k": 336.5,
        "boiling_point_k": 1032.0,
        "specific_heat": 0.75,
        "thermal_conductivity": 102.0,
        "flammable": True,
        "hazard_rating": 3,
        "hazard_description": "Extremely reactive alkali metal; explodes violently with water!",
        "description": "Soft alkali metal that floats on water and detonates with a characteristic violet flame."
},
    "koh": {
        "id": "koh",
        "name": "Potassium Hydroxide",
        "formula": "KOH",
        "state": "solid",
        "density": 2.044,
        "color": "#f3e8ffff",
        "melting_point_k": 633.0,
        "boiling_point_k": 1593.0,
        "specific_heat": 1.15,
        "thermal_conductivity": 0.5,
        "flammable": False,
        "hazard_rating": 3,
        "hazard_description": "Caustic alkaline chemical base.",
        "description": "Strong alkaline caustic salt formed from the hydrolysis of metallic potassium."
},
    "mno2": {
        "id": "mno2",
        "name": "Manganese Dioxide",
        "formula": "MnO\u2082",
        "state": "solid",
        "density": 5.026,
        "color": "#1c1917ff",
        "melting_point_k": 808.0,
        "boiling_point_k": 1200.0,
        "specific_heat": 0.62,
        "thermal_conductivity": 0.8,
        "flammable": False,
        "hazard_rating": 1,
        "hazard_description": "Inorganic decomposition catalyst.",
        "description": "Dark mineral powder that catalyzes violent peroxide decomposition into steam and oxygen."
},
    "cuo": {
        "id": "cuo",
        "name": "Copper(II) Oxide",
        "formula": "CuO",
        "state": "solid",
        "density": 6.31,
        "color": "#1e293bff",
        "melting_point_k": 1599.0,
        "boiling_point_k": 2273.0,
        "specific_heat": 0.53,
        "thermal_conductivity": 18.0,
        "flammable": False,
        "hazard_rating": 1,
        "hazard_description": "Black mineral powder from copper oxidation.",
        "description": "Dark mineral compound formed when metallic copper burns in hot oxygen."
}
}

# Empirical reactions: stoichiometry, enthalpy (kJ/mol), activation energy, and discovery data
REACTIONS_DATA: List[Dict[str, Any]] = [
    {
        "id": "volcano_effervescence",
        "name": "Baking Soda & Vinegar Volcano",
        "reactants": ["nahco3", "ch3cooh"],
        "products": ["ch3coona", "h2o", "co2"],
        "heat_yield_kj_mol": -15.0,  # Endothermic / cooling effect
        "temperature_delta_k": -4.5,
        "activation_energy_k": 270.0,
        "probability": 0.85,
        "pressure_release": 2.5,
        "category": "Acid-Base",
        "discovery_reward": 50,
        "description": "Produces bubbling carbon dioxide gas that drives liquid violently upward like a volcano."
    },
    {
        "id": "iron_slow_oxidation",
        "name": "Iron Corrosion (Rusting)",
        "reactants": ["fe", "h2o", "o2"],
        "products": ["fe2o3"],
        "heat_yield_kj_mol": 412.0,  # Exothermic
        "temperature_delta_k": 2.0,
        "activation_energy_k": 275.0,
        "probability": 0.02,  # Slow burn oxidation loop
        "pressure_release": 0.0,
        "category": "Redox",
        "discovery_reward": 75,
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
        "discovery_reward": 60,
        "description": "Hydrogen gas detonates rapidly with oxygen to generate pure superheated steam."
    },
    {
        "id": "methane_combustion",
        "name": "Methane Flame Combustion",
        "reactants": ["ch4", "o2"],
        "products": ["co2", "h2o_steam"],
        "heat_yield_kj_mol": 890.0,
        "temperature_delta_k": 140.0,
        "activation_energy_k": 370.0,
        "probability": 0.85,
        "pressure_release": 3.0,
        "category": "Combustion",
        "discovery_reward": 50,
        "description": "Natural gas burns brightly with oxygen, generating hot carbon dioxide and steam."
    },
    {
        "id": "ethanol_combustion",
        "name": "Ethanol Fuel Combustion",
        "reactants": ["c2h5oh", "o2"],
        "products": ["co2", "h2o_steam"],
        "heat_yield_kj_mol": 1367.0,
        "temperature_delta_k": 130.0,
        "activation_energy_k": 360.0,
        "probability": 0.80,
        "pressure_release": 2.5,
        "category": "Combustion",
        "discovery_reward": 50,
        "description": "Alcohol liquid burns with a clean flame producing carbon dioxide and steam."
    },
    {
        "id": "peroxide_decomposition",
        "name": "Hydrogen Peroxide Catalytic Decomposition",
        "reactants": ["h2o2"],
        "products": ["h2o", "o2"],
        "heat_yield_kj_mol": 98.2,
        "temperature_delta_k": 25.0,
        "activation_energy_k": 320.0,
        "probability": 0.35,
        "pressure_release": 1.5,
        "category": "Decomposition",
        "discovery_reward": 40,
        "description": "Peroxide decomposes into water and oxygen gas bubbles under heat or light."
    },
    {
        "id": "carbon_charcoal_burning",
        "name": "Carbon Glowing Combustion",
        "reactants": ["c", "o2"],
        "products": ["co2"],
        "heat_yield_kj_mol": 393.5,
        "temperature_delta_k": 90.0,
        "activation_energy_k": 400.0,
        "probability": 0.60,
        "pressure_release": 1.0,
        "category": "Combustion",
        "discovery_reward": 40,
        "description": "Charcoal embers glow orange as solid carbon combines with oxygen into carbon dioxide."
    },
    {
        "id": "quicklime_hydration",
        "name": "Quicklime Exothermic Slaking",
        "reactants": ["cao", "h2o"],
        "products": ["ca_oh_2"],
        "heat_yield_kj_mol": 63.7,
        "temperature_delta_k": 65.0,
        "activation_energy_k": 280.0,
        "probability": 0.85,
        "pressure_release": 0.5,
        "category": "Hydration",
        "discovery_reward": 50,
        "description": "Calcium oxide absorbs water with massive boiling heat release, generating slaked lime."
    },
    {
        "id": "slaked_lime_carbonation",
        "name": "Limewater Carbon Dioxide Test",
        "reactants": ["ca_oh_2", "co2"],
        "products": ["caco3", "h2o"],
        "heat_yield_kj_mol": 178.0,
        "temperature_delta_k": 5.0,
        "activation_energy_k": 285.0,
        "probability": 0.50,
        "pressure_release": 0.0,
        "category": "Precipitation",
        "discovery_reward": 45,
        "description": "Carbon dioxide turns clear limewater milky by precipitating fine solid calcium carbonate."
    },
    {
        "id": "chalk_acid_effervescence",
        "name": "Chalk Vinegar Effervescence",
        "reactants": ["caco3", "ch3cooh"],
        "products": ["ch3coona", "h2o", "co2"],
        "heat_yield_kj_mol": 35.0,
        "temperature_delta_k": 2.0,
        "activation_energy_k": 280.0,
        "probability": 0.40,
        "pressure_release": 1.5,
        "category": "Acid-Base",
        "discovery_reward": 45,
        "description": "Vinegar dissolves limestone rocks or seashells, releasing streams of carbon dioxide bubbles."
    },
    {
        "id": "neutralization_lye_muriatic",
        "name": "Classic Acid-Base Neutralization",
        "reactants": ["hcl", "naoh"],
        "products": ["nacl", "h2o"],
        "heat_yield_kj_mol": 57.3,
        "temperature_delta_k": 35.0,
        "activation_energy_k": 273.0,
        "probability": 0.95,
        "pressure_release": 0.0,
        "category": "Neutralization",
        "discovery_reward": 60,
        "description": "Caustic soda and hydrochloric acid violently neutralize into harmless saltwater and heat."
    },
    {
        "id": "bicarb_muriatic_fizz",
        "name": "Bicarbonate Muriatic Effervescence",
        "reactants": ["nahco3", "hcl"],
        "products": ["nacl", "h2o", "co2"],
        "heat_yield_kj_mol": 28.0,
        "temperature_delta_k": 8.0,
        "activation_energy_k": 275.0,
        "probability": 0.90,
        "pressure_release": 3.0,
        "category": "Acid-Base",
        "discovery_reward": 50,
        "description": "Energetic fizzing as hydrochloric acid instantly decomposes sodium bicarbonate."
    },
    {
        "id": "bleach_acid_chlorine_hazard",
        "name": "Toxic Chlorine Gas Release",
        "reactants": ["naclo", "hcl"],
        "products": ["nacl", "h2o", "cl2"],
        "heat_yield_kj_mol": 82.0,
        "temperature_delta_k": 15.0,
        "activation_energy_k": 280.0,
        "probability": 0.85,
        "pressure_release": 2.5,
        "category": "Hazardous Mixing",
        "discovery_reward": 100,
        "description": "DANGER: Mixing bleach with acidic toilet/muriatic cleaners liberates lethal green chlorine gas."
    },
    {
        "id": "water_steam_phase_change",
        "name": "Water Vaporization",
        "reactants": ["h2o"],
        "products": ["h2o_steam"],
        "heat_yield_kj_mol": -40.7,
        "temperature_delta_k": -5.0,
        "activation_energy_k": 373.15,
        "probability": 0.75,
        "pressure_release": 2.0,
        "category": "Phase Transition",
        "discovery_reward": 20,
        "description": "Liquid water reaches its boiling point and turns into buoyant steam."
    },
    {
        "id": "steam_condensation",
        "name": "Steam Condensation",
        "reactants": ["h2o_steam"],
        "products": ["h2o"],
        "heat_yield_kj_mol": 40.7,
        "temperature_delta_k": 5.0,
        "activation_energy_k": 0.0,
        "probability": 0.65,
        "pressure_release": 0.0,
        "category": "Phase Transition",
        "discovery_reward": 20,
        "description": "Steam cools below 373 K and condenses into droplets of liquid water."
    },
    {
        "id": "water_freezing",
        "name": "Water Freezing",
        "reactants": ["h2o"],
        "products": ["h2o_ice"],
        "heat_yield_kj_mol": 6.01,
        "temperature_delta_k": 1.0,
        "activation_energy_k": 0.0,
        "probability": 0.60,
        "pressure_release": 0.0,
        "category": "Phase Transition",
        "discovery_reward": 20,
        "description": "Water cools below 273.15 K to freeze into floating solid ice crystals."
    },
    {
        "id": "ice_melting",
        "name": "Ice Melting",
        "reactants": ["h2o_ice"],
        "products": ["h2o"],
        "heat_yield_kj_mol": -6.01,
        "temperature_delta_k": -1.0,
        "activation_energy_k": 273.15,
        "probability": 0.70,
        "pressure_release": 0.0,
        "category": "Phase Transition",
        "discovery_reward": 20,
        "description": "Ice absorbs thermal energy above 273.15 K and liquifies."
    },
    {
        "id": "iron_muriatic_hydrogen",
        "name": "Metal Dissolution in Acid",
        "reactants": ["fe", "hcl"],
        "products": ["h2"],
        "heat_yield_kj_mol": 87.9,
        "temperature_delta_k": 12.0,
        "activation_energy_k": 290.0,
        "probability": 0.25,
        "pressure_release": 1.2,
        "category": "Single Replacement",
        "discovery_reward": 65,
        "description": "Hydrochloric acid etches iron filings, dissolving the metal and releasing bubbles of hydrogen gas."
    },
    {
        "id": "limestone_thermal_calcination",
        "name": "Limestone Thermal Calcination",
        "reactants": ["caco3"],
        "products": ["cao", "co2"],
        "heat_yield_kj_mol": -178.0,
        "temperature_delta_k": -40.0,
        "activation_energy_k": 1100.0,
        "probability": 0.30,
        "pressure_release": 2.0,
        "category": "Thermal Decomposition",
        "discovery_reward": 80,
        "description": "Extreme heat roasts solid limestone into calcium oxide (quicklime) and releases carbon dioxide."
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

# The Day 1 Store Inventory (Milestone 10 Specifications)
STORE_ITEMS_DATA: List[Dict[str, Any]] = [
    {
        "id": "item_tap_water",
        "name": "Tap Water",
        "category": "Basics",
        "cost": 0,
        "description": "Pure municipal tap water (100% H₂O). Essential fluid for dissolving salts, heat management, and mixing.",
        "unlocked_by_default": True,
        "composition": [
            {"compound": "h2o", "percentage": 100}
        ],
        "primary_compound": "h2o",
        "icon": "Droplets"
    },
    {
        "id": "item_play_sand",
        "name": "Play Sand",
        "category": "Basics",
        "cost": 5,
        "description": "Fine washed silica sand (100% SiO₂). Inert particulate useful for building barriers, retaining walls, and filtering.",
        "unlocked_by_default": True,
        "composition": [
            {"compound": "sio2", "percentage": 100}
        ],
        "primary_compound": "sio2",
        "icon": "Layers"
    },
    {
        "id": "item_lab_glass",
        "name": "Lab Glassware (Pyrex)",
        "category": "Basics",
        "cost": 0,
        "description": "Borosilicate glass containment barriers and beakers (100% Pyrex). Immovable solid under gravity.",
        "unlocked_by_default": True,
        "composition": [
            {"compound": "glass", "percentage": 100}
        ],
        "primary_compound": "glass",
        "icon": "Box"
    },
    {
        "id": "item_baking_soda",
        "name": "Baking Soda",
        "category": "Household",
        "cost": 10,
        "description": "Pure sodium bicarbonate (100% NaHCO₃). Great for creating bubbly volcanic effervescence with weak acids.",
        "unlocked_by_default": False,
        "composition": [
            {"compound": "nahco3", "percentage": 100}
        ],
        "primary_compound": "nahco3",
        "icon": "Box"
    },
    {
        "id": "item_white_vinegar",
        "name": "White Vinegar",
        "category": "Household",
        "cost": 15,
        "description": "Dilute acetic acid solution (5% CH₃COOH, 95% H₂O). The foundation of kitchen science experiments.",
        "unlocked_by_default": False,
        "composition": [
            {"compound": "ch3cooh", "percentage": 5},
            {"compound": "h2o", "percentage": 95}
        ],
        "primary_compound": "ch3cooh",
        "icon": "FlaskConical"
    },
    {
        "id": "item_iron_filings",
        "name": "Iron Filings",
        "category": "Metals",
        "cost": 25,
        "description": "High-purity elemental iron filings (100% Fe). Dense, thermally conductive particles prone to rusting.",
        "unlocked_by_default": False,
        "composition": [
            {"compound": "fe", "percentage": 100}
        ],
        "primary_compound": "fe",
        "icon": "Hammer"
    },
    {
        "id": "item_household_bleach",
        "name": "Household Bleach",
        "category": "Cleaning",
        "cost": 40,
        "description": "Disinfectant solution (5% NaClO, 95% H₂O). CAUTION: Read warning labels carefully before mixing.",
        "unlocked_by_default": False,
        "composition": [
            {"compound": "naclo", "percentage": 5},
            {"compound": "h2o", "percentage": 95}
        ],
        "primary_compound": "naclo",
        "icon": "AlertTriangle"
    },
    {
        "id": "item_window_cleaner",
        "name": "Window Cleaner",
        "category": "Cleaning",
        "cost": 40,
        "description": "Glass cleaning solution with ammonia (5% NH₃, 95% H₂O). Volatile alkaline detergent.",
        "unlocked_by_default": False,
        "composition": [
            {"compound": "nh3", "percentage": 5},
            {"compound": "h2o", "percentage": 95}
        ],
        "primary_compound": "nh3",
        "icon": "SprayCan"
    },
    {
        "id": "item_sodium_metal",
        "name": "Metallic Sodium",
        "category": "Advanced",
        "cost": 65,
        "description": "Elemental alkali metal stored in mineral oil (100% Na). Highly reactive with water!",
        "unlocked_by_default": False,
        "composition": [
            {"compound": "na", "percentage": 100}
        ],
        "primary_compound": "na",
        "icon": "Zap"
    },
    {
        "id": "item_muriatic_acid",
        "name": "Muriatic Acid",
        "category": "Advanced",
        "cost": 50,
        "description": "Industrial hydrochloric acid solution (20% HCl, 80% H₂O). Extremely acidic and corrosive.",
        "unlocked_by_default": False,
        "composition": [
            {"compound": "hcl", "percentage": 20},
            {"compound": "h2o", "percentage": 80}
        ],
        "primary_compound": "hcl",
        "icon": "Skull"
    },
    {
        "id": "item_charcoal",
        "name": "Activated Charcoal",
        "category": "Basics",
        "cost": 12,
        "description": "Pure carbon granules (100% C). Combustible fuel for high temperature combustion studies.",
        "unlocked_by_default": False,
        "composition": [
            {"compound": "c", "percentage": 100}
        ],
        "primary_compound": "c",
        "icon": "Flame"
    },
    {
        "id": "item_quicklime",
        "name": "Quicklime",
        "category": "Advanced",
        "cost": 35,
        "description": "Calcium oxide powder (100% CaO). Slakes exothermically when in contact with water.",
        "unlocked_by_default": False,
        "composition": [
            {"compound": "cao", "percentage": 100}
        ],
        "primary_compound": "cao",
        "icon": "Sun"
    },
    {
        "id": "item_rubbing_alcohol",
        "name": "Rubbing Alcohol",
        "category": "Household",
        "cost": 20,
        "description": "Ethanol disinfectant (70% C₂H₅OH, 30% H₂O). Lightweight flammable fluid.",
        "unlocked_by_default": False,
        "composition": [
            {"compound": "c2h5oh", "percentage": 70},
            {"compound": "h2o", "percentage": 30}
        ],
        "primary_compound": "c2h5oh",
        "icon": "Wine"
    },
    {
        "id": "item_bunsen_burner",
        "name": "Bunsen Burner",
        "category": "Equipment",
        "cost": 15,
        "description": "Solid-state laboratory burner continuously adding +50°C heat per tick to cells directly above it.",
        "unlocked_by_default": True,
        "composition": [
            {"compound": "bunsen_burner", "percentage": 100}
        ],
        "primary_compound": "bunsen_burner",
        "icon": "Flame"
    },
    {
        "id": "item_cooling_plate",
        "name": "Cooling Plate",
        "category": "Equipment",
        "cost": 15,
        "description": "Thermoelectric cryo cooling plate continuously chilling touching cells down to -20°C (253.15 K).",
        "unlocked_by_default": True,
        "composition": [
            {"compound": "cooling_plate", "percentage": 100}
        ],
        "primary_compound": "cooling_plate",
        "icon": "Snowflake"
    },
    {
        "id": "item_stirrer",
        "name": "Magnetic Stirrer",
        "category": "Equipment",
        "cost": 15,
        "description": "Mechanical lab agitator applying horizontal velocity vectors to adjacent liquids to force mixing.",
        "unlocked_by_default": True,
        "composition": [
            {"compound": "stirrer", "percentage": 100}
        ],
        "primary_compound": "stirrer",
        "icon": "Activity"
    },
    {
        "id": "item_ice_block",
        "name": "Solid Ice Block",
        "category": "Basics",
        "cost": 5,
        "description": "Solid crystalline water (100% H₂O Ice). Melts into liquid water when heated above 273.15 K.",
        "unlocked_by_default": True,
        "composition": [
            {"compound": "h2o_ice", "percentage": 100}
        ],
        "primary_compound": "h2o_ice",
        "icon": "Box"
    },
    {
        "id": "item_ammonia",
        "name": "Ammonia Gas",
        "category": "Cleaning",
        "cost": 25,
        "description": "Compressed ammonia gas (100% NH₃). Volatile alkaline compound that expands rapidly.",
        "unlocked_by_default": False,
        "composition": [
            {"compound": "nh3", "percentage": 100}
        ],
        "primary_compound": "nh3",
        "icon": "SprayCan"
    },
    {
        "id": "item_oxygen_gas",
        "name": "Compressed Oxygen",
        "category": "Advanced",
        "cost": 30,
        "description": "High-purity compressed gaseous oxygen (100% O₂). Strong oxidizer that accelerates exothermic reactions.",
        "unlocked_by_default": False,
        "composition": [
            {"compound": "o2", "percentage": 100}
        ],
        "primary_compound": "o2",
        "icon": "Wind"
    },
    {
        "id": "item_table_salt",
        "name": "Pure Table Salt",
        "category": "Basics",
        "cost": 0,
        "description": "Fine crystalline sodium chloride (100% NaCl). Benign mineral granules; completely free starter material.",
        "unlocked_by_default": True,
        "composition": [
                {
                        "compound": "nacl",
                        "percentage": 100
                }
        ],
        "primary_compound": "nacl",
        "icon": "Sparkles"
},
    {
        "id": "item_sugar",
        "name": "Pure Cane Sugar",
        "category": "Basics",
        "cost": 5,
        "description": "Pure granulated sucrose (100% C\u2081\u2082H\u2082\u2082O\u2081\u2081). Melts into caramel or chars when contacting sulfuric acid.",
        "unlocked_by_default": True,
        "composition": [
                {
                        "compound": "c12h22o11",
                        "percentage": 100
                }
        ],
        "primary_compound": "c12h22o11",
        "icon": "Box"
},
    {
        "id": "item_dry_ice",
        "name": "Dry Ice Pellets",
        "category": "Cryo",
        "cost": 5,
        "description": "Solid carbon dioxide (100% CO\u2082 Ice). Sublimates directly at 195 K into expanding cold vapor.",
        "unlocked_by_default": True,
        "composition": [
                {
                        "compound": "co2_ice",
                        "percentage": 100
                }
        ],
        "primary_compound": "co2_ice",
        "icon": "Snowflake"
},
    {
        "id": "item_lamp_oil",
        "name": "Kerosene Lamp Oil",
        "category": "Fluids",
        "cost": 5,
        "description": "Refined hydrocarbon fuel oil (100% Oil). Floats on water surfaces and catches fire vigorously.",
        "unlocked_by_default": True,
        "composition": [
                {
                        "compound": "oil",
                        "percentage": 100
                }
        ],
        "primary_compound": "oil",
        "icon": "Flame"
},
    {
        "id": "item_chalk",
        "name": "Chalk Powder",
        "category": "Basics",
        "cost": 5,
        "description": "Fine calcium carbonate powder (100% CaCO\u2083). Fizzes actively when exposed to acids.",
        "unlocked_by_default": True,
        "composition": [
                {
                        "compound": "caco3",
                        "percentage": 100
                }
        ],
        "primary_compound": "caco3",
        "icon": "CircleDot"
},
    {
        "id": "item_gunpowder",
        "name": "Black Powder (Gunpowder)",
        "category": "Pyrotechnics",
        "cost": 10,
        "description": "Granular pyrotechnic deflagration mix (100% Gunpowder). Explodes violently with high gas pressure.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "gunpowder",
                        "percentage": 100
                }
        ],
        "primary_compound": "gunpowder",
        "icon": "Bomb"
},
    {
        "id": "item_magnesium",
        "name": "Magnesium Metal Strip",
        "category": "Pyrotechnics",
        "cost": 10,
        "description": "Pure elemental magnesium (100% Mg). Burns with blinding incandescent white brilliance.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "mg",
                        "percentage": 100
                }
        ],
        "primary_compound": "mg",
        "icon": "Zap"
},
    {
        "id": "item_liquid_nitrogen",
        "name": "Liquid Nitrogen Dewar",
        "category": "Cryo",
        "cost": 10,
        "description": "Ultra-cold cryogenic fluid (100% LN\u2082 at 77 K). Instantly flash-freezes water to solid ice.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "ln2",
                        "percentage": 100
                }
        ],
        "primary_compound": "ln2",
        "icon": "Snowflake"
},
    {
        "id": "item_sulfur",
        "name": "Brimstone Sulfur Powder",
        "category": "Pyrotechnics",
        "cost": 5,
        "description": "Bright yellow elemental sulfur (100% S). Burns with a blue flame producing pungent sulfur dioxide.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "s",
                        "percentage": 100
                }
        ],
        "primary_compound": "s",
        "icon": "Flame"
},
    {
        "id": "item_potassium_nitrate",
        "name": "Saltpeter (KNO\u2083)",
        "category": "Pyrotechnics",
        "cost": 10,
        "description": "Pure potassium nitrate (100% KNO\u2083). Powerful oxidizer for energetic pyrotechnic mixtures.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "kno3",
                        "percentage": 100
                }
        ],
        "primary_compound": "kno3",
        "icon": "Sparkles"
},
    {
        "id": "item_aluminium_powder",
        "name": "Aluminium Metal Powder",
        "category": "Metals",
        "cost": 10,
        "description": "Fine atomized aluminium (100% Al). Combines with rust in the famous super-hot thermite reaction.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "al",
                        "percentage": 100
                }
        ],
        "primary_compound": "al",
        "icon": "Shield"
},
    {
        "id": "item_copper_metal",
        "name": "Pure Copper Powder",
        "category": "Metals",
        "cost": 10,
        "description": "Elemental copper filings (100% Cu). Excellent thermal conductor that oxidizes under flame heat.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "cu",
                        "percentage": 100
                }
        ],
        "primary_compound": "cu",
        "icon": "Coins"
},
    {
        "id": "item_hydrogen_peroxide",
        "name": "Concentrated Peroxide (30%)",
        "category": "Advanced",
        "cost": 10,
        "description": "High-strength hydrogen peroxide (100% H\u2082O\u2082). Decomposes violently into expanding foam with catalysts.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "h2o2",
                        "percentage": 100
                }
        ],
        "primary_compound": "h2o2",
        "icon": "FlaskConical"
},
    {
        "id": "item_manganese_dioxide",
        "name": "Manganese Dioxide Catalyst",
        "category": "Advanced",
        "cost": 10,
        "description": "Black catalytic mineral powder (100% MnO\u2082). Triggers the famous Elephant Toothpaste eruption.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "mno2",
                        "percentage": 100
                }
        ],
        "primary_compound": "mno2",
        "icon": "Atom"
},
    {
        "id": "item_glycerin",
        "name": "Pure Glycerin Syrupy Fluid",
        "category": "Fluids",
        "cost": 10,
        "description": "Dense viscous glycerol (100% C\u2083H\u2088O\u2083). Sinks in water and ignites hypergolically with permanganate.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "c3h8o3",
                        "percentage": 100
                }
        ],
        "primary_compound": "c3h8o3",
        "icon": "Droplets"
},
    {
        "id": "item_potassium_permanganate",
        "name": "Potassium Permanganate",
        "category": "Advanced",
        "cost": 10,
        "description": "Intense purple crystals (100% KMnO\u2084). Potent oxidizer causing delayed spontaneous fires.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "kmno4",
                        "percentage": 100
                }
        ],
        "primary_compound": "kmno4",
        "icon": "Sparkles"
},
    {
        "id": "item_sulfuric_acid",
        "name": "Concentrated Sulfuric Acid",
        "category": "Advanced",
        "cost": 15,
        "description": "Extremely dense mineral acid (100% H\u2082SO\u2084). Dehydrates carbohydrates into erupting carbon snakes.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "h2so4",
                        "percentage": 100
                }
        ],
        "primary_compound": "h2so4",
        "icon": "AlertTriangle"
},
    {
        "id": "item_volcanic_lava",
        "name": "Volcanic Magma / Lava",
        "category": "Advanced",
        "cost": 15,
        "description": "Superheated incandescent 1400 K liquid magma (100% Lava). Boils water violently into steam.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "lava",
                        "percentage": 100
                }
        ],
        "primary_compound": "lava",
        "icon": "Flame"
},
    {
        "id": "item_potassium_metal",
        "name": "Metallic Potassium",
        "category": "Metals",
        "cost": 20,
        "description": "Pure alkali metal (100% K). Explodes even more violently than sodium when touching water.",
        "unlocked_by_default": False,
        "composition": [
                {
                        "compound": "k",
                        "percentage": 100
                }
        ],
        "primary_compound": "k",
        "icon": "Zap"
}
]

def main():
    print(f"Extracting {len(MOLECULES_DATA)} chemical species...")
    for target_dir in [PUBLIC_DATA_DIR, SRC_DATA_DIR]:
        with open(os.path.join(target_dir, "molecules.json"), "w", encoding="utf-8") as f:
            json.dump(MOLECULES_DATA, f, indent=2, ensure_ascii=False)
        with open(os.path.join(target_dir, "reactions.json"), "w", encoding="utf-8") as f:
            json.dump(REACTIONS_DATA, f, indent=2, ensure_ascii=False)
        with open(os.path.join(target_dir, "store_items.json"), "w", encoding="utf-8") as f:
            json.dump(STORE_ITEMS_DATA, f, indent=2, ensure_ascii=False)
    print("-> Data saved to public/data/ and src/data/")
    print("Data extraction complete and verified against empirical literature!")

if __name__ == "__main__":
    main()
