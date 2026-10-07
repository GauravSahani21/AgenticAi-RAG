from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class TopicBase(BaseModel):
    module: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    difficulty: str = Field(default="MEDIUM", max_length=50)

class TopicCreate(TopicBase):
    subject_id: str

class TopicResponse(TopicBase):
    id: str
    subject_id: str

    model_config = ConfigDict(from_attributes=True)
