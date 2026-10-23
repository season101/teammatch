"""Build the GitHub wiki pages from the repo's docs.

    python3 .github/scripts/build_wiki.py OUT_DIR

docs/ stays the source of truth; .github/workflows/wiki.yml pushes OUT_DIR to the
wiki on every merge to main. Exits 1 on a broken link or a doc missing from PAGES.
"""

import posixpath
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
REPO_URL = "https://github.com/season101/teammatch"

# Sidebar sections in order: (heading, [(source, wiki page name)]). Every .md under docs/ needs a line.
PAGES = [
    ("Reference", [
        ("docs/glossary.md", "Glossary"),
    ]),
    ("Product", [
        ("docs/product/prd.md", "Product-Requirements"),
        ("docs/product/use-cases.md", "Use-Cases"),
        ("docs/product/backlog.md", "Product-Backlog"),
        ("docs/product/sprint-1-features.md", "Sprint-1-Features"),
    ]),
    ("Planning", [
        ("docs/planning/sprint-plan.md", "Sprint-Plan"),
        ("docs/planning/team-roles.md", "Team-Roles"),
        ("docs/planning/sprint-1-report.md", "Sprint-1-Report"),
    ]),
    ("Architecture", [
        ("docs/architecture/overview.md", "Architecture-Overview"),
        ("docs/architecture/data-model.md", "Data-Model"),
        ("docs/architecture/flows.md", "Main-Flows"),
        ("docs/architecture/api.md", "API-Contract"),
        ("docs/architecture/api-create-project.md", "API-Create-Project"),
        ("docs/architecture/api-roles-and-projects.md", "API-Roles-and-Projects"),
        ("docs/architecture/cicd.md", "CI-CD-and-Branching"),
        ("docs/architecture/deployment.md", "Deployment"),
    ]),
    # ADR page names come from their "# ADR 0001: ..." heading, so new ADRs need no line here
    ("Decisions", [
        (p.relative_to(ROOT).as_posix(), re.sub(r"[^A-Za-z0-9]+", "-", p.read_text().split("\n", 1)[0][2:]).strip("-"))
        for p in sorted(ROOT.glob("docs/architecture/adr/*.md"))
    ]),
    ("Design system", [
        ("docs/design/README.md", "Design-System"),
        ("docs/design/principles.md", "Design-Principles"),
        ("docs/design/foundations/color.md", "Design-Color"),
        ("docs/design/foundations/typography.md", "Design-Typography"),
        ("docs/design/foundations/layout.md", "Design-Layout"),
        ("docs/design/foundations/shape-depth-motion.md", "Design-Shape-Depth-Motion"),
        ("docs/design/foundations/accessibility.md", "Design-Accessibility"),
        ("docs/design/screens/README.md", "Design-Screens"),
        ("docs/design/screens/flows.md", "Design-User-Flows"),
        ("docs/design/process.md", "Design-Process"),
        ("docs/design/decisions.md", "Design-Decisions"),
    ]),
    ("Design components", [
        ("docs/design/components/README.md", "Design-Components"),
        ("docs/design/components/button.md", "Component-Button"),
        ("docs/design/components/action-button.md", "Component-ActionButton"),
        ("docs/design/components/chip.md", "Component-Chip"),
        ("docs/design/components/match-badge.md", "Component-MatchBadge"),
        ("docs/design/components/team-strip.md", "Component-TeamStrip"),
        ("docs/design/components/profile-strength.md", "Component-ProfileStrength"),
        ("docs/design/components/tabs.md", "Component-Tabs"),
        ("docs/design/components/modal.md", "Component-Modal"),
        ("docs/design/components/toast.md", "Component-Toast"),
        ("docs/design/components/role-card.md", "Component-RoleCard"),
        ("docs/design/components/applicant-card.md", "Component-ApplicantCard"),
        ("docs/design/components/form-fields.md", "Component-Form-Fields"),
        ("docs/design/components/empty-state.md", "Component-EmptyState"),
    ]),
    ("Design patterns", [
        ("docs/design/patterns/navigation.md", "Pattern-Navigation"),
        ("docs/design/patterns/swipe-deck.md", "Pattern-Swipe-Deck"),
        ("docs/design/patterns/review-queue.md", "Pattern-Review-Queue"),
        ("docs/design/patterns/forms.md", "Pattern-Forms"),
        ("docs/design/patterns/confirmations.md", "Pattern-Confirmations"),
        ("docs/design/patterns/feedback-states.md", "Pattern-Feedback-States"),
    ]),
    ("Operations", [
        ("deploy/README.md", "Deploy-Runbook"),
        ("docs/github-setup.md", "GitHub-Setup"),
        ("packages/api-client/README.md", "API-Client"),
    ]),
    ("Deliverables", [
        ("docs/deliverables/Product Backlog.md", "Backlog-Sprint-1-Submission"),
        ("docs/deliverables/rundown-outline.md", "Run-down-Outline"),
    ]),
]
PAGE_OF = {"README.md": "Home"} | {src: page for _, pages in PAGES for src, page in pages}
ASSETS = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp")
LINK = re.compile(r"(\]\()([^)\s]+)(\))")
FENCE = re.compile(r"(^```.*?^```)", re.M | re.S)


