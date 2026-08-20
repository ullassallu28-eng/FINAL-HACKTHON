"""
Seed script to populate 15 demo farms across 5 states (Jharkhand: 4, Karnataka: 3,
Andhra Pradesh: 3, Tamil Nadu: 2, Kerala: 3), pre-created demo users (Farmers, Vet, Officer),
districts, biosecurity passports, and user-farm assignments.

Run: python scripts/seed.py
"""

import sys
import os

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.database.base import Base
from app.core.config import settings

# Engine resolution — try settings.DATABASE_URL, fallback to sqlite if postgres unprov.
try:
    from app.database.session import engine
    # test connection
    with engine.connect() as conn:
        pass
except Exception:
    db_path = os.path.join(backend_dir, "bioshield_local.db")
    sqlite_url = f"sqlite:///{db_path}"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

from app.models.enums import UserRole, FarmType, RiskLevel, RegistrationStatus, ComplianceStatus, RiskTrend
from app.models.user import User, District, UserFarmAssignment
from app.models.farm import Farm, Zone
from app.models.passport import BiosecurityPassport
from app.core.security import get_password_hash


DISTRICTS_DATA = [
    # Jharkhand (4)
    {"id": "district-ranchi", "name": "Ranchi", "state": "Jharkhand"},
    {"id": "district-ramgarh", "name": "Ramgarh", "state": "Jharkhand"},
    {"id": "district-hazaribagh", "name": "Hazaribagh", "state": "Jharkhand"},
    {"id": "district-khunti", "name": "Khunti", "state": "Jharkhand"},
    # Karnataka (3)
    {"id": "district-bengaluru-rural", "name": "Bengaluru Rural", "state": "Karnataka"},
    {"id": "district-shivamogga", "name": "Shivamogga", "state": "Karnataka"},
    {"id": "district-mysuru", "name": "Mysuru", "state": "Karnataka"},
    # Andhra Pradesh (3)
    {"id": "district-east-godavari", "name": "East Godavari", "state": "Andhra Pradesh"},
    {"id": "district-krishna", "name": "Krishna", "state": "Andhra Pradesh"},
    {"id": "district-chittoor", "name": "Chittoor", "state": "Andhra Pradesh"},
    # Tamil Nadu (2)
    {"id": "district-namakkal", "name": "Namakkal", "state": "Tamil Nadu"},
    {"id": "district-coimbatore", "name": "Coimbatore", "state": "Tamil Nadu"},
    # Kerala (3)
    {"id": "district-wayanad", "name": "Wayanad", "state": "Kerala"},
    {"id": "district-alappuzha", "name": "Alappuzha", "state": "Kerala"},
    {"id": "district-thrissur", "name": "Thrissur", "state": "Kerala"},
]


