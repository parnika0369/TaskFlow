from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import User, Project, Task, TaskStatus, TaskPriority
from app.auth import hash_password


def seed_db():
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return  # already seeded

        # Create users
        alice = User(
            name="Alice",
            email="test@example.com",
            password_hash=hash_password("password123"),
        )
        bob = User(
            name="Bob",
            email="test2@example.com",
            password_hash=hash_password("password123"),
        )
        db.add_all([alice, bob])
        db.flush()

        # Create 10 filler projects with older timestamps so Website Redesign appears first
        base_time = datetime.utcnow() - timedelta(hours=12)
        for i in range(10):
            db.add(Project(
                name=f"Project {i + 1}",
                owner_id=alice.id,
                created_at=base_time - timedelta(minutes=(10 - i)),
            ))

        # Website Redesign — newest timestamp = first in DESC order
        website = Project(
            name="Website Redesign",
            description="Click me — has tasks, kanban board, filters, and drag-and-drop",
            owner_id=alice.id,
            created_at=datetime.utcnow(),
        )
        db.add(website)
        db.flush()

        tasks = [
            Task(title="Set up project structure", status=TaskStatus.done,
                 priority=TaskPriority.high, project_id=website.id,
                 creator_id=alice.id, assignee_id=alice.id),
            Task(title="Design landing page mockups", status=TaskStatus.done,
                 priority=TaskPriority.high, project_id=website.id,
                 creator_id=alice.id, assignee_id=bob.id),
            Task(title="Implement responsive navbar", status=TaskStatus.in_progress,
                 priority=TaskPriority.medium, project_id=website.id,
                 creator_id=alice.id, assignee_id=alice.id, due_date="2026-04-20"),
            Task(title="Build contact form", status=TaskStatus.in_progress,
                 priority=TaskPriority.medium, project_id=website.id,
                 creator_id=bob.id, assignee_id=bob.id, due_date="2026-04-22"),
            Task(title="Write homepage copy", status=TaskStatus.todo,
                 priority=TaskPriority.low, project_id=website.id,
                 creator_id=alice.id),
            Task(title="SEO optimisation", status=TaskStatus.todo,
                 priority=TaskPriority.low, project_id=website.id,
                 creator_id=bob.id),
            Task(title="Performance audit", status=TaskStatus.todo,
                 priority=TaskPriority.medium, project_id=website.id,
                 creator_id=alice.id, assignee_id=alice.id, due_date="2026-04-30"),
        ]
        db.add_all(tasks)
        db.commit()
        print("Database seeded.")
    except Exception as e:
        db.rollback()
        print(f"Seed skipped or failed: {e}")
    finally:
        db.close()
