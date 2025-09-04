from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
import calendar

from db import get_db
from models import Guess, Round, MoodEnum, TenseEnum, PronounEnum, Verb

router = APIRouter(prefix="/metrics", tags=["metrics"])


def get_date_format_func(db: Session, date_column, format_str: str):
    """
    Get database-specific date formatting function.
    
    Args:
        db: Database session
        date_column: SQLAlchemy column to format
        format_str: Format string ('%Y-%m-%d' or '%Y-%m')
    
    Returns:
        SQLAlchemy function for date formatting
    """
    engine_name = db.bind.dialect.name
    
    if engine_name == 'postgresql':
        # PostgreSQL uses to_char() for date formatting
        if format_str == '%Y-%m-%d':
            return func.to_char(date_column, 'YYYY-MM-DD')
        elif format_str == '%Y-%m':
            return func.to_char(date_column, 'YYYY-MM')
        else:
            # Fallback for other formats
            return func.to_char(date_column, format_str.replace('%Y', 'YYYY').replace('%m', 'MM').replace('%d', 'DD'))
    else:
        # SQLite and other databases use strftime()
        return func.strftime(format_str, date_column)


class CoverageMetadata(BaseModel):
    total_questions: int
    unique_bins: int
    mood_filter: Optional[List[str]] = None
    date_range: Optional[Dict[str, str]] = None


class CoverageBin(BaseModel):
    pronoun: str
    tense: str
    mood: str
    question_count: int


class CoverageResponse(BaseModel):
    metadata: CoverageMetadata
    bins: List[CoverageBin]


class ActivityDataPoint(BaseModel):
    date: str
    value: int
    label: str


class ActivityResponse(BaseModel):
    metric: str
    period: str
    data: List[ActivityDataPoint]
    total: int
    average: float


