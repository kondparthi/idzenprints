from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class TagOut(BaseModel):
    id: str
    name: str
    slug: str

    class Config:
        from_attributes = True
