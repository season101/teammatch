import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.profiles.models import Profile, Skill
from apps.projects.models import Project, ProjectStatus, Role
from apps.projects.services import get_active_term

# Sample owners use example.com (reserved, no real inbox) and can't sign in.
OWNERS = {
    "dana.demo@example.com": ("Dana Demo", "Industrial Engineering"),
    "marco.demo@example.com": ("Marco Demo", "Computer Science"),
    "priya.demo@example.com": ("Priya Demo", "Mechanical Engineering"),
    "theo.demo@example.com": ("Theo Demo", "Kinesiology"),
}

# owner, title, pitch, roles as (title, description, skills)
PROJECTS = [
    (
        "dana.demo@example.com",
        "Study Buddy Finder",
        "Match classmates into study groups by course and schedule, with a shared calendar "
        "for each group.",
        [
            (
                "Data analyst",
                "Turn survey answers into group suggestions.",
                ["Python", "Data Analysis"],
            ),
            (
                "UI designer",
                "Design the onboarding and calendar screens.",
                ["UI/UX Design", "Figma"],
            ),
        ],
    ),
    (
        "marco.demo@example.com",
        "Thesis Tracker",
        "Graduate students track thesis milestones, share drafts with their advisor and get "
        "reminders before committee deadlines.",
        [
            ("Backend developer", "Build the milestones and reminders API.", ["Python", "SQL"]),
            ("DevOps engineer", "Containerize the app and set up deploys.", ["Docker", "DevOps"]),
        ],
    ),
    (
        "marco.demo@example.com",
        "Bulldog Bites",
        "A live map of food trucks and dining hall hours around campus, with ratings from "
        "students.",
        [
            (
                "Mobile developer",
                "Build the map and truck pages.",
                ["Mobile Development", "JavaScript"],
            ),
            ("Backend developer", "Store trucks, hours and ratings.", ["Django", "PostgreSQL"]),
            (
                "UI designer",
                "Design a map students can read at a glance.",
                ["UI/UX Design", "Figma"],
            ),
        ],
    ),
    (
        "priya.demo@example.com",
        "Lab Equipment Checkout",
        "Engineering students reserve lab equipment online instead of on the paper sheet by "
        "the door.",
        [
            ("Full-stack developer", "Build reservations end to end.", ["React", "Django"]),
            ("QA tester", "Write tests for double bookings and returns.", ["Testing", "Python"]),
        ],
    ),
    (
        "theo.demo@example.com",
        "Ruston Rec League",
        "Schedule intramural games, track scores and message teams when a game moves.",
        [
            ("Frontend developer", "Build the schedule and score pages.", ["React", "TypeScript"]),
            (
                "Project manager",
                "Run the backlog and write the docs.",
                ["Project Management", "Technical Writing"],
            ),
        ],
    ),
]

CANDIDATE_PROFILE = {
    "display_name": "Sam Student",
    "major": "Computer Science",
    "bio": "Junior who likes building front ends. Looking for a team for CSC 5323.",
    "skills": ["React", "TypeScript", "JavaScript", "HTML/CSS", "Git"],
}


class Command(BaseCommand):
    help = "Add sample projects and roles for demos. Safe to run again; --remove takes them out."

    def add_arguments(self, parser):
        parser.add_argument("--remove", action="store_true", help="Delete the sample data.")
        parser.add_argument(
            "--candidate",
            default=os.environ.get("SEED_CANDIDATE_EMAIL", ""),
            help="Account whose empty profile gets sample skills (default: SEED_CANDIDATE_EMAIL).",
        )

    @transaction.atomic
    def handle(self, *args, remove=False, candidate="", **options):
        User = get_user_model()
        if remove:
            projects, _ = Project.objects.filter(owner__email__in=OWNERS).delete()
            users, _ = User.objects.filter(email__in=OWNERS).delete()
            self.stdout.write(f"removed sample data ({projects} project rows, {users} user rows)")
            return

        term = get_active_term()
        if term is None:
            raise CommandError("No current term. Run `manage.py bootstrap` or add one in admin.")

        for email, (name, major) in OWNERS.items():
            owner = User.objects.filter(email=email).first()
            if owner is None:
                owner = User.objects.create_user(email)  # no password: can't sign in
                Profile.objects.filter(user=owner).update(display_name=name, major=major)

        added = 0
        for email, title, pitch, roles in PROJECTS:
            owner = User.objects.get(email=email)
            project, created = Project.objects.get_or_create(
                owner=owner,
                title=title,
                defaults={"term": term, "pitch": pitch, "status": ProjectStatus.OPEN},
            )
            if not created:
                continue
            added += 1
            for role_title, description, skills in roles:
                role = Role.objects.create(
                    project=project, title=role_title, description=description
                )
                role.required_skills.set(Skill.objects.filter(name__in=skills))
        self.stdout.write(f"sample projects: {added} added, {len(PROJECTS) - added} already there")

        self._fill_candidate_profile(User, candidate.strip())

    def _fill_candidate_profile(self, User, email):
        """Give the demo candidate skills so the feed can mark matches; never overwrite edits."""
        user = email and User.objects.filter(email__iexact=email).first()
        if not user:
            return
        profile, _ = Profile.objects.get_or_create(user=user)
        if profile.display_name:
            self.stdout.write(f"candidate profile {user.email}: already filled, left alone")
            return
        profile.display_name = CANDIDATE_PROFILE["display_name"]
        profile.major = CANDIDATE_PROFILE["major"]
        profile.bio = CANDIDATE_PROFILE["bio"]
        profile.save()
        profile.skills.set(Skill.objects.filter(name__in=CANDIDATE_PROFILE["skills"]))
        self.stdout.write(f"candidate profile {user.email}: filled with sample skills")
