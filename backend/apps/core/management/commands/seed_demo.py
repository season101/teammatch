import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q

from apps.matching.models import Application, ApplicationStatus
from apps.matching.services import holds_seat
from apps.profiles.models import Profile, Skill
from apps.profiles.services import is_retired
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus
from apps.projects.services import get_active_term

# Sample people use example.com (reserved, no real inbox) and can't sign in.
OWNERS = {
    "dana.demo@example.com": ("Dana Demo", "Industrial Engineering"),
    "marco.demo@example.com": ("Marco Demo", "Computer Science"),
    "priya.demo@example.com": ("Priya Demo", "Mechanical Engineering"),
    "theo.demo@example.com": ("Theo Demo", "Kinesiology"),
    "nia.demo@example.com": ("Nia Demo", "Computer Information Systems"),
}

# name, major, bio, skills. The first five hold a seat, the rest apply to the owner's project.
STUDENTS = {
    "aiko.demo@example.com": (
        "Aiko Demo",
        "Graphic Design",
        "Designs posters for campus clubs and wants to try product design.",
        ["UI/UX Design", "Figma", "HTML/CSS"],
    ),
    "bruno.demo@example.com": (
        "Bruno Demo",
        "Computer Science",
        "Backend person. Built a Discord bot the whole dorm uses.",
        ["Python", "Django", "PostgreSQL", "SQL", "Git"],
    ),
    "carmen.demo@example.com": (
        "Carmen Demo",
        "Computer Science",
        "Likes maps and anything that runs on a phone.",
        ["Mobile Development", "JavaScript", "React", "Git"],
    ),
    "deven.demo@example.com": (
        "Deven Demo",
        "Industrial Engineering",
        "Keeps group projects on schedule and writes the report nobody wants to write.",
        ["Project Management", "Technical Writing", "Data Analysis"],
    ),
    "elif.demo@example.com": (
        "Elif Demo",
        "Cyber Engineering",
        "Runs a home lab and breaks things on purpose to see how they fail.",
        ["Docker", "DevOps", "Python", "Testing"],
    ),
    "farah.demo@example.com": (
        "Farah Demo",
        "Computer Science",
        "Full-stack hobbyist with two hackathon apps shipped.",
        ["React", "TypeScript", "Next.js", "Node.js", "PostgreSQL", "Git"],
    ),
    "gus.demo@example.com": (
        "Gus Demo",
        "Mathematics",
        "Statistics minor. Happiest with a messy spreadsheet and a question.",
        ["Python", "Data Analysis", "Machine Learning", "SQL"],
    ),
    "hana.demo@example.com": (
        "Hana Demo",
        "Computer Information Systems",
        "New to web development, quick with Figma and front-end basics.",
        ["Figma", "UI/UX Design", "HTML/CSS", "JavaScript"],
    ),
    "ivan.demo@example.com": (
        "Ivan Demo",
        "Electrical Engineering",
        "Mostly embedded work, learning web on the side.",
        ["Java", "Testing", "Git"],
    ),
}

# owner, title, pitch, roles as (title, description, skills, who fills it or None)
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
                None,
            ),
            (
                "UI designer",
                "Design the onboarding and calendar screens.",
                ["UI/UX Design", "Figma"],
                "aiko.demo@example.com",
            ),
            (
                "Frontend developer",
                "Build the group pages and the shared calendar.",
                ["React", "TypeScript", "HTML/CSS"],
                None,
            ),
        ],
    ),
    (
        "marco.demo@example.com",
        "Thesis Tracker",
        "Graduate students track thesis milestones, share drafts with their advisor and get "
        "reminders before committee deadlines.",
        [
            (
                "Backend developer",
                "Build the milestones and reminders API.",
                ["Python", "SQL"],
                None,
            ),
            (
                "DevOps engineer",
                "Containerize the app and set up deploys.",
                ["Docker", "DevOps", "Git"],
                None,
            ),
            (
                "Frontend developer",
                "Build the timeline and the draft review pages.",
                ["React", "JavaScript", "Testing"],
                None,
            ),
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
                None,
            ),
            (
                "Backend developer",
                "Store trucks, hours and ratings.",
                ["Django", "PostgreSQL"],
                "bruno.demo@example.com",
            ),
            (
                "UI designer",
                "Design a map students can read at a glance.",
                ["UI/UX Design", "Figma"],
                None,
            ),
            (
                "Project manager",
                "Line up the truck owners and keep the launch on track.",
                ["Project Management", "Technical Writing"],
                "deven.demo@example.com",
            ),
        ],
    ),
    (
        "priya.demo@example.com",
        "Lab Equipment Checkout",
        "Engineering students reserve lab equipment online instead of on the paper sheet by "
        "the door.",
        [
            (
                "Full-stack developer",
                "Build reservations end to end.",
                ["React", "Django"],
                None,
            ),
            (
                "QA tester",
                "Write tests for double bookings and returns.",
                ["Testing", "Python"],
                None,
            ),
            (
                "Database developer",
                "Model the equipment, bookings and late returns.",
                ["SQL", "PostgreSQL", "Git", "Python"],
                None,
            ),
        ],
    ),
    (
        "theo.demo@example.com",
        "Ruston Rec League",
        "Schedule intramural games, track scores and message teams when a game moves.",
        [
            (
                "Frontend developer",
                "Build the schedule and score pages.",
                ["React", "TypeScript"],
                None,
            ),
            (
                "Project manager",
                "Run the backlog and write the docs.",
                ["Project Management", "Technical Writing"],
                None,
            ),
            (
                "Mobile developer",
                "Send the game-moved alerts and build the phone view.",
                ["Mobile Development", "JavaScript", "React"],
                "carmen.demo@example.com",
            ),
            (
                "Backend developer",
                "Build the fixtures, scores and standings API.",
                ["Node.js", "PostgreSQL", "TypeScript"],
                None,
            ),
            (
                "Data analyst",
                "Work out standings and fair schedules.",
                ["Data Analysis", "Python", "SQL"],
                None,
            ),
        ],
    ),
    (
        "nia.demo@example.com",
        "Campus Lost and Found",
        "Post what you found or lost on campus and get matched by place, date and photo.",
        [
            (
                "Web developer",
                "Build the post and search pages.",
                ["Next.js", "TypeScript", "PostgreSQL"],
                None,
            ),
            (
                "Machine learning engineer",
                "Match photos of found items to lost reports.",
                ["Machine Learning", "Python"],
                None,
            ),
            (
                "UI designer",
                "Make posting an item take under a minute.",
                ["UI/UX Design", "Figma", "HTML/CSS"],
                None,
            ),
        ],
    ),
]

