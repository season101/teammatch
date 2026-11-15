from datetime import timedelta

import pytest
from django.core.files.storage import storages
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from apps.accounts.models import User
from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus
from apps.profiles.models import Profile
from apps.profiles.services import remove_resume, set_resume
from apps.projects.models import Project, ProjectStatus, Role

pytestmark = pytest.mark.django_db

MY_URL = "/api/v1/me/profile/resume/"
PDF = b"%PDF-1.7\n% a tiny resume\n%%EOF\n"


def pdf(name="sam-resume.pdf", data=PDF):
    return SimpleUploadedFile(name, data, content_type="application/pdf")


def make_user(email):
    return User.objects.create_user(email, "a-long-password")


def upload(client, file):
    # PUT has no form encoding in Django's test client, so build the multipart body here.
    from django.test.client import BOUNDARY, MULTIPART_CONTENT, encode_multipart

    return client.put(MY_URL, encode_multipart(BOUNDARY, {"resume": file}), MULTIPART_CONTENT)


def resume_url(user):
    return f"/api/v1/profiles/{user.profile.id}/resume/"


@pytest.fixture
def sam(client):
    user = make_user("sam@latech.edu")
    client.force_login(user)
    return user


@pytest.fixture
def owner():
    return make_user("olive@latech.edu")


def project_role(owner):
    today = timezone.localdate()
    term, _ = Term.objects.get_or_create(
        name="Now",
        defaults={"start_date": today - timedelta(days=9), "end_date": today + timedelta(days=60)},
    )
    project = Project.objects.create(
        owner=owner, term=term, title="Campus Eats", pitch="Food", status=ProjectStatus.OPEN
    )
    return Role.objects.create(project=project, title="Backend")


def stored():
    return storages["resumes"]


def test_upload_a_resume(client, sam):
    response = upload(client, pdf())

    assert response.status_code == 200
    body = response.json()
    assert body["has_resume"] is True
    assert body["resume_name"] == "sam-resume.pdf"
    profile = Profile.objects.get(user=sam)
    assert profile.resume.name.startswith(f"resumes/{sam.id}/")
    # The private storage, not the default one.
    assert stored().exists(profile.resume.name)
    assert profile.resume.storage is stored()


@pytest.mark.parametrize(
    "file",
    [
        pdf("fake.pdf", b"<html>not a pdf</html>"),
        pdf("cv.pdf", b"%PDX-1.7"),
        pdf("empty.pdf", b""),
    ],
    ids=["html-named-pdf", "near-miss", "empty"],
)
def test_not_a_pdf_saves_nothing(client, sam, file):
    upload(client, pdf("first.pdf"))
    before = Profile.objects.get(user=sam).resume.name

    response = upload(client, file)

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Only PDF files can be uploaded.",
        "code": "resume_not_pdf",
    }
    profile = Profile.objects.get(user=sam)
    assert (profile.resume.name, profile.resume_name) == (before, "first.pdf")


def test_over_5_mb_saves_nothing(client, sam):
    response = upload(client, pdf(data=PDF + b"\0" * (5 * 1024 * 1024)))

    assert response.status_code == 400
    assert response.json()["code"] == "resume_too_big"
    assert not Profile.objects.get(user=sam).resume


def test_a_pdf_of_exactly_5_mb_is_fine(client, sam):
    data = PDF + b"\0" * (5 * 1024 * 1024 - len(PDF))
    assert upload(client, pdf(data=data)).status_code == 200


def test_missing_file_is_refused(client, sam):
    response = client.put(MY_URL)
    assert response.status_code in (400, 415)
    assert not Profile.objects.get(user=sam).resume


def test_replacing_deletes_the_old_file(client, sam):
    upload(client, pdf("old.pdf"))
    old = Profile.objects.get(user=sam).resume.name

    upload(client, pdf("new.pdf"))

    profile = Profile.objects.get(user=sam)
    assert profile.resume.name != old and profile.resume_name == "new.pdf"
    assert not stored().exists(old)


