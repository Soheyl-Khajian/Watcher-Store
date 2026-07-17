# Watcher Store

A modern full-stack e-commerce platform built with TypeScript using a monorepo architecture.

Watcher Store was created to explore scalable application architecture rather than simply building an online store. The project demonstrates how a frontend, backend, shared packages, and development tooling can work together in a maintainable codebase.

> ⚠️ This project is currently under active development.

---

## Features

- Full-stack TypeScript
- Monorepo architecture
- Docker development environment
- API-driven design
- Modular project structure
- Shared packages
- Modern frontend
- REST API
- Environment-based configuration

---

## Tech Stack

### Frontend

- TypeScript
- Next.js

### Backend

- Node.js
- TypeScript
- NestJS

### Tooling

- pnpm Workspaces
- Docker
- Git
- ESLint
- Prettier

---

## Project Structure

```
Watcher-Store
│
├── apps/
│   ├── frontend
│   └── backend
│
├── packages/
│
├── docker/
│
└── ...
```

The repository follows a monorepo approach, allowing different applications and shared packages to evolve together while keeping a single source of truth.

---

## Goals

The primary objective of this project is to practice production-style software engineering.

Some design goals include:

- maintainable architecture
- reusable modules
- separation of concerns
- scalable folder organization
- consistent TypeScript usage
- containerized development

---

## Getting Started

### Clone

```bash
git clone https://github.com/Reynnaurd/Watcher-Store.git
```

### Install

```bash
pnpm install
```

### Run

```bash
pnpm dev
```

Or start the Docker environment:

```bash
docker compose up
```

---

## Screenshots

> Screenshots will be added as the project evolves.

Suggested screenshots:

- Home page
- Product page
- Shopping cart
- Admin dashboard
- Mobile view

---

## Roadmap

- [ ] User authentication
- [ ] Product management
- [ ] Shopping cart
- [ ] Checkout
- [ ] Payment integration
- [ ] Order management
- [ ] Admin dashboard
- [ ] Search
- [ ] Reviews
- [ ] CI/CD
- [ ] Automated testing

---

## Why this project?

Rather than focusing solely on features, Watcher Store explores how modern full-stack applications should be structured for long-term maintainability.

The emphasis is on clean architecture, modularity, and developer experience.

---

## License

MIT
