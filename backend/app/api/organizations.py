from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Organization, SafetyProfile, User
from app.core.security import get_current_user
from app.api.schemas import OrganizationResponse, SafetyProfileResponse, SafetyProfileCreate

router = APIRouter(prefix="/organizations", tags=["organizations"])

@router.get("/", response_model=list[OrganizationResponse])
def list_organizations(db: Session = Depends(get_db)):
    """List all registered tenant organizations."""
    return db.query(Organization).all()

@router.get("/current", response_model=OrganizationResponse)
def get_current_organization(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get the organization for the currently authenticated user."""
    if not current_user.organization_id:
        raise HTTPException(status_code=404, detail="User is not assigned to an organization")
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

@router.get("/safety-profiles", response_model=list[SafetyProfileResponse])
def list_safety_profiles(
    organization_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List safety profiles. Defaults to current user's organization."""
    target_org_id = organization_id or current_user.organization_id
    query = db.query(SafetyProfile)
    if target_org_id and current_user.role != "superadmin":
        query = query.filter(SafetyProfile.organization_id == target_org_id)
    return query.all()

@router.post("/safety-profiles", response_model=SafetyProfileResponse)
def create_safety_profile(
    profile_in: SafetyProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new safety profile for the user's organization."""
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization to create profiles")
    
    # If set to default, unset other defaults for this organization
    if profile_in.is_default:
        db.query(SafetyProfile).filter(
            SafetyProfile.organization_id == current_user.organization_id,
            SafetyProfile.is_default == True
        ).update({"is_default": False})

    profile = SafetyProfile(
        organization_id=current_user.organization_id,
        name=profile_in.name,
        description=profile_in.description,
        required_ppe=profile_in.required_ppe,
        severity_weights=profile_in.severity_weights,
        is_default=profile_in.is_default
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile
