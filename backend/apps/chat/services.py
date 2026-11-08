from apps.matching.models import Membership


def is_member(user, team_id):
    """Only the team's members can read and post in its chat (BR-12).

    Used by the history view and the chat socket. Both treat a non-member the same as a
    missing team (404 / 4404), so team ids do not leak.
    """
    return Membership.objects.filter(team_id=team_id, user_id=user.id).exists()
