from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from django.db.models import Q
from django.utils import timezone
from PIL import Image, ImageOps
from rest_framework.exceptions import APIException

from apps.matching.models import Application

from .models import Profile

AVATAR_MAX_BYTES = 2 * 1024 * 1024
# Pillow's format name -> the extension we store it under.
AVATAR_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
# Bigger than any phone photo; stops a tiny file that decodes to gigabytes.
AVATAR_MAX_PIXELS = 50_000_000
# Shown at 56px at most, so 512 covers 2x and 3x screens.
AVATAR_SIZE = 512


RESUME_MAX_BYTES = 5 * 1024 * 1024


class InvalidAvatar(APIException):
    status_code = 400
    default_detail = "Choose a JPEG, PNG or WebP image of 2 MB or less."
    default_code = "invalid_avatar"


class ResumeTooBig(APIException):
    status_code = 400
    default_detail = "That file is over 5 MB. Choose a smaller PDF."
    default_code = "resume_too_big"


class ResumeNotPdf(APIException):
    status_code = 400
    default_detail = "Only PDF files can be uploaded."
    default_code = "resume_not_pdf"


def retire(users, until):
    """Retire these users (or user ids) until a date, usually the term end (BR-08, F1-08).

    Takes a list so a team lock is one query however big the team is.
    A later date someone already has is kept.
    """
    Profile.objects.filter(user__in=users).filter(
        Q(retired_until__isnull=True) | Q(retired_until__lt=until)
    ).update(retired_until=until)


def is_retired(user, today=None):
    """On a team until retired_until, that last day included (BR-09, F1-08).

    Reads the profile fresh, so a caller holding the user's row lock sees a team lock
    that just committed.
    """
    today = today or timezone.localdate()
    return Profile.objects.filter(user=user, retired_until__gte=today).exists()


def _reencode_avatar(upload):
    """The upload redrawn at most 512px, as (file, ext), or None if it isn't an image we take.

    The type comes from the bytes, not the name. Redrawing drops EXIF, like a phone
    photo's location, and fails on a truncated or broken file.
    """
    try:
        with Image.open(upload) as image:
            kind = image.format
            if kind not in AVATAR_FORMATS or image.width * image.height > AVATAR_MAX_PIXELS:
                return None
            icc = image.info.get("icc_profile")
            image = ImageOps.exif_transpose(image)
            image.thumbnail((AVATAR_SIZE, AVATAR_SIZE))
            out = BytesIO()
            image.save(out, format=kind, quality=90, icc_profile=icc)
    # Pillow raises many error types on bad input; Django's ImageField catches them all too.
    except Exception:
        return None
    return ContentFile(out.getvalue()), AVATAR_FORMATS[kind]


def set_avatar(profile, upload):
    """Swap in a new avatar (F1-07). A bad file raises invalid_avatar and keeps the old one.

    The old file is deleted only after the new one is saved.
    """
    checked = _reencode_avatar(upload) if upload and upload.size <= AVATAR_MAX_BYTES else None
    if checked is None:
        raise InvalidAvatar()
    content, ext = checked
    old = profile.avatar.name
    profile.avatar.save(f"avatar.{ext}", content, save=False)
    # Only this column: a full save could undo a retire() or PATCH that landed meanwhile.
    profile.save(update_fields=["avatar", "updated_at"])
    if old:
        profile.avatar.storage.delete(old)


def remove_avatar(profile):
    old = profile.avatar.name
    if not old:
        return
    profile.avatar = ""
    profile.save(update_fields=["avatar", "updated_at"])
    profile.avatar.storage.delete(old)


RESUME_FIELDS = ["resume", "resume_name", "updated_at"]


def set_resume(profile, upload):
    """Swap in a new resume (F1-16): a PDF of 5 MB or less, checked from its first bytes.

    A bad file raises and saves nothing. The old file is deleted only after the new one is saved.
    """
    if upload is None:
        raise ResumeNotPdf()
    if upload.size > RESUME_MAX_BYTES:
        raise ResumeTooBig()
    if upload.read(5) != b"%PDF-":
        raise ResumeNotPdf()
    upload.seek(0)
    old = profile.resume.name
    profile.resume_name = Path(upload.name).name[:255]
    profile.resume.save("resume.pdf", upload, save=False)
    profile.save(update_fields=RESUME_FIELDS)  # only these, as for the avatar
    if old:
        profile.resume.storage.delete(old)


def remove_resume(profile):
    old = profile.resume.name
    if not old:
        return
    profile.resume, profile.resume_name = "", ""
    profile.save(update_fields=RESUME_FIELDS)
    profile.resume.storage.delete(old)


def can_read_resume(user, profile):
    """The person, and owners of projects they applied to, whatever became of it (DD-42)."""
    return (
        profile.user_id == user.id
        or Application.objects.filter(
            applicant_id=profile.user_id, role__project__owner=user
        ).exists()
    )
