"""
SQLAlchemy ORM models for AegnyxZero.
Schema defined per PRD Section 11.2.
"""

from sqlalchemy import Column, Text, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base


class Source(Base):
    """
    A bibliographic source (paper, dataset, or report).
    PRD Section 11.2 — `sources` table.
    """

    __tablename__ = "sources"

    id = Column(Text, primary_key=True)            # e.g. "src_001"
    title = Column(Text, nullable=True)
    authors = Column(Text, nullable=True)
    year = Column(Integer, nullable=True)
    doi = Column(Text, nullable=True)
    url = Column(Text, nullable=True)
    type = Column(Text, nullable=True)              # paper / dataset / report
    license = Column(Text, nullable=True)           # as verified
    local_path = Column(Text, nullable=True)        # in data/raw/ (git-ignored if large)

    # Relationship
    experiments = relationship("Experiment", back_populates="source")


class Experiment(Base):
    """
    A single combustion experiment data row.
    PRD Section 11.2 — `experiments` table (the core table).
    """

    __tablename__ = "experiments"

    id = Column(Text, primary_key=True)                         # e.g. "exp_0001"
    material_name = Column(Text, nullable=True)                 # as in source
    material_class = Column(Text, nullable=True)                # normalized enum (polymer, cellulose, fabric, other)
    geometry = Column(Text, nullable=True)                      # thin sheet, cylinder, droplet, gas jet, etc.
    thickness_mm = Column(Float, nullable=True)                 # REAL NULL
    oxidizer = Column(Text, nullable=True, default="O2/N2")    # default "O2/N2"
    o2_percent = Column(Float, nullable=True)                   # volume %, REAL NULL
    pressure_kpa = Column(Float, nullable=True)                 # REAL NULL
    flow_velocity_cm_s = Column(Float, nullable=True)           # 0 if quiescent, REAL NULL
    gravity_level = Column(Text, nullable=True)                 # microgravity / partial_g / normal_g
    gravity_g = Column(Float, nullable=True)                    # numeric if given, REAL NULL
    facility = Column(Text, nullable=True)                      # drop tower / ISS / parabolic flight / sounding rocket / ground
    ignition_method = Column(Text, nullable=True)               # TEXT NULL
    outcome = Column(Text, nullable=True)                       # enum: sustained_spread, marginal, extinguished, no_ignition, unknown
    spread_rate_mm_s = Column(Float, nullable=True)             # REAL NULL
    notes = Column(Text, nullable=True)                         # short, TEXT NULL
    source_id = Column(Text, ForeignKey("sources.id"), nullable=True)  # FK to sources
    source_page = Column(Text, nullable=True)                   # page/table/figure reference
    evidence_span = Column(Text, nullable=True)                 # short excerpt (≤ 200 chars) for auditing
    extraction_method = Column(Text, nullable=True)             # "manual" / "llm"
    extraction_confidence = Column(Float, nullable=True)        # 0–1
    verified = Column(Integer, nullable=True, default=0)        # 0/1
    verified_by = Column(Text, nullable=True)
    verified_at = Column(Text, nullable=True)

    # Relationship
    source = relationship("Source", back_populates="experiments")


class Feedback(Base):
    """
    Expert review approvals and flags (PRD Section 11.2 & US-8).
    """

    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    target_type = Column(Text, nullable=False)   # "experiment" or "answer"
    target_id = Column(Text, nullable=False)     # e.g. "exp_0001" or answer_id
    action = Column(Text, nullable=False)        # "approve" or "flag"
    note = Column(Text, nullable=True)           # max 500 chars
    created_at = Column(Text, nullable=False)

