# GitHub Actions Setup

This guide explains how to set up automated releases using GitHub Actions with Changesets.

## Table of Contents

- [Benefits](#benefits)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [How It Works](#how-it-works)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)

---

## Benefits

Setting up GitHub Actions for releases provides:

✅ **Automated Publishing** - No manual `npm publish` needed
✅ **Provenance Support** - Cryptographic proof of package authenticity
✅ **CI/CD Integration** - Tests run automatically on every PR
✅ **Version Management** - Automated "Version Packages" PRs
✅ **Consistent Process** - Same workflow every time
✅ **No Local Setup Needed** - Publish from anywhere by merging a PR

---

## Prerequisites

Before setting up GitHub Actions:

1. ✅ GitHub repository must be public (for provenance)
2. ✅ npm account with 2FA enabled
3. ✅ npm automation token (see below)

### Creating an npm Automation Token

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Click **"Generate New Token"** → **"Granular Access Token"**
3. Configure the token:
   - **Name:** `GitHub Actions - agent-watch`
   - **Expiration:** Choose appropriate duration (e.g., 1 year)
   - **Packages and scopes:**
     - Select: `agent-watch`
     - Permissions: **Read and write**
   - **Organizations and repos:** (leave default)
   - **IP ranges:** (leave empty for GitHub Actions)
4. Click **"Generate Token"**
5. Copy the token immediately (you won't see it again!)

---

## Setup Instructions

### Step 1: Add npm Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add secret:
   - **Name:** `NPM_TOKEN`
   - **Value:** (paste your npm token)
5. Click **"Add secret"**

### Step 2: Create GitHub Actions Workflows

Create two workflow files in `.github/workflows/`:

#### **CI Workflow** (`.github/workflows/ci.yml`)

This runs on every PR and push to main:

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.8.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test:ci

      - name: Build
        run: pnpm build
```

#### **Release Workflow** (`.github/workflows/release.yml`)

This creates "Version Packages" PRs and publishes to npm:

```yaml
name: Release

on:
  push:
    branches:
      - main

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write # Required for provenance

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.8.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Create Release Pull Request or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          publish: pnpm release
          commit: 'chore: version packages'
          title: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Step 3: Enable Provenance in package.json

Add provenance back to `package.json`:

```json
{
  "publishConfig": {
    "provenance": true,
    "access": "public"
  }
}
```

### Step 4: Commit and Push Workflows

```bash
git add .github/workflows/
git commit -m "chore: add GitHub Actions workflows"
git push
```

---

## How It Works

### Automated Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Developer creates changeset                              │
│    $ pnpm changeset                                          │
│    $ git commit -m "feat: new feature"                       │
│    $ git push                                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. GitHub Actions detects changeset                         │
│    - Creates/Updates "Version Packages" PR                  │
│    - PR contains version bump + updated CHANGELOG           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Maintainer reviews and merges PR                         │
│    - Reviews version bump and CHANGELOG                     │
│    - Merges "Version Packages" PR                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. GitHub Actions automatically publishes                   │
│    - Runs tests                                              │
│    - Builds package                                          │
│    - Publishes to npm with provenance                       │
│    - Creates git tags                                        │
└─────────────────────────────────────────────────────────────┘
```

### What Happens When

| Event | Action |
|-------|--------|
| PR opened | CI workflow runs tests |
| Push to main with changesets | Creates "Version Packages" PR |
| "Version Packages" PR merged | Publishes to npm automatically |
| No changesets | No action taken |

---

## Usage

### Daily Development

```bash
# 1. Make changes
# ... edit code ...

# 2. Create changeset
pnpm changeset

# 3. Commit and push
git add .
git commit -m "feat: my feature"
git push
```

GitHub Actions will automatically create or update a "Version Packages" PR.

### Releasing

1. Go to GitHub repository
2. Find the **"Version Packages"** PR (created by GitHub Actions)
3. Review the changes:
   - Check `package.json` version
   - Review `CHANGELOG.md` entries
4. Merge the PR
5. GitHub Actions will automatically:
   - Publish to npm
   - Create git tags
   - Add provenance attestation

That's it! No manual `npm publish` needed.

---

## Troubleshooting

### "Version Packages" PR not created

**Possible causes:**
1. No changesets in `.changeset/` directory
2. GitHub Actions workflow not triggered
3. Permissions issue

**Solution:**
```bash
# Check for changesets
ls .changeset/

# Verify workflow file exists
ls .github/workflows/release.yml

# Re-trigger by pushing to main
git commit --allow-empty -m "chore: trigger release workflow"
git push
```

### npm publish fails in Actions

**Error:**
```
npm error 403 Forbidden
```

**Solution:**
1. Verify `NPM_TOKEN` is set in GitHub Secrets
2. Check token hasn't expired
3. Verify token has write permissions for the package

### Provenance generation fails

**Error:**
```
Automatic provenance generation not supported
```

**Solution:**
1. Ensure repository is public
2. Verify `id-token: write` permission is set in workflow
3. Check GitHub Actions version supports provenance

### CI tests fail

**Error:**
```
Tests failed in GitHub Actions
```

**Solution:**
1. Run tests locally first:
   ```bash
   pnpm test:ci
   ```
2. Fix any failing tests
3. Commit and push fixes

---

## Advanced Configuration

### Custom Release Script

You can customize the release process by modifying `package.json`:

```json
{
  "scripts": {
    "release": "changeset publish",
    "release:dry": "changeset publish --dry-run"
  }
}
```

### Pre-release Versions

For beta/alpha releases:

```bash
# Create pre-release changeset
pnpm changeset --pre beta

# Version and publish
pnpm changeset version
npm publish --tag beta
```

### Multiple Packages (Monorepo)

For monorepos, configure `.changeset/config.json`:

```json
{
  "linked": [
    ["package-a", "package-b"]
  ],
  "fixed": [
    ["package-c", "package-d"]
  ]
}
```

---

## Security Considerations

### Provenance Benefits

With provenance enabled, users can verify:
- ✅ Package was built from your source code
- ✅ Package was published from GitHub Actions
- ✅ No tampering occurred during build/publish

### Verification

Users can verify your package:

```bash
npm audit signatures
```

This shows cryptographic proof that the package is authentic.

---

## Migration from Manual to Automated

If you're currently publishing manually:

1. **Set up workflows** (follow steps above)
2. **Test with a patch release** first
3. **Monitor the automated release**
4. **Remove local npm credentials** (optional)

Your workflow changes from:

**Before (Manual):**
```bash
pnpm changeset version
npm publish --otp=123456
git push --follow-tags
```

**After (Automated):**
```bash
# Just merge the "Version Packages" PR
# Everything else happens automatically
```

---

## Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [changesets/action](https://github.com/changesets/action)
