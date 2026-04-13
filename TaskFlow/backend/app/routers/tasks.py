from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Project, Task, TaskStatus, TaskPriority
from app.auth import get_current_user
from app.schemas import CreateTaskRequest, UpdateTaskRequest

router = APIRouter(tags=["tasks"])


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


@router.post("/projects/{project_id}/tasks")
def create_task(
    project_id: UUID,
    body: CreateTaskRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not db.query(Project).filter(Project.id == project_id).first():
        raise HTTPException(404, detail={"error": "Project not found"})

    task = Task(
        title=body.title,
        description=body.description,
        priority=TaskPriority(body.priority),
        assignee_id=body.assigneeId,
        due_date=body.dueDate,
        project_id=project_id,
        creator_id=user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task_to_dict(task)


@router.patch("/tasks/{task_id}")
@router.put("/tasks/{task_id}")
def update_task(
    task_id: UUID,
    body: UpdateTaskRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, detail={"error": "Task not found"})

    if body.title is not None:
        task.title = body.title
    if body.description is not None:
        task.description = body.description
    if body.status is not None:
        task.status = TaskStatus(body.status)
    if body.priority is not None:
        task.priority = TaskPriority(body.priority)
    if body.dueDate is not None:
        task.due_date = body.dueDate
    if body.clearAssignee:
        task.assignee_id = None
    elif body.assigneeId is not None:
        task.assignee_id = body.assigneeId

    db.commit()
    db.refresh(task)
    return task_to_dict(task)


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, detail={"error": "Task not found"})
    db.delete(task)
    db.commit()
