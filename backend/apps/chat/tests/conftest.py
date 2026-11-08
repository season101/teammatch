import pytest

from apps.matching.tests.test_my_team import locked_team, term, user


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