def rewrite_links(text, src, out, errors):
    def fix(m):
        target = m[2]
        if re.match(r"[a-z][a-z0-9+.-]*:|[#/]", target):  # URL, mailto, same-page anchor
            return m[0]
        path, hash_, anchor = target.partition("#")
        dest = posixpath.normpath(posixpath.join(posixpath.dirname(src), unquote(path)))
        if dest in PAGE_OF:
            new = PAGE_OF[dest]
        elif dest.startswith("..") or not (ROOT / dest).exists():
            errors.append(f"{src}: broken link {target}")
            return m[0]
        elif dest.lower().endswith(ASSETS):
            # the wiki serves files from its own repo, relative to the wiki root
            (out / dest).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / dest, out / dest)
            new = dest
        else:  # code, config, folders: send readers to the repo
            new = f"{REPO_URL}/{'tree' if (ROOT / dest).is_dir() else 'blob'}/main/{dest}"
        return f"{m[1]}{new}{hash_}{anchor}{m[3]}"

    # leave fenced code blocks (mermaid, shell) untouched
    return "".join(p if i % 2 else LINK.sub(fix, p) for i, p in enumerate(FENCE.split(text)))


def build(out):
    errors = []
    names = list(PAGE_OF.values())
    errors += [f"two docs map to the wiki page {n}" for n in set(names) if names.count(n) > 1]
    errors += [
        f"{p.relative_to(ROOT).as_posix()} is not in the wiki: add it to PAGES in {Path(__file__).name}"
        for p in sorted(ROOT.glob("docs/**/*.md"))
        if p.relative_to(ROOT).as_posix() not in PAGE_OF
    ]
    out.mkdir(parents=True, exist_ok=True)
    for src, page in PAGE_OF.items():
        text = rewrite_links((ROOT / src).read_text(), src, out, errors).rstrip()
        footer = f"_Source: [{src}]({REPO_URL}/blob/main/{src.replace(' ', '%20')}). Edit it there: changes made in the wiki are overwritten on the next sync._"
        (out / f"{page}.md").write_text(f"{text}\n\n---\n\n{footer}\n")

    sidebar = ["**[Home](Home)**", ""]
    for heading, pages in PAGES:
        sidebar += [f"**{heading}**", *(f"- [{page.replace('-', ' ')}]({page})" for _, page in pages), ""]
    (out / "_Sidebar.md").write_text("\n".join(sidebar))
    return errors


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    if errors := build(Path(sys.argv[1])):
        sys.exit("\n".join(errors))
