from django.db import migrations
from django.utils.text import slugify

# The starting skill list for pickers. Admins can add more in Django admin.
SKILLS = [
    "Python",
    "Django",
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "HTML/CSS",
    "SQL",
    "PostgreSQL",
    "Docker",
    "Git",
    "Java",
    "Mobile Development",
    "Machine Learning",
    "Data Analysis",
    "UI/UX Design",
    "Figma",
    "Testing",
    "DevOps",
    "Technical Writing",
    "Project Management",
]


def add_skills(apps, schema_editor):
    Skill = apps.get_model("profiles", "Skill")
    for name in SKILLS:
        Skill.objects.get_or_create(slug=slugify(name), defaults={"name": name})


def remove_skills(apps, schema_editor):
    Skill = apps.get_model("profiles", "Skill")
    Skill.objects.filter(slug__in=[slugify(name) for name in SKILLS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0002_skill_profile_skills"),
    ]

    operations = [
        migrations.RunPython(add_skills, remove_skills),
    ]