# The seed owner's own project, so their review queue has people waiting.
OWNER_PROJECT = (
    "Campus Ride Board",
    "Students post rides home for breaks and weekends, split gas and see who is going "
    "the same way.",
    [
        (
            "Frontend developer",
            "Build the ride list and the post-a-ride form.",
            ["React", "TypeScript", "HTML/CSS"],
            None,
        ),
        (
            "Backend developer",
            "Build the rides, seats and requests API.",
            ["Python", "Django", "PostgreSQL"],
            None,
        ),
        (
            "UI designer",
            "Design a ride card that is clear on a phone.",
            ["UI/UX Design", "Figma"],
            None,
        ),
        (
            "DevOps engineer",
            "Set up deploys and keep the demo running.",
            ["Docker", "DevOps"],
            "elif.demo@example.com",
        ),
    ],
)

# applicant, role on the owner's project, note
OWNER_APPLICANTS = [
    ("farah.demo@example.com", "Frontend developer", "I built a ride-share clone last spring."),
    ("hana.demo@example.com", "Frontend developer", "Still learning React, but I'm quick."),
    ("ivan.demo@example.com", "Frontend developer", ""),
    ("gus.demo@example.com", "Backend developer", "Strong in Python and SQL, new to Django."),
    ("farah.demo@example.com", "Backend developer", "Happy to take the API if you need it."),
    ("hana.demo@example.com", "UI designer", "I can share my Figma portfolio."),
]

OWNER_PROFILE = {
    "display_name": "Olive Owner",
    "major": "Computer Science",
    "bio": "Senior with a project idea and a free evening or two a week.",
    "skills": ["Python", "Django", "Project Management"],
}

CANDIDATE_PROFILE = {
    "display_name": "Sam Student",
    "major": "Computer Science",
    "bio": "Junior who likes building front ends. Looking for a team for CSC 5323.",
    "skills": ["React", "TypeScript", "JavaScript", "HTML/CSS", "Git"],
}


# The candidate's applications: sample project, role, status, note. liked is an offer.
CANDIDATE_APPLICATIONS = [
    ("Bulldog Bites", "Mobile developer", ApplicationStatus.PENDING, "I know the JS side well."),
    ("Lab Equipment Checkout", "Full-stack developer", ApplicationStatus.PENDING, ""),
    (
        "Ruston Rec League",
        "Frontend developer",
        ApplicationStatus.LIKED,
        "React and TypeScript are what I do best.",
    ),
]


