from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class DocumentResponse(BaseModel):
    id: str
    subject_id: str
    topic_id: Optional[str] = None
    filename: str
    file_type: str
    file_size: Optional[int] = None
    chunk_count: int = 0
    uploaded_by: Optional[str] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)
