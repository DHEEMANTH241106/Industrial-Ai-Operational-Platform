from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from app.db.models import User, Camera, Zone, Incident, SafetyProfile, Organization
    from app.core.security import get_password_hash
    Base.metadata.create_all(bind=engine)

    # Lightweight migration for SQLite (adds columns if missing from previous schema version)
    with engine.connect() as conn:
        for table, col, col_type in [
            ("users", "organization_id", "INTEGER"),
            ("cameras", "organization_id", "INTEGER"),
            ("cameras", "safety_profile_id", "INTEGER"),
            ("incidents", "organization_id", "INTEGER"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

    db = SessionLocal()
    try:

        # 1. Seed Organizations
        pharma_org = db.query(Organization).filter(Organization.slug == "pharma").first()
        if not pharma_org:
            pharma_org = Organization(
                name="BioHealth Pharma Labs",
                slug="pharma",
                industry_type="pharma"
            )
            db.add(pharma_org)
            db.commit()
            db.refresh(pharma_org)

        hardware_org = db.query(Organization).filter(Organization.slug == "hardware").first()
        if not hardware_org:
            hardware_org = Organization(
                name="Titan Hardware & Fabrication",
                slug="hardware",
                industry_type="hardware"
            )
            db.add(hardware_org)
            db.commit()
            db.refresh(hardware_org)

        # 2. Seed Safety Profiles
        pharma_profile = db.query(SafetyProfile).filter(SafetyProfile.name == "Pharma Cleanroom Grade B").first()
        if not pharma_profile:
            pharma_profile = SafetyProfile(
                organization_id=pharma_org.id,
                name="Pharma Cleanroom Grade B",
                description="Strict sanitary requirement: Face mask and sterile protective gloves mandatory for contamination control",
                required_ppe=["mask", "gloves"],
                severity_weights={"missing_mask": 40, "missing_gloves": 35},
                is_default=True
            )
            db.add(pharma_profile)
        else:
            pharma_profile.required_ppe = ["mask", "gloves"]
            pharma_profile.description = "Strict sanitary requirement: Face mask and sterile protective gloves mandatory for contamination control"
            pharma_profile.severity_weights = {"missing_mask": 40, "missing_gloves": 35}
            db.commit()

        hardware_profile = db.query(SafetyProfile).filter(SafetyProfile.name == "Hardware & Heavy Machinery").first()
        if not hardware_profile:
            hardware_profile = SafetyProfile(
                organization_id=hardware_org.id,
                name="Hardware & Heavy Machinery",
                description="Industrial requirement: Hardhat helmet and high-visibility safety vest mandatory",
                required_ppe=["helmet", "vest"],
                severity_weights={"missing_helmet": 40, "missing_vest": 30},
                is_default=True
            )
            db.add(hardware_profile)
        db.commit()

        # 3. Seed Users for each tenant
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                organization_id=hardware_org.id,
                username="admin",
                email="admin@hardware.com",
                password_hash=get_password_hash("admin123"),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
        elif admin_user.organization_id is None:
            admin_user.organization_id = hardware_org.id
            db.commit()

        pharma_user = db.query(User).filter(User.username == "pharma_officer").first()
        if not pharma_user:
            pharma_user = User(
                organization_id=pharma_org.id,
                username="pharma_officer",
                email="safety@pharmalabs.com",
                password_hash=get_password_hash("pharma123"),
                role="safety_officer",
                is_active=True
            )
            db.add(pharma_user)
            db.commit()

        # 4. Seed default cameras
        default_cam = db.query(Camera).filter(Camera.source_type == "webcam").first()
        if not default_cam:
            default_cam = Camera(
                organization_id=hardware_org.id,
                safety_profile_id=hardware_profile.id if hardware_profile else None,
                name="Built-in System Camera (Webcam 0)",
                source_type="webcam",
                source_uri="0",
                status="online",
                location="Local Workstation",
                configuration={"device_index": 0}
            )
            db.add(default_cam)
            db.commit()
        elif default_cam.organization_id is None:
            default_cam.organization_id = hardware_org.id
            default_cam.safety_profile_id = hardware_profile.id if hardware_profile else None
            db.commit()

        pharma_cam = db.query(Camera).filter(Camera.organization_id == pharma_org.id).first()
        if not pharma_cam:
            pharma_cam = Camera(
                organization_id=pharma_org.id,
                safety_profile_id=pharma_profile.id if pharma_profile else None,
                name="Pharma Cleanroom Unit A (Webcam)",
                source_type="webcam",
                source_uri="0",
                status="online",
                location="Sanitary Grade B Cleanroom",
                configuration={"device_index": 0}
            )
            db.add(pharma_cam)
            db.commit()
    finally:
        db.close()
