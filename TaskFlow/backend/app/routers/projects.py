import math
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, exists
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Project, Task, TaskStatus
from app.auth import get_current_user
from app.schemas import CreateProjectRequest

router = APIRouter(prefix="/projects", tags=["projects"])


def task_to_dict(task: Task) -> dict:
    return {
        "id": str(task.id),
        "title": task.title,
        "description": task.description,
        "status": task.status.value,
        "priority": task.priority.value,
        "dueDate": task.due_date,
        "projectId": str(task.project_id),
        "assigneeId": str(task.assignee_id) if task.assignee_id else None,
        "creatorId": str(task.creator_id),
        "createdAt": task.created_at.isoformat(),
    }


def project_to_dict(project: Project, include_tasks: bool = False) -> dict:
    d = {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "ownerId": str(project.owner_id),
        "createdAt": project.created_at.isoformat(),
    }
    if include_tasks:
        d["tasks"] = [task_to_dict(t) for t in project.tasks]
    return d


@router.get("")
def list_projects(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Include projects where user is owner, task assignee, or task creator
    visible = exists().where(
        Task.project_id == Project.id,
        or_(Task.assignee_id == user.id, Task.creator_id == user.id),
    )
    query = (
        db.query(Project)
        .filter(or_(Project.owner_id == user.id, visible))
        .order_by(Project.created_at.desc())
    )
    total = query.count()
    projects = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "content": [project_to_dict(p) for p in projects],
        "page": page,
        "limit": limit,
        "total": total,
        "totalPages": max(math.ceil(total / limit), 1),
    }


@router.post("")
def create_project(
    body: CreateProjectRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = Project(name=body.name, description=body.description, owner_id=user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project_to_dict(project, include_tasks=True)


@router.get("/{project_id}")
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, detail={"error": "Project not found"})
    return project_to_dict(project, include_tasks=True)


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, detail={"error": "Project not found"})
    if project.owner_id != user.id:
        raise HTTPException(403, detail={"error": "Only the owner can delete this project"})
    db.delete(project)
    db.commit()


@router.get("/{project_id}/stats")
def get_stats(
    project_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, detail={"error": "Project not found"})

    by_status = {s.value: 0 for s in TaskStatus}
    for task in project.tasks:
        by_status[task.status.value] += 1

    return {"total": len(project.tasks), "byStatus": by_status}
