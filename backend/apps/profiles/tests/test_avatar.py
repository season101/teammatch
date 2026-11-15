from io import BytesIO

import pytest
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.accounts.models import User
from apps.profiles.models import Profile
from apps.profiles.services import remove_avatar, set_avatar

pytestmark = pytest.mark.django_db

URL = "/api/v1/me/avatar/"


def image_file(kind="PNG", name="me.png", size=(40, 30), exif=None):
    out = BytesIO()
    extra = {"exif": exif} if exif else {}
    Image.new("RGB", size, "purple").save(out, format=kind, **extra)
    return SimpleUploadedFile(name, out.getvalue())


@pytest.fixture
def sam(client):
    user = User.objects.create_user("sam@latech.edu", "a-long-password")
    client.force_login(user)
    return user


def upload(client, file):
    return client.post(URL, {"avatar": file})


@pytest.mark.parametrize("kind,ext", [("JPEG", "jpg"), ("PNG", "png"), ("WEBP", "webp")])
def test_upload_an_avatar(client, sam, kind, ext):
    response = upload(client, image_file(kind, name="photo.bin"))

    assert response.status_code == 200
    name = Profile.objects.get(user=sam).avatar.name
    # The extension comes from the file's real type, not its name.
    assert name.startswith(f"avatars/{sam.id}/") and name.endswith(f".{ext}")
    assert default_storage.exists(name)
    assert response.json()["avatar_url"].startswith(f"/api/v1/profiles/{sam.profile.id}/avatar/?v=")


def test_avatar_is_served_by_the_api(client, sam):
    url = upload(client, image_file()).json()["avatar_url"]

    response = client.get(url)

    assert response.status_code == 200
    assert response["Content-Type"] == "image/png"
    assert response["X-Content-Type-Options"] == "nosniff"
    assert Image.open(BytesIO(b"".join(response.streaming_content))).format == "PNG"


def test_avatar_is_shrunk_and_loses_its_exif(client, sam):
    exif = Image.Exif()
    exif[0x8825] = {2: (32.0, 31.0, 0.0)}  # GPS latitude
    upload(client, image_file("JPEG", size=(2000, 1000), exif=exif.tobytes()))

    with Profile.objects.get(user=sam).avatar.open("rb") as stored:
        image = Image.open(stored)
        assert image.size == (512, 256)
        assert not image.getexif()


@pytest.mark.parametrize(
    "file",
    [
        SimpleUploadedFile("cv.png", b"%PDF-1.7 not an image"),
        SimpleUploadedFile("cut.png", image_file().read()[:60]),
        image_file("GIF", name="anim.gif"),
    ],
    ids=["not-an-image", "truncated", "gif"],
)
def test_bad_files_are_refused_and_the_old_avatar_stays(client, sam, file):
    upload(client, image_file())
    before = Profile.objects.get(user=sam).avatar.name

    response = upload(client, file)

    assert response.status_code == 400
    assert response.json()["code"] == "invalid_avatar"
    assert Profile.objects.get(user=sam).avatar.name == before
    assert default_storage.exists(before)


def test_over_2_mb_is_refused(client, sam):
    # A real PNG padded past 2 MB: Pillow alone would accept it.
    big = SimpleUploadedFile("big.png", image_file().read() + b"\0" * (2 * 1024 * 1024))

    response = upload(client, big)

    assert response.status_code == 400
    assert response.json()["code"] == "invalid_avatar"


def test_missing_file_is_refused(client, sam):
    response = client.post(URL, {})
    assert response.status_code == 400
    assert response.json()["code"] == "invalid_avatar"


def test_replacing_deletes_the_old_file(client, sam):
    upload(client, image_file())
    old = Profile.objects.get(user=sam).avatar.name

    upload(client, image_file("JPEG", name="new.jpg"))

    assert Profile.objects.get(user=sam).avatar.name != old
    assert not default_storage.exists(old)


def test_remove_deletes_the_file(client, sam):
    upload(client, image_file())
    old = Profile.objects.get(user=sam).avatar.name

    response = client.delete(URL)

    assert response.status_code == 200
    assert response.json()["avatar_url"] is None
    assert not default_storage.exists(old)
    assert client.get(f"/api/v1/profiles/{sam.profile.id}/avatar/").status_code == 404


def test_avatar_needs_sign_in(client):
    user = User.objects.create_user("alex@latech.edu", "a-long-password")
    assert client.post(URL, {"avatar": image_file()}).status_code in (401, 403)
    assert client.get(f"/api/v1/profiles/{user.profile.id}/avatar/").status_code in (401, 403)


def test_others_see_my_avatar_url_on_my_public_profile(client, sam):
    upload(client, image_file())
    alex = User.objects.create_user("alex@latech.edu", "a-long-password")
    client.force_login(alex)

    body = client.get(f"/api/v1/profiles/{sam.profile.id}/").json()

    assert body["avatar_url"].startswith(f"/api/v1/profiles/{sam.profile.id}/avatar/")
    assert client.get(body["avatar_url"]).status_code == 200


def test_avatar_changes_leave_the_rest_of_the_profile_alone(sam):
    # A copy loaded before a retire() or PATCH landed must not write it back.
    stale = Profile.objects.get(user=sam)
    Profile.objects.filter(user=sam).update(bio="Saved meanwhile", retired_until="2026-12-12")

    set_avatar(stale, image_file())
    remove_avatar(stale)

    fresh = Profile.objects.get(user=sam)
    assert (fresh.bio, str(fresh.retired_until)) == ("Saved meanwhile", "2026-12-12")
    assert not fresh.avatar
