<map version="freeplane 1.9.13">
<!--To view this file, download free mind mapping software Freeplane from https://www.freeplane.org -->
<node TEXT="TeamMatch" FOLDED="false" ID="ID_ROOT">
<hook NAME="MapStyle"/>
<hook NAME="AutomaticEdgeColor" COUNTER="6" RULE="ON_BRANCH_CREATION"/>
<node TEXT="F1 Accounts &amp; Profiles" POSITION="right" FOLDED="false" ID="ID_1000">
<node TEXT="F1-01 Email sign up" FOLDED="true" ID="ID_1001">
<node TEXT="AC: Valid school email + strong password creates account" ID="ID_1002"/>
<node TEXT="AC: Verification email sent" ID="ID_1003"/>
<node TEXT="AC: Duplicate email shows sign-in hint" ID="ID_1004"/>
</node>
<node TEXT="F1-02 Sign in / sign out" FOLDED="true" ID="ID_1005">
<node TEXT="AC: Wrong credentials give generic error" ID="ID_1006"/>
<node TEXT="AC: Repeated failures are rate limited" ID="ID_1007"/>
</node>
<node TEXT="F1-03 Profile (name, bio, major)" FOLDED="true" ID="ID_1008">
<node TEXT="AC: Email never shown to others" ID="ID_1009"/>
<node TEXT="AC: Editing another profile returns 403" ID="ID_1010"/>
</node>
<node TEXT="F1-04 Skills from shared list" FOLDED="true" ID="ID_1011">
<node TEXT="AC: Skills not in list are rejected" ID="ID_1012"/>
</node>
<node TEXT="F1-05 Google sign-in" FOLDED="true" ID="ID_1013">
<node TEXT="AC: Links to existing account with same email" ID="ID_1014"/>
</node>
<node TEXT="F1-06 Email domain allowlist" FOLDED="true" ID="ID_1015">
<node TEXT="AC: Other domains rejected for email and Google" ID="ID_1016"/>
<node TEXT="AC: Case-insensitive match" ID="ID_1017"/>
</node>
<node TEXT="F1-07 Avatar upload" FOLDED="true" ID="ID_1018">
<node TEXT="AC: JPEG/PNG/WebP under 2 MB" ID="ID_1019"/>
<node TEXT="AC: Uploaded through the API to SeaweedFS" ID="ID_1020"/>
</node>
<node TEXT="F1-08 Retired users blocked + term reset" FOLDED="true" ID="ID_1021">
<node TEXT="AC: Retired users cannot apply" ID="ID_1022"/>
<node TEXT="AC: Retired users hidden from review queues" ID="ID_1023"/>
</node>
</node>
<node TEXT="F2 Projects &amp; Roles" POSITION="right" FOLDED="false" ID="ID_1025">
<node TEXT="F2-01 Create project" FOLDED="true" ID="ID_1026">
<node TEXT="AC: Saved as draft in current term" ID="ID_1027"/>
</node>
<node TEXT="F2-02 Roles with required skills" FOLDED="true" ID="ID_1028">
<node TEXT="AC: Cannot publish a project with no roles" ID="ID_1029"/>
<node TEXT="AC: Only owner can edit roles" ID="ID_1030"/>
</node>
<node TEXT="F2-03 List open projects" FOLDED="true" ID="ID_1031">
<node TEXT="AC: Draft, locked, archived not listed" ID="ID_1032"/>
</node>
<node TEXT="F2-04 Project detail" ID="ID_1033"/>
<node TEXT="F2-05 Edit / close project" FOLDED="true" ID="ID_1034">
<node TEXT="AC: Locked projects are read-only" ID="ID_1035"/>
</node>
<node TEXT="F2-06 Delete unfillable role" FOLDED="true" ID="ID_1036">
<node TEXT="AC: Pending applications withdrawn" ID="ID_1037"/>
<node TEXT="AC: Runs team-lock check" ID="ID_1038"/>
</node>
<node TEXT="F2-07 Search and filter by skill" ID="ID_1039"/>
<node TEXT="F2-08 Installable PWA" FOLDED="true" ID="ID_1040">
<node TEXT="AC: Lighthouse installable check passes" ID="ID_1041"/>
</node>
<node TEXT="F2-10 Responsive pass" ID="ID_1042"/>
</node>
<node TEXT="F3 Swipe Feed &amp; Applications" POSITION="left" FOLDED="false" ID="ID_1043">
<node TEXT="F3-01 Role feed" FOLDED="true" ID="ID_1044">
<node TEXT="AC: Excludes own projects" ID="ID_1045"/>
<node TEXT="AC: Excludes applied and passed roles" ID="ID_1046"/>
</node>
<node TEXT="F3-08 Role card" ID="ID_1047"/>
<node TEXT="F3-02 Apply with note" FOLDED="true" ID="ID_1048">
<node TEXT="AC: One application per role" ID="ID_1049"/>
<node TEXT="AC: Owner and retired users blocked" ID="ID_1050"/>
</node>
<node TEXT="F3-03 Swipe deck" FOLDED="true" ID="ID_1051">
<node TEXT="AC: Right = apply, left = pass" ID="ID_1052"/>
</node>
<node TEXT="F3-04 Skill-overlap ranking" FOLDED="true" ID="ID_1053">
<node TEXT="AC: p95 under 300 ms at seed scale" ID="ID_1054"/>
</node>
<node TEXT="F3-05 Pass on a role" FOLDED="true" ID="ID_1055">
<node TEXT="AC: Owner not notified" ID="ID_1057"/>
</node>
<node TEXT="F3-06 My applications + withdraw" FOLDED="true" ID="ID_1058">
<node TEXT="AC: Liked applications cannot be withdrawn" ID="ID_1059"/>
</node>
<node TEXT="F3-10 Undo last swipe" FOLDED="true" ID="ID_1060">
<node TEXT="AC: Reverts last pass or withdraws last pending application" ID="ID_1100"/>
</node>
<node TEXT="F3-09 Keyboard and button controls" ID="ID_1061"/>
</node>
<node TEXT="F4 Review, Match &amp; Team Chat" POSITION="left" FOLDED="false" ID="ID_1062">
<node TEXT="F4-01 Applicants per role" FOLDED="true" ID="ID_1063">
<node TEXT="AC: Non-owner gets 403" ID="ID_1064"/>
</node>
<node TEXT="F4-02 Like / pass applicant" ID="ID_1065"/>
<node TEXT="F4-03 Team model + lock rule" FOLDED="true" ID="ID_1066">
<node TEXT="AC: Only one Team even with concurrent likes" ID="ID_1067"/>
</node>
<node TEXT="F4-04 Review queue UI" ID="ID_1068"/>
<node TEXT="F4-05 Mutual like fills role + team lock" FOLDED="true" ID="ID_1069">
<node TEXT="AC: Other pending applicants for role set to passed" ID="ID_1070"/>
<node TEXT="AC: Locks only when every role is filled" ID="ID_1072"/>
</node>
<node TEXT="F4-07 Auto-withdraw + call retire" FOLDED="true" ID="ID_1073">
<node TEXT="AC: Members' other pending applications withdrawn" ID="ID_1074"/>
<node TEXT="AC: retired_until set to term end" ID="ID_1075"/>
</node>
<node TEXT="F4-08 Team chat (WebSocket)" FOLDED="true" ID="ID_1076">
<node TEXT="AC: Members only" ID="ID_1077"/>
<node TEXT="AC: Delivered under 1 second" ID="ID_1078"/>
</node>
<node TEXT="F4-09 Chat history + reconnect" ID="ID_1079"/>
</node>
<node TEXT="Technical Requirements" POSITION="right" FOLDED="false" ID="ID_1080">
<node TEXT="TR-01 Contract-first OpenAPI" FOLDED="true" ID="ID_1081">
<node TEXT="AC: CI fails on schema or client drift" ID="ID_1082"/>
</node>
<node TEXT="TR-02 Authentication (allauth headless)" ID="ID_1083"/>
<node TEXT="TR-03 Object-level authorization" ID="ID_1084"/>
<node TEXT="TR-04 Security" FOLDED="true" ID="ID_1085">
<node TEXT="AC: No secrets in repo, gitleaks in CI" ID="ID_1086"/>
</node>
<node TEXT="TR-05 Data integrity" ID="ID_1087"/>
<node TEXT="TR-06 Performance" ID="ID_1088"/>
<node TEXT="TR-07 PWA and responsive" ID="ID_1089"/>
<node TEXT="TR-08 Accessibility" ID="ID_1090"/>
<node TEXT="TR-09 Deployment (Docker, Traefik)" ID="ID_1091"/>
<node TEXT="TR-10 CI/CD (GitHub Actions)" ID="ID_1092"/>
<node TEXT="TR-11 Testing" FOLDED="true" ID="ID_1093">
<node TEXT="AC: Every business rule has a test" ID="ID_1094"/>
</node>
<node TEXT="TR-12 Observability" ID="ID_1095"/>
<node TEXT="TR-13 Mobile-ready API" ID="ID_1096"/>
</node>
<node TEXT="Future" POSITION="left" FOLDED="false" ID="ID_1200">
<node TEXT="FU-01 Expo mobile app" ID="ID_1201"/>
<node TEXT="F3-07 Live notifications" ID="ID_1202"/>
<node TEXT="F1-09 Account settings" ID="ID_1203"/>
<node TEXT="F2-09 Full accessibility audit" ID="ID_1204"/>
<node TEXT="FU-06 Presigned avatar uploads" ID="ID_1205"/>
<node TEXT="FU-02 Tauri desktop wrapper" ID="ID_1206"/>
<node TEXT="FU-03 Team-balance score" ID="ID_1207"/>
<node TEXT="FU-04 Instructor / course mode" ID="ID_1208"/>
<node TEXT="FU-05 Web push notifications" ID="ID_1209"/>
</node>
</node>
</map>
