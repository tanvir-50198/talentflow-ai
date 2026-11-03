from app.models import CV


def find_duplicate(db, file_hash: str, job_id: int, uploaded_by: int, exclude_id: int | None = None):
    """Same file hash already uploaded by this recruiter for this job. Only flags; never rejects a candidate."""
    q = db.query(CV).filter(CV.file_hash == file_hash, CV.job_id == job_id, CV.uploaded_by == uploaded_by,
                            CV.duplicate_of_id.is_(None))
    if exclude_id:
        q = q.filter(CV.id != exclude_id)
    return q.order_by(CV.id).first()