FARMS_DATA = [
    # --- JHARKHAND (4 Farms) ---
    {
        "id": "FARM-JH-2026-0487",
        "name": "GreenValley Bio-Farm #04",
        "owner_name": "Rajesh Kumar",
        "farmer_email": "farmer@bioshield.local",
        "location": "Kanke, Ranchi, Jharkhand",
        "farm_type": FarmType.POULTRY,
        "capacity": 3500,
        "animal_count": 2850,
        "district_id": "district-ranchi",
        "biosecurity_score": 78,
        "previous_score": 74,
        "risk_level": RiskLevel.SAFE,
        "latitude": 23.3441,
        "longitude": 85.3096,
        "compliance": ComplianceStatus.COMPLIANT,
        "trend": RiskTrend.IMPROVING,
    },
    {
        "id": "FARM-JH-2026-0102",
        "name": "Apex Swine Breeding Center",
        "owner_name": "Suresh Mahato",
        "farmer_email": "farmer.suresh@bioshield.local",
        "location": "Ramgarh, Jharkhand",
        "farm_type": FarmType.PIG,
        "capacity": 1200,
        "animal_count": 940,
        "district_id": "district-ramgarh",
        "biosecurity_score": 42,
        "previous_score": 58,
        "risk_level": RiskLevel.CRITICAL,
        "latitude": 23.6300,
        "longitude": 85.5100,
        "compliance": ComplianceStatus.NON_COMPLIANT,
        "trend": RiskTrend.DETERIORATING,
    },
    {
        "id": "FARM-JH-2026-0331",
        "name": "SunRise Poultry Haven",
        "owner_name": "Anita Devi",
        "farmer_email": "farmer.anita@bioshield.local",
        "location": "Hazaribagh, Jharkhand",
        "farm_type": FarmType.POULTRY,
        "capacity": 5000,
        "animal_count": 4200,
        "district_id": "district-hazaribagh",
        "biosecurity_score": 65,
        "previous_score": 68,
        "risk_level": RiskLevel.CAUTION,
        "latitude": 23.9900,
        "longitude": 85.3600,
        "compliance": ComplianceStatus.ATTENTION_REQUIRED,
        "trend": RiskTrend.STABLE,
    },
    {
        "id": "FARM-JH-2026-0789",
        "name": "Chota Nagpur Bio-Swine Farm",
        "owner_name": "Vikram Singh",
        "farmer_email": "farmer.vikram@bioshield.local",
        "location": "Khunti, Jharkhand",
        "farm_type": FarmType.PIG,
        "capacity": 2500,
        "animal_count": 1800,
        "district_id": "district-khunti",
        "biosecurity_score": 89,
        "previous_score": 87,
        "risk_level": RiskLevel.SAFE,
        "latitude": 23.0700,
        "longitude": 85.2700,
        "compliance": ComplianceStatus.COMPLIANT,
        "trend": RiskTrend.IMPROVING,
    },

    # --- KARNATAKA (3 Farms) ---
    {
        "id": "FARM-KA-2026-0201",
        "name": "Devanahalli Poultry Estate",
        "owner_name": "Ramesh Gowda",
        "farmer_email": "farmer.ramesh@bioshield.local",
        "location": "Devanahalli, Bengaluru Rural, Karnataka",
        "farm_type": FarmType.POULTRY,
        "capacity": 6000,
        "animal_count": 5200,
        "district_id": "district-bengaluru-rural",
        "biosecurity_score": 82,
        "previous_score": 80,
        "risk_level": RiskLevel.SAFE,
        "latitude": 13.2458,
        "longitude": 77.7126,
        "compliance": ComplianceStatus.COMPLIANT,
        "trend": RiskTrend.IMPROVING,
    },
    {
        "id": "FARM-KA-2026-0202",
        "name": "Malnad Swine Breeding Farm",
        "owner_name": "Manjunath Hegde",
        "farmer_email": "farmer.manjunath@bioshield.local",
        "location": "Shivamogga, Karnataka",
        "farm_type": FarmType.PIG,
        "capacity": 1800,
        "animal_count": 1450,
        "district_id": "district-shivamogga",
        "biosecurity_score": 58,
        "previous_score": 62,
        "risk_level": RiskLevel.CAUTION,
        "latitude": 13.9299,
        "longitude": 75.5681,
        "compliance": ComplianceStatus.ATTENTION_REQUIRED,
        "trend": RiskTrend.DETERIORATING,
    },
    {
        "id": "FARM-KA-2026-0203",
        "name": "Mysuru Broiler & Layer Farm",
        "owner_name": "Kavitha Rao",
        "farmer_email": "farmer.kavitha@bioshield.local",
        "location": "Mysuru, Karnataka",
        "farm_type": FarmType.POULTRY,
        "capacity": 4500,
        "animal_count": 3900,
        "district_id": "district-mysuru",
        "biosecurity_score": 91,
        "previous_score": 88,
        "risk_level": RiskLevel.SAFE,
        "latitude": 12.2958,
        "longitude": 76.6394,
        "compliance": ComplianceStatus.COMPLIANT,
        "trend": RiskTrend.IMPROVING,
    },

    # --- ANDHRA PRADESH (3 Farms) ---
    {
        "id": "FARM-AP-2026-0301",
        "name": "East Godavari Poultry Complex",
        "owner_name": "Venkat Reddy",
        "farmer_email": "farmer.venkat@bioshield.local",
        "location": "Rajahmundry, East Godavari, AP",
        "farm_type": FarmType.POULTRY,
        "capacity": 8000,
        "animal_count": 7100,
        "district_id": "district-east-godavari",
        "biosecurity_score": 75,
        "previous_score": 73,
        "risk_level": RiskLevel.SAFE,
        "latitude": 17.0005,
        "longitude": 81.8040,
        "compliance": ComplianceStatus.COMPLIANT,
        "trend": RiskTrend.STABLE,
    },
    {
        "id": "FARM-AP-2026-0302",
        "name": "Krishna Delta Swine Hub",
        "owner_name": "Nageswara Rao",
        "farmer_email": "farmer.nagesh@bioshield.local",
        "location": "Vijayawada, Krishna, AP",
        "farm_type": FarmType.PIG,
        "capacity": 2200,
        "animal_count": 1750,
        "district_id": "district-krishna",
        "biosecurity_score": 38,
        "previous_score": 45,
        "risk_level": RiskLevel.CRITICAL,
        "latitude": 16.5062,
        "longitude": 80.6480,
        "compliance": ComplianceStatus.NON_COMPLIANT,
        "trend": RiskTrend.DETERIORATING,
    },
    {
        "id": "FARM-AP-2026-0303",
        "name": "Chittoor Modern Layer Farm",
        "owner_name": "Lakshmi Prasad",
        "farmer_email": "farmer.lakshmi@bioshield.local",
        "location": "Chittoor, Andhra Pradesh",
        "farm_type": FarmType.POULTRY,
        "capacity": 5500,
        "animal_count": 4800,
        "district_id": "district-chittoor",
        "biosecurity_score": 84,
        "previous_score": 82,
        "risk_level": RiskLevel.SAFE,
        "latitude": 13.2172,
        "longitude": 79.1003,
        "compliance": ComplianceStatus.COMPLIANT,
        "trend": RiskTrend.IMPROVING,
    },

    # --- TAMIL NADU (2 Farms) ---
    {
        "id": "FARM-TN-2026-0401",
        "name": "Namakkal Mega Poultry Farm",
        "owner_name": "Subramanian K",
        "farmer_email": "farmer.subbu@bioshield.local",
        "location": "Namakkal, Tamil Nadu",
        "farm_type": FarmType.POULTRY,
        "capacity": 10000,
        "animal_count": 8900,
        "district_id": "district-namakkal",
        "biosecurity_score": 88,
        "previous_score": 85,
        "risk_level": RiskLevel.SAFE,
        "latitude": 11.2189,
        "longitude": 78.1674,
        "compliance": ComplianceStatus.COMPLIANT,
        "trend": RiskTrend.IMPROVING,
    },
    {
        "id": "FARM-TN-2026-0402",
        "name": "Coimbatore Swine Genetic Center",
        "owner_name": "Selvam Arumugam",
        "farmer_email": "farmer.selvam@bioshield.local",
        "location": "Coimbatore, Tamil Nadu",
        "farm_type": FarmType.PIG,
        "capacity": 1500,
        "animal_count": 1200,
        "district_id": "district-coimbatore",
        "biosecurity_score": 62,
        "previous_score": 64,
        "risk_level": RiskLevel.CAUTION,
        "latitude": 11.0168,
        "longitude": 76.9558,
        "compliance": ComplianceStatus.ATTENTION_REQUIRED,
        "trend": RiskTrend.STABLE,
    },

    # --- KERALA (3 Farms) ---
    {
        "id": "FARM-KL-2026-0501",
        "name": "Wayanad High Range Swine Farm",
        "owner_name": "Joseph Kurian",
        "farmer_email": "farmer.joseph@bioshield.local",
        "location": "Wayanad, Kerala",
        "farm_type": FarmType.PIG,
        "capacity": 1100,
        "animal_count": 880,
        "district_id": "district-wayanad",
        "biosecurity_score": 79,
        "previous_score": 76,
        "risk_level": RiskLevel.SAFE,
        "latitude": 11.6854,
        "longitude": 76.1320,
        "compliance": ComplianceStatus.COMPLIANT,
        "trend": RiskTrend.IMPROVING,
    },
    {
        "id": "FARM-KL-2026-0502",
        "name": "Kuttanad Duck & Poultry Farm",
        "owner_name": "Mathew Thomas",
        "farmer_email": "farmer.mathew@bioshield.local",
        "location": "Alappuzha, Kerala",
        "farm_type": FarmType.POULTRY,
        "capacity": 3200,
        "animal_count": 2700,
        "district_id": "district-alappuzha",
        "biosecurity_score": 53,
        "previous_score": 59,
        "risk_level": RiskLevel.CAUTION,
        "latitude": 9.4981,
        "longitude": 76.3388,
        "compliance": ComplianceStatus.ATTENTION_REQUIRED,
        "trend": RiskTrend.DETERIORATING,
    },
    {
        "id": "FARM-KL-2026-0503",
        "name": "Thrissur Bio-Piggery & Breeder",
        "owner_name": "Anoop Menon",
        "farmer_email": "farmer.anoop@bioshield.local",
        "location": "Thrissur, Kerala",
        "farm_type": FarmType.PIG,
        "capacity": 1600,
        "animal_count": 1320,
        "district_id": "district-thrissur",
        "biosecurity_score": 86,
        "previous_score": 83,
        "risk_level": RiskLevel.SAFE,
        "latitude": 10.5276,
        "longitude": 76.2144,
        "compliance": ComplianceStatus.COMPLIANT,
        "trend": RiskTrend.IMPROVING,
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        print("Seeding multi-state database with 15 farms across 5 states...")

        # 1. Seed Districts
        existing_district_ids = {d.id for d in db.query(District.id).all()}
        for d in DISTRICTS_DATA:
            if d["id"] not in existing_district_ids:
                db.add(District(id=d["id"], name=d["name"], state=d["state"]))
        db.flush()

        # 2. Seed Primary Vet and Officer Accounts
        default_pwd_hash = get_password_hash("farmer123")
        vet_pwd_hash = get_password_hash("vet123")
        officer_pwd_hash = get_password_hash("officer123")

        vet = db.query(User).filter(User.email == "vet@bioshield.local").first()
        if not vet:
            vet = User(
                email="vet@bioshield.local",
                password_hash=vet_pwd_hash,
                full_name="Dr. Ananya Sharma",
                role=UserRole.VETERINARIAN,
                phone="+91 9876543211",
                district_id="district-ranchi",
            )
            db.add(vet)

        officer = db.query(User).filter(User.email == "officer@bioshield.local").first()
        if not officer:
            officer = User(
                email="officer@bioshield.local",
                password_hash=officer_pwd_hash,
                full_name="Officer Suresh Verma",
                role=UserRole.OFFICER,
                phone="+91 9876543212",
                district_id="district-ranchi",
            )
            db.add(officer)
        db.flush()

        # 3. Seed 15 Farms, Passports, and Farmer Users
        existing_farm_ids = {f.id for f in db.query(Farm.id).all()}
        existing_user_emails = {u.email for u in db.query(User.email).all()}

        for farm_info in FARMS_DATA:
            # Create or find farmer user
            farmer_email = farm_info["farmer_email"]
            farmer_user = db.query(User).filter(User.email == farmer_email).first()
            if not farmer_user:
                farmer_user = User(
                    email=farmer_email,
                    password_hash=default_pwd_hash,
                    full_name=farm_info["owner_name"],
                    role=UserRole.FARMER,
                    district_id=farm_info["district_id"],
                )
                db.add(farmer_user)
                db.flush()

            # Create farm if missing
            farm_id = farm_info["id"]
            if farm_id not in existing_farm_ids:
                farm = Farm(
                    id=farm_id,
                    name=farm_info["name"],
                    owner_name=farm_info["owner_name"],
                    location=farm_info["location"],
                    farm_type=farm_info["farm_type"],
                    capacity=farm_info["capacity"],
                    animal_count=farm_info["animal_count"],
                    district_id=farm_info["district_id"],
                    registration_status=RegistrationStatus.REGISTERED,
                    biosecurity_score=farm_info["biosecurity_score"],
                    previous_score=farm_info["previous_score"],
                    risk_level=farm_info["risk_level"],
                    latitude=farm_info["latitude"],
                    longitude=farm_info["longitude"],
                )
                db.add(farm)
                db.flush()

                # Biosecurity Passport
                passport = BiosecurityPassport(
                    id=f"PASS-{farm_id}",
                    farm_id=farm_id,
                    passport_qr_code=f"BS-PASSPORT-{farm_id}-VERIFIED",
                    compliance_status=farm_info["compliance"],
                    risk_trend=farm_info["trend"],
                    issue_date=date.today(),
                )
                db.add(passport)

                # Assign farm to its Farmer
                assignment = UserFarmAssignment(
                    user_id=farmer_user.id,
                    farm_id=farm_id,
                    is_owner=True,
                )
                db.add(assignment)

                # Assign farm to Vet as authorized farm
                vet_assignment = UserFarmAssignment(
                    user_id=vet.id,
                    farm_id=farm_id,
                    is_owner=False,
                )
                db.add(vet_assignment)

        db.commit()
        print("Database seeded successfully with 15 farms across 5 states!")


if __name__ == "__main__":
    seed()
