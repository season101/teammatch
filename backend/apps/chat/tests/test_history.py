import pytest
from rest_framework.test import APIClient

from apps.chat.models import ChatMessage
from apps.chat.services import is_member
from apps.matching.tests.test_my_team import locked_team, term, user

pytestmark = pytest.mark.django_db


def messages_url(team_id):
    return f"/api/v1/teams/{team_id}/messages/"


def client_for(someone):
    client = APIClient()
    client.force_authenticate(someone)
    return client


@pytest.fixture
def marco():
    return user("marco@latech.edu", "Marco")


@pytest.fixture
def ava():
    return user("ava@latech.edu", "Ava")


@pytest.fixture
def outsider():
    return user("outsider@latech.edu", "Outsider")


@pytest.fixture
def team(marco, ava):
    return locked_team(marco, term("Fall 2026", -30), "Bulldog Bites", [("Backend developer", ava)])


def post(team, sender, count):
    return [
        ChatMessage.objects.create(team=team, sender=sender, body=f"hi {i}") for i in range(count)
    ]


def test_a_member_gets_newest_first_50_a_page(team, marco, ava):
    sent = post(team, marco, 30) + post(team, ava, 30)
    client = client_for(ava)

    first = client.get(messages_url(team.id)).json()
    second = client.get(first["next"]).json()

    assert [m["id"] for m in first["results"]] == [m.id for m in reversed(sent)][:50]
    assert [m["id"] for m in second["results"]] == [m.id for m in reversed(sent)][50:]
    assert second["next"] is None


def test_after_keeps_only_newer_messages_and_stays_in_next(team, marco):
    sent = post(team, marco, 60)
    client = client_for(marco)

    first = client.get(messages_url(team.id), {"after": sent[4].id}).json()
    second = client.get(first["next"]).json()

    assert f"after={sent[4].id}" in first["next"]
    got = [m["id"] for m in first["results"] + second["results"]]
    assert got == [m.id for m in reversed(sent[5:])]


@pytest.mark.parametrize("after", ["abc", "1.5"])
def test_after_must_be_a_message_id(team, marco, after):
    response = client_for(marco).get(messages_url(team.id), {"after": after})

    assert response.status_code == 400
    assert "after" in response.json()


def test_sender_has_id_and_display_name_and_no_email(team, marco, ava):
    post(team, ava, 1)

    response = client_for(marco).get(messages_url(team.id))

    message = response.json()["results"][0]
    assert message["team"] == team.id
    assert message["body"] == "hi 0"
    assert message["sender"] == {"id": ava.id, "display_name": "Ava"}
    assert "@latech.edu" not in response.content.decode()


def test_a_non_member_of_a_locked_team_gets_404_like_a_missing_team(team, outsider):
    assert client_for(outsider).get(messages_url(team.id)).status_code == 404


def test_a_missing_team_is_404(team, marco):
    assert client_for(marco).get(messages_url(team.id + 1)).status_code == 404


def test_signed_out_users_get_403(team):
    assert APIClient().get(messages_url(team.id)).status_code == 403


@pytest.mark.parametrize("count", [1, 50])
def test_query_count_does_not_grow_with_the_page(
    team, marco, ava, count, django_assert_num_queries
):
    post(team, ava, count)
    client = client_for(marco)

    # membership check + page
    with django_assert_num_queries(2):
        assert len(client.get(messages_url(team.id)).json()["results"]) == count


def test_is_member_is_true_for_owner_and_filled_roles_only(team, marco, ava, outsider):
    assert is_member(marco, team.id)
    assert is_member(ava, team.id)
    assert not is_member(outsider, team.id)
    assert not is_member(marco, team.id + 1)
