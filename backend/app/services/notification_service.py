from app.models import Notification


def notify(db, user_id: int, title: str, message: str = "", type: str = "info", link: str | None = None):
    db.add(Notification(user_id=user_id, title=title, message=message, type=type, link=link))
