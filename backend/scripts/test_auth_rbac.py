import sys
import os

# Use SQLite test database for automated test run
test_db_path = os.path.join(os.path.dirname(__file__), "test_bioshield.db")
if os.path.exists(test_db_path):
    try:
        os.remove(test_db_path)
    except Exception:
        pass

os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path}"

# Ensure backend folder is in path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.database.base import Base
from app.database.session import engine
from app.main import app
from app.models.enums import UserRole, FarmType, RiskLevel, RegistrationStatus
from app.models.user import User, District, UserFarmAssignment
from app.models.farm import Farm
from app.core.security import get_password_hash

def seed_test_db():
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        # Create Districts
        dist1 = District(id="district-ranchi", name="Ranchi", state="Jharkhand")
        dist2 = District(id="district-bokaro", name="Bokaro", state="Jharkhand")
        db.add_all([dist1, dist2])
        db.flush()

        # Create Users
        farmer = User(
            email="farmer@bioshield.local",
            password_hash=get_password_hash("farmer123"),
            full_name="Rajesh Kumar",
            role=UserRole.FARMER,
            phone="+91 9876543210",
            district_id="district-ranchi",
        )
        vet = User(
            email="vet@bioshield.local",
            password_hash=get_password_hash("vet123"),
            full_name="Dr. Ananya Sharma",
            role=UserRole.VETERINARIAN,
            phone="+91 9876543211",
            district_id="district-ranchi",
        )
        officer = User(
            email="officer@bioshield.local",
            password_hash=get_password_hash("officer123"),
            full_name="Officer Suresh Verma",
            role=UserRole.OFFICER,
            phone="+91 9876543212",
            district_id="district-ranchi",
        )
        db.add_all([farmer, vet, officer])
        db.flush()

        # Create Farms
        farm1 = Farm(
            id="FARM-JH-2026-0001",
            name="GreenValley Poultry Farm",
            owner_name="Rajesh Kumar",
            location="Kanke, Ranchi",
            farm_type=FarmType.POULTRY,
            capacity=5000,
            animal_count=4200,
            district_id="district-ranchi",
            registration_status=RegistrationStatus.REGISTERED,
            biosecurity_score=78,
            previous_score=75,
            risk_level=RiskLevel.SAFE,
        )
        farm2 = Farm(
            id="FARM-JH-2026-0002",
            name="SteelCity Swine Farm",
            owner_name="Amit Singh",
            location="Chas, Bokaro",
            farm_type=FarmType.PIG,
            capacity=1200,
            animal_count=850,
            district_id="district-bokaro",
            registration_status=RegistrationStatus.REGISTERED,
            biosecurity_score=45,
            previous_score=50,
            risk_level=RiskLevel.CAUTION,
        )
        db.add_all([farm1, farm2])
        db.flush()

        # Assign farm1 to farmer
        assignment = UserFarmAssignment(user_id=farmer.id, farm_id=farm1.id, is_owner=True)
        db.add(assignment)
        db.commit()

def run_tests():
    seed_test_db()

    client = TestClient(app)
    print("=== STARTING AGRI-SENTINEL AUTH & RBAC SECURITY TESTS ===")

    # 1. Unauthenticated endpoints test (Must return 401)
    protected_paths = [
        ("GET", "/api/v1/farms"),
        ("GET", "/api/v1/incidents"),
        ("GET", "/api/v1/corrective-actions"),
        ("GET", "/api/v1/officer/stats"),
        ("GET", "/api/v1/risk/factors"),
        ("GET", "/api/v1/notifications"),
    ]

    for method, path in protected_paths:
        res = client.request(method, path)
        assert res.status_code == 401, f"Expected 401 for unauthenticated {path}, got {res.status_code}: {res.text}"
        print(f"[OK] Unauthenticated {method} {path} returned 401 Unauthorized")

    # 2. Login as Farmer via password
    farmer_login = client.post("/api/v1/auth/login", json={"email": "farmer@bioshield.local", "password": "farmer123"})
    assert farmer_login.status_code == 200, f"Farmer login failed: {farmer_login.text}"
    farmer_token = farmer_login.json()["accessToken"]
    farmer_headers = {"Authorization": f"Bearer {farmer_token}"}
    assert farmer_login.json()["user"]["role"] == "farmer"
    print("[OK] Farmer password login successful (Role: farmer)")

    # Test invalid password rejection
    bad_login = client.post("/api/v1/auth/login", json={"email": "farmer@bioshield.local", "password": "wrongpassword"})
    assert bad_login.status_code == 401, f"Expected 401 for bad password, got {bad_login.status_code}"
    print("[OK] Invalid password login rejected with 401 Unauthorized")

    # 3. Login as Vet
    vet_login = client.post("/api/v1/auth/login", json={"email": "vet@bioshield.local", "password": "vet123"})
    assert vet_login.status_code == 200, f"Vet login failed: {vet_login.text}"
    vet_token = vet_login.json()["accessToken"]
    vet_headers = {"Authorization": f"Bearer {vet_token}"}
    print("[OK] Vet login successful (Role: veterinarian)")

    # 4. Login as Officer
    officer_login = client.post("/api/v1/auth/login", json={"email": "officer@bioshield.local", "password": "officer123"})
    assert officer_login.status_code == 200, f"Officer login failed: {officer_login.text}"
    officer_token = officer_login.json()["accessToken"]
    officer_headers = {"Authorization": f"Bearer {officer_token}"}
    print("[OK] Officer login successful (Role: officer)")

    # 5. Test Role RBAC: Farmer attempting to access Vet/Officer endpoints -> 403 Forbidden
    rbac_forbidden = [
        ("GET", "/api/v1/officer/stats", farmer_headers),
        ("GET", "/api/v1/corrective-actions/awaiting-verification", farmer_headers),
        ("GET", "/api/v1/officer/stats", vet_headers), # Vet accessing Officer stats
    ]

    for method, path, headers in rbac_forbidden:
        res = client.request(method, path, headers=headers)
        assert res.status_code == 403, f"Expected 403 for {path}, got {res.status_code}: {res.text}"
        print(f"[OK] Forbidden check passed: {method} {path} returned 403")

    # 6. Test Farm Data Isolation: Farmer requesting unauthorized farm
    farms_res = client.get("/api/v1/farms", headers=farmer_headers)
    assert farms_res.status_code == 200
    farmer_farms = farms_res.json()
    assert len(farmer_farms) == 1
    assert farmer_farms[0]["id"] == "FARM-JH-2026-0001"
    print(f"[OK] Farmer accessible farms strictly restricted to own farm ({farmer_farms[0]['id']})")

    # Try accessing unassigned farm FARM-JH-2026-0002 as Farmer -> 403 Forbidden
    unauth_farm_res = client.get("/api/v1/farms/FARM-JH-2026-0002", headers=farmer_headers)
    assert unauth_farm_res.status_code == 403, f"Expected 403 for unauthorized farm, got {unauth_farm_res.status_code}"
    print("[OK] Unauthorized farm access for Farmer blocked with 403 Forbidden")

    # 7. Test Officer stats and farm detail
    officer_stats_res = client.get("/api/v1/officer/stats", headers=officer_headers)
    assert officer_stats_res.status_code == 200
    print("[OK] Officer stats returned 200 OK")

    detail = client.get("/api/v1/officer/farms/FARM-JH-2026-0001/detail", headers=officer_headers)
    assert detail.status_code == 200, f"Officer detail failed: {detail.text}"
    print("[OK] Officer farm detail for FARM-JH-2026-0001 returned 200 OK")

    print("\nALL BACKEND SECURITY & RBAC TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