class Command(BaseCommand):
    help = "Add sample people, projects and applications for demos. --remove takes them out."

    def add_arguments(self, parser):
        parser.add_argument("--remove", action="store_true", help="Delete the sample data.")
        parser.add_argument(
            "--candidate",
            default=os.environ.get("SEED_CANDIDATE_EMAIL", ""),
            help="Account that gets sample skills, applications and an offer "
            "(default: SEED_CANDIDATE_EMAIL).",
        )
        parser.add_argument(
            "--owner",
            default=os.environ.get("SEED_OWNER_EMAIL", ""),
            help="Account that gets a sample project with applicants waiting "
            "(default: SEED_OWNER_EMAIL).",
        )

    @transaction.atomic
    def handle(self, *args, remove=False, candidate="", owner="", **options):
        User = get_user_model()
        owner = owner.strip() and User.objects.filter(email__iexact=owner.strip()).first()
        candidate = (
            candidate.strip() and User.objects.filter(email__iexact=candidate.strip()).first()
        )
        sample_people = [*OWNERS, *STUDENTS]
        if remove:
            # Projects first: owners and seated members are protected from deletion.
            # The owner's sample project is theirs if --owner is known, else the one a sample
            # student holds a seat on.
            owner_project = Q(roles__filled_by__email__in=sample_people)
            if owner:
                owner_project |= Q(owner=owner)
            projects, _ = Project.objects.filter(
                Q(owner__email__in=sample_people) | Q(title=OWNER_PROJECT[0]) & owner_project
            ).delete()
            users, _ = User.objects.filter(email__in=sample_people).delete()
            self.stdout.write(f"removed sample data ({projects} project rows, {users} user rows)")
            return

        term = get_active_term()
        if term is None:
            raise CommandError("No current term. Run `manage.py bootstrap` or add one in admin.")

        for email, (name, major) in OWNERS.items():
            self._add_person(User, email, name, major)
        for email, person in STUDENTS.items():
            self._add_person(User, email, *person)

        added = 0
        for email, title, pitch, roles in PROJECTS:
            sample_owner = User.objects.get(email=email)
            added += self._add_project(User, sample_owner, term, title, pitch, roles) is not None
        self.stdout.write(f"sample projects: {added} added, {len(PROJECTS) - added} already there")

        if owner:
            self._fill_profile(owner, OWNER_PROFILE, "owner")
            self._add_owner_project(User, owner, term)
        if candidate:
            self._fill_profile(candidate, CANDIDATE_PROFILE, "candidate")
            self._add_candidate_applications(candidate)

    def _add_person(self, User, email, name, major, bio="", skills=()):
        if User.objects.filter(email=email).exists():
            return
        user = User.objects.create_user(email)  # no password: can't sign in
        Profile.objects.filter(user=user).update(display_name=name, major=major, bio=bio)
        user.profile.skills.set(Skill.objects.filter(name__in=skills))

    def _add_project(self, User, owner, term, title, pitch, roles):
        """The new project with its roles, or None if the owner already has one by that title."""
        project, created = Project.objects.get_or_create(
            owner=owner,
            title=title,
            defaults={"term": term, "pitch": pitch, "status": ProjectStatus.OPEN},
        )
        if not created:
            return None
        for role_title, description, skills, filled_by in roles:
            role = Role(project=project, title=role_title, description=description)
            if filled_by:
                role.status, role.filled_by = RoleStatus.FILLED, User.objects.get(email=filled_by)
            role.save()
            role.required_skills.set(Skill.objects.filter(name__in=skills))
            if filled_by:
                # what a real commit leaves behind (F4-10)
                Application.objects.create(
                    role=role, applicant=role.filled_by, status=ApplicationStatus.COMMITTED
                )
        return project

    def _add_owner_project(self, User, owner, term):
        """Give the seed owner an open project with applicants waiting in the review queue."""
        title, pitch, roles = OWNER_PROJECT
        # One open project per owner per term, and none while they hold a seat.
        busy = (
            Project.objects.filter(owner=owner, term=term, status=ProjectStatus.OPEN)
            .exclude(title=title)
            .exists()
        )
        if busy or is_retired(owner) or holds_seat(owner, term_id=term.id):
            self.stdout.write(f"owner project for {owner.email}: skipped, they're busy this term")
            return
        project = self._add_project(User, owner, term, title, pitch, roles)
        if project is None:
            self.stdout.write(f"owner project for {owner.email}: already there")
            return
        for email, role_title, note in OWNER_APPLICANTS:
            Application.objects.create(
                role=project.roles.get(title=role_title),
                applicant=User.objects.get(email=email),
                note=note,
            )
        self.stdout.write(
            f"owner project for {owner.email}: added, {len(OWNER_APPLICANTS)} applications waiting"
        )

    def _add_candidate_applications(self, candidate):
        """Two pending applications and an offer, so My applications and the badge have data."""
        if is_retired(candidate) or holds_seat(candidate):
            self.stdout.write(f"candidate applications {candidate.email}: skipped, on a team")
            return
        added = 0
        for project_title, role_title, status, note in CANDIDATE_APPLICATIONS:
            role = Role.objects.filter(
                project__owner__email__in=OWNERS,
                project__title=project_title,
                project__status=ProjectStatus.OPEN,
                title=role_title,
                status=RoleStatus.OPEN,
            ).first()
            if role is None:
                continue
            _, created = Application.objects.get_or_create(
                role=role, applicant=candidate, defaults={"status": status, "note": note}
            )
            added += created
        self.stdout.write(f"candidate applications {candidate.email}: {added} added")

    def _fill_profile(self, user, sample, label):
        """Give a seed account a name and skills for cards and match %; never overwrite edits."""
        profile, _ = Profile.objects.get_or_create(user=user)
        if profile.display_name:
            self.stdout.write(f"{label} profile {user.email}: already filled, left alone")
            return
        profile.display_name = sample["display_name"]
        profile.major = sample["major"]
        profile.bio = sample["bio"]
        profile.save()
        profile.skills.set(Skill.objects.filter(name__in=sample["skills"]))
        self.stdout.write(f"{label} profile {user.email}: filled with sample skills")
