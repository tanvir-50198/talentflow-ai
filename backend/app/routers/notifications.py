from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.permissions import get_current_user
from app.database.connection import get_db
from app.models import Notification, User
from app.utils.serializers import iso

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Notification).filter_by(user_id=user.id).order_by(Notification.created_at.desc(), Notification.id.desc()).limit(100).all()
    return {"unread": sum(1 for n in rows if not n.is_read),
            "items": [{"id": n.id, "type": n.type, "title": n.title, "message": n.message, "link": n.link,
                       "is_read": n.is_read, "created_at": iso(n.created_at)} for n in rows]}


@router.post("/read-all")
def read_all(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter_by(user_id=user.id, is_read=False).update({"is_read": True})
    db.commit()
    return {"ok": True}


@router.patch("/{notification_id}/read")
def read_one(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    return {"ok": True}
