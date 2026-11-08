from enum import Enum, auto

from apps.matching.models import Membership, Team


class TeamAccess(Enum):
    MEMBER = auto()
    NOT_MEMBER = auto()
    NO_TEAM = auto()


def team_access(user, team_id):
    """Can this user read and post in the team's chat? Only members can (BR-12).

    Used by the history view (403/404) and the chat socket (4403/4404).
    """
    if Membership.objects.filter(team_id=team_id, user_id=user.id).exists():
        return TeamAccess.MEMBER
    if Team.objects.filter(pk=team_id).exists():
        return TeamAccess.NOT_MEMBER
    return TeamAccess.NO_TEAM
