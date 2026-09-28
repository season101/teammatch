# Deploy

Production compose for the server (`teammatch.sijancodes.com` behind Traefik). The stack is self-contained: its own Postgres, Redis, and SeaweedFS on a private network. Only `web` and `api` join the `t3_proxy` network.

`teammatch.prod.yml` and `.env.prod.example` land here with the first deploy (Sprint 1, PL-05). Steps: [docs/architecture/deployment.md](../docs/architecture/deployment.md).
