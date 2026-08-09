# CI/CD Pipeline Documentation

## Overview

This project uses GitHub Actions to automate testing, building, and deployment processes. The pipeline consists of two main workflows:

1. **PR Verify** - Runs on pull requests to ensure code quality
2. **Build and Deploy** - Runs on push to main to build and deploy

## PR Verify Workflow

Triggered on: Pull requests to `main` or `develop` branches

### Jobs:

#### 1. Lint & Format Check
- Runs ESLint for code quality
- TypeScript type checking
- Prettier format validation
- Status: Non-blocking (continues on error)

#### 2. Build Verification
- Installs dependencies
- Builds Next.js application
- Uploads build artifacts for retention
- **Status**: Blocking (must pass)

#### 3. Unit Tests
- Runs configured test suite
- Reports coverage metrics
- **Status**: Blocking (must pass)

#### 4. Security Scan
- NPM audit for vulnerabilities
- Static analysis (SAST) for hardcoded secrets
- Detects potential API keys
- **Status**: Non-blocking (advisory only)

#### 5. Database Schema Validation
- Spins up PostgreSQL service
- Runs database migrations
- Validates schema integrity
- **Status**: Blocking (must pass)

#### 6. Verification Summary
- Aggregates all check results
- Comments on PR with status
- Blocks PR if critical checks fail

## Build and Deploy Workflow

Triggered on: Push to `main` branch or manual trigger

### Jobs:

#### 1. Build Docker Image
- Compiles Next.js application
- Generates build manifest
- Uploads artifacts for deployment
- **Output**: Build artifacts, manifest file

#### 2. Test Built Application
- Runs smoke tests
- Performs health checks
- Verifies dependencies
- **Output**: Test results

#### 3. Deploy to Staging
- Downloads build artifacts
- Prepares deployment package
- Deploys to staging environment
- Runs post-deployment verification
- Creates GitHub deployment record
- **Output**: Staging deployment confirmation

#### 4. Deploy to Production
- Pre-deployment validation
- Blue-Green deployment strategy
- Database migrations
- Post-deployment health checks
- **Output**: Production deployment confirmation

#### 5. Rollback (Manual)
- Reverts to previous stable build
- Restores from database snapshot
- Validates rollback success
- **Trigger**: Manual workflow dispatch

#### 6. Deployment Summary
- Aggregates all deployment results
- Generates final status report

## Environment Variables

Required secrets for CI/CD:

```
OPENAI_API_KEY       - OpenAI API key for the agent
DATABASE_URL         - PostgreSQL connection string
```

## Status Badges

Add to README:

```markdown
[![PR Verify](https://github.com/andrevberaldo/AI-agent/actions/workflows/pr-verify.yml/badge.svg)](https://github.com/andrevberaldo/AI-agent/actions)
[![Build and Deploy](https://github.com/andrevberaldo/AI-agent/actions/workflows/build-and-deploy.yml/badge.svg)](https://github.com/andrevberaldo/AI-agent/actions)
```

## Workflow Rules

### PR Merge Requirements

A PR can only be merged if:
- ✓ Build verification passes
- ✓ Tests pass (if configured)
- ✓ Database schema validates
- ✓ Code review approved

### Deployment Rules

Production deployment is automatic on merge to main:
1. Build artifact created
2. Smoke tests run
3. Deployed to staging first
4. Automated tests verify staging
5. Blue-Green deployment to production
6. Health checks verify production

## Manual Actions

### Trigger Build and Deploy
```bash
gh workflow run build-and-deploy.yml
```

### Trigger PR Verify
```bash
gh workflow run pr-verify.yml
```

### View Workflow Runs
```bash
gh workflow view pr-verify --web
gh workflow view build-and-deploy --web
```

## Mocked vs Real Implementations

Current implementation uses **mocked deployment steps** that simulate:
- Docker builds and pushes
- Environment deployments
- Service health checks
- Database migrations

To make deployments real, replace mocked steps with:
- Docker registry authentication
- Cloud provider (AWS/GCP/Azure) CLI commands
- Kubernetes or container orchestration deployments
- Actual health check endpoints

## Troubleshooting

### PR Checks Failing
1. Check workflow logs: Actions tab → workflow name
2. Review error messages in job logs
3. Fix issues and push new commit

### Deployment Issues
1. Check deployment logs in Actions tab
2. Review build artifacts
3. Verify environment secrets are set
4. Check database connectivity

### Security Checks
1. NPM audit failures: Run `npm audit fix`
2. Hardcoded secrets: Remove and use GitHub Secrets
3. Type errors: Fix TypeScript compilation

## Future Enhancements

- [ ] Code coverage reporting
- [ ] Performance benchmarking
- [ ] Container image scanning
- [ ] Infrastructure as Code validation
- [ ] Automated dependency updates
- [ ] Canary deployments
- [ ] Automated rollback on health check failures