def test_remove_deletes_the_file(client, sam):
    upload(client, pdf())
    old = Profile.objects.get(user=sam).resume.name

    response = client.delete(MY_URL)

    assert response.status_code == 200
    assert (response.json()["has_resume"], response.json()["resume_name"]) == (False, "")
    assert not stored().exists(old)
    assert client.get(resume_url(sam)).status_code == 404


def test_i_can_read_my_own_resume(client, sam):
    upload(client, pdf())

    response = client.get(resume_url(sam))

    assert response.status_code == 200
    assert b"".join(response.streaming_content) == PDF
    assert response["Content-Type"] == "application/pdf"
    assert response["Content-Disposition"] == 'inline; filename="sam-resume.pdf"'
    assert response["Cache-Control"] == "private, no-store"
    assert response["X-Content-Type-Options"] == "nosniff"


@pytest.mark.parametrize("value", ["1", "true"])
def test_download_sends_an_attachment(client, sam, value):
    upload(client, pdf())
    response = client.get(resume_url(sam) + f"?download={value}")
    assert response["Content-Disposition"] == 'attachment; filename="sam-resume.pdf"'


@pytest.mark.parametrize("status", [ApplicationStatus.PENDING, ApplicationStatus.WITHDRAWN])
def test_an_owner_i_applied_to_can_read_it(client, sam, owner, status):
    upload(client, pdf())
    Application.objects.create(role=project_role(owner), applicant=sam, status=status)
    client.force_login(owner)

    response = client.get(resume_url(sam))

    assert response.status_code == 200
    assert b"".join(response.streaming_content) == PDF


def test_anyone_else_gets_403_and_no_file(client, sam, owner):
    upload(client, pdf())
    # Olive owns a project, but Sam never applied to it.
    project_role(owner)
    # Dana applied to the same project as Sam, which doesn't make her an owner.
    dana = make_user("dana@latech.edu")
    Application.objects.create(role=project_role(owner), applicant=dana)

    for someone in (owner, dana):
        client.force_login(someone)
        response = client.get(resume_url(sam))
        assert response.status_code == 403
        assert response.json()["code"] == "permission_denied"
        assert PDF not in response.content


def test_403_before_404_so_it_never_says_whether_a_resume_exists(client, owner):
    nobody = make_user("nobody@latech.edu")
    client.force_login(owner)
    assert client.get(resume_url(nobody)).status_code == 403


def test_signed_out_gets_no_resume(client, sam):
    upload(client, pdf())
    client.logout()
    assert client.get(resume_url(sam)).status_code in (401, 403)


def test_profiles_never_carry_the_file_or_its_address(client, sam, owner):
    upload(client, pdf())
    name = Profile.objects.get(user=sam).resume.name
    Application.objects.create(role=project_role(owner), applicant=sam)

    mine = client.get("/api/v1/me/profile/").json()
    client.force_login(owner)
    public = client.get(f"/api/v1/profiles/{sam.profile.id}/").json()
    queue = client.get(
        f"/api/v1/roles/{Application.objects.get(applicant=sam).role_id}/applications/"
    ).json()["results"][0]["applicant"]

    for body in (mine, public, queue):
        assert body["has_resume"] is True
        assert "resume" not in body
        assert name not in str(body) and "resumes/" not in str(body)
    # The file name is the owner's to see.
    assert "resume_name" not in public and "resume_name" not in queue


def test_resume_changes_leave_the_rest_of_the_profile_alone(sam):
    stale = Profile.objects.get(user=sam)
    Profile.objects.filter(user=sam).update(bio="Saved meanwhile", retired_until="2026-12-12")

    set_resume(stale, pdf())
    remove_resume(stale)

    fresh = Profile.objects.get(user=sam)
    assert (fresh.bio, str(fresh.retired_until)) == ("Saved meanwhile", "2026-12-12")
    assert not fresh.resume and fresh.resume_name == ""
