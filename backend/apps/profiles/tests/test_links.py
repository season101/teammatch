import pytest

from apps.accounts.models import User
from apps.profiles.models import Profile

pytestmark = pytest.mark.django_db

URL = "/api/v1/me/profile/"


@pytest.fixture
def sam(client):
    user = User.objects.create_user("sam@latech.edu", "a-long-password")
    client.force_login(user)
    return user


def patch(client, **body):
    return client.patch(URL, body, content_type="application/json")


@pytest.mark.parametrize(
    "github,linkedin",
    [
        ("https://github.com/sam", "https://linkedin.com/in/sam"),
        ("https://www.github.com/sam", "https://www.linkedin.com/in/sam-rivera/"),
        ("https://GitHub.com/Sam", "https://LinkedIn.com/in/Sam"),
    ],
)
def test_save_github_and_linkedin(client, sam, github, linkedin):
    response = patch(client, github_url=github, linkedin_url=linkedin)

    assert response.status_code == 200
    assert (response.json()["github_url"], response.json()["linkedin_url"]) == (github, linkedin)
    profile = Profile.objects.get(user=sam)
    assert (profile.github_url, profile.linkedin_url) == (github, linkedin)


@pytest.mark.parametrize(
    "value",
    [
        "http://github.com/sam",
        "https://gitlab.com/sam",
        "https://github.com.evil.example/sam",
        "https://evil.example/?u=https://github.com/sam",
        "https://sam@github.com/sam",
        "https://github.com:8443/sam",
        "https://gist.github.com/sam",
        "https://github.com/",
        "https://github.com",
        "github.com/sam",
        "javascript:alert(1)//github.com/x",
        "https://[github.com/sam",
    ],
)
def test_github_must_be_an_https_github_link(client, sam, value):
    response = patch(client, github_url=value)

    assert response.status_code == 400
    assert response.json() == {"github_url": ["Enter a link that starts with https://github.com/"]}
    assert response.data["github_url"][0].code == "github_url_invalid"
    assert Profile.objects.get(user=sam).github_url == ""


@pytest.mark.parametrize(
    "value",
    ["https://github.com/sam", "http://linkedin.com/in/sam", "https://linkedin.com.evil.example/x"],
)
def test_linkedin_must_be_an_https_linkedin_link(client, sam, value):
    response = patch(client, linkedin_url=value)

    assert response.status_code == 400
    assert response.json() == {
        "linkedin_url": ["Enter a link that starts with https://linkedin.com/"]
    }
    assert response.data["linkedin_url"][0].code == "linkedin_url_invalid"


def test_blank_clears_a_link(client, sam):
    patch(client, github_url="https://github.com/sam")

    response = patch(client, github_url="")

    assert response.status_code == 200
    assert Profile.objects.get(user=sam).github_url == ""


def test_links_show_on_the_public_profile(client, sam):
    patch(client, github_url="https://github.com/sam", linkedin_url="https://linkedin.com/in/sam")
    alex = User.objects.create_user("alex@latech.edu", "a-long-password")
    client.force_login(alex)

    body = client.get(f"/api/v1/profiles/{sam.profile.id}/").json()

    assert body["github_url"] == "https://github.com/sam"
    assert body["linkedin_url"] == "https://linkedin.com/in/sam"