@router.get("/coverage", response_model=CoverageResponse)
async def get_coverage_metrics(
    db: Session = Depends(get_db),
    mood: Optional[List[str]] = Query(None, description="Filter by specific mood(s)"),
    user_id: Optional[int] = Query(None, description="Filter by user (optional)"),
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    min_questions: int = Query(1, description="Only include bins with at least N questions")
):
    """
    Get question coverage metrics binned by pronoun/tense combinations.
    
    Returns the distribution of questions across different pronoun/tense/mood combinations,
    helping identify practice patterns and gaps in coverage.
    """
    
    # Start with base query  
    query = db.query(
        Guess.pronoun,
        Guess.tense, 
        Guess.mood,
        func.count(Guess.id).label('question_count')
    ).join(Verb, Guess.verb_id == Verb.id)
    
    # Apply filters
    if mood:
        try:
            mood_enums = [MoodEnum(m) for m in mood]
            query = query.filter(Guess.mood.in_(mood_enums))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid mood in list: {mood}")
    
    if user_id:
        query = query.filter(Guess.user_id == user_id)
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(Guess.created_at >= start_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(Guess.created_at <= end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")
    
    # Group by pronoun, tense, mood
    query = query.group_by(Guess.pronoun, Guess.tense, Guess.mood)
    
    # Apply minimum questions filter
    query = query.having(func.count(Guess.id) >= min_questions)
    
    # Order by question count descending
    query = query.order_by(func.count(Guess.id).desc())
    
    results = query.all()
    
    # Calculate metadata
    total_questions = sum(row.question_count for row in results)
    unique_bins = len(results)
    
    # Process bins
    bins = []
    for row in results:
        bins.append(CoverageBin(
            pronoun=row.pronoun.value,
            tense=row.tense.value,
            mood=row.mood.value,
            question_count=row.question_count
        ))
    
    # Build metadata
    metadata = CoverageMetadata(
        total_questions=total_questions,
        unique_bins=unique_bins,
        mood_filter=mood if mood else None
    )
    
    if start_date or end_date:
        metadata.date_range = {}
        if start_date:
            metadata.date_range["start_date"] = start_date
        if end_date:
            metadata.date_range["end_date"] = end_date
    
    return CoverageResponse(
        metadata=metadata,
        bins=bins
    )


@router.get("/activity", response_model=ActivityResponse)
async def get_practice_activity(
    db: Session = Depends(get_db),
    metric: str = Query("questions", description="Metric to track: 'questions' or 'rounds'"),
    period: str = Query("week", description="Time period: 'week' (days), 'month' (weeks), or 'year' (months)"),
    user_id: Optional[int] = Query(None, description="Filter by user (optional)")
):
    """
    Get practice activity over time, with complete time series including zero values.
    
    - metric='questions': Count answered questions by time period
    - metric='rounds': Count completed rounds by time period  
    - period='week': Last 7 days, binned by day
    - period='month': Last 4 weeks, binned by week
    - period='year': Last 12 months, binned by month
    """
    
    # Validate parameters
    if metric not in ["questions", "rounds"]:
        raise HTTPException(status_code=400, detail="metric must be 'questions' or 'rounds'")
    
    if period not in ["week", "month", "year"]:
        raise HTTPException(status_code=400, detail="period must be 'week', 'month', or 'year'")
    
    # Calculate date range and binning
    now = datetime.utcnow()
    
    if period == "week":
        # Last 7 days, binned by day
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=6)
        date_format = "%Y-%m-%d"
        trunc_format = "day"
        periods = []
        for i in range(7):
            day = start_date + timedelta(days=i)
            periods.append({
                'date': day.strftime(date_format),
                'label': day.strftime("%a"),  # Mon, Tue, etc
                'start': day,
                'end': day + timedelta(days=1)
            })
    
    elif period == "month":
        # Last 4 weeks, binned by week (Monday start)
        # Find the Monday of this week
        days_since_monday = now.weekday()
        this_monday = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_since_monday)
        start_date = this_monday - timedelta(weeks=3)
        
        periods = []
        for i in range(4):
            week_start = start_date + timedelta(weeks=i)
            week_end = week_start + timedelta(days=7)
            periods.append({
                'date': week_start.strftime("%Y-%m-%d"),
                'label': f"Week {i + 1}",
                'start': week_start,
                'end': week_end
            })
    
    else:  # year
        # Last 12 months, binned by month
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        periods = []
        for i in range(12):
            # Go back i months from current month
            if current_month_start.month > i:
                month_start = current_month_start.replace(month=current_month_start.month - i)
            else:
                year_offset = (i - current_month_start.month) // 12 + 1
                month_num = 12 - ((i - current_month_start.month) % 12)
                month_start = current_month_start.replace(year=current_month_start.year - year_offset, month=month_num)
            
            # Calculate month end
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)
            
            periods.insert(0, {  # Insert at beginning to maintain chronological order
                'date': month_start.strftime("%Y-%m-%d"),
                'label': month_start.strftime("%b"),  # Jan, Feb, etc
                'start': month_start,
                'end': month_end
            })
    
    # Query data based on metric type
    if metric == "questions":
        # Count answered questions (any guess record)
        # Use database-specific date formatting
        if period == "week":
            # For week view, group by day
            date_format = get_date_format_func(db, Guess.created_at, '%Y-%m-%d')
        else:  # month view, group by month
            date_format = get_date_format_func(db, Guess.created_at, '%Y-%m')
            
        query = db.query(
            date_format.label('period_date'),
            func.count(Guess.id).label('count')
        )
        
        if user_id:
            query = query.filter(Guess.user_id == user_id)
        
        # Filter by overall date range
        overall_start = periods[0]['start']
        overall_end = periods[-1]['end']
        query = query.filter(
            Guess.created_at >= overall_start,
            Guess.created_at < overall_end
        )
        
        query = query.group_by(date_format)
        
    else:  # rounds
        # Count completed rounds (rounds with ended_at set)
        # Use database-specific date formatting
        if period == "week":
            # For week view, group by day
            date_format = get_date_format_func(db, Round.ended_at, '%Y-%m-%d')
        else:  # month view, group by month
            date_format = get_date_format_func(db, Round.ended_at, '%Y-%m')
            
        query = db.query(
            date_format.label('period_date'),
            func.count(Round.id).label('count')
        )
        
        if user_id:
            query = query.filter(Round.user_id == user_id)
        
        # Filter by overall date range and only completed rounds
        overall_start = periods[0]['start']
        overall_end = periods[-1]['end']
        query = query.filter(
            Round.ended_at.isnot(None),
            Round.ended_at >= overall_start,
            Round.ended_at < overall_end
        )
        
        query = query.group_by(date_format)
    
    # Execute query
    results = query.all()
    
    # Convert results to lookup dictionary
    data_by_date = {}
    if period == "week":
        # For week (daily) data, the period_date is already in YYYY-MM-DD format
        for row in results:
            data_by_date[row.period_date] = row.count
    else:
        # For month data, the period_date is in YYYY-MM format
        for row in results:
            data_by_date[row.period_date] = row.count
    
    # Build complete time series with zeros
    data_points = []
    total_value = 0
    
    for p in periods:
        value = data_by_date.get(p['date'], 0)
        data_points.append(ActivityDataPoint(
            date=p['date'],
            value=value,
            label=p['label']
        ))
        total_value += value
    
    # Calculate average
    average = total_value / len(periods) if periods else 0
    
    return ActivityResponse(
        metric=metric,
        period=period,
        data=data_points,
        total=total_value,
        average=round(average, 1)
    )
