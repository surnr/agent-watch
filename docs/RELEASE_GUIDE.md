# Release Guide

This guide covers the complete workflow for releasing new versions of agent-watch.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Versioning Strategy](#versioning-strategy)
- [Making Changes](#making-changes)
- [Creating a Release](#creating-a-release)
- [Publishing to npm](#publishing-to-npm)
- [Troubleshooting](#troubleshooting)

---

## Quick Reference

### Daily Development Workflow

```bash
# 1. Make code changes
# 2. Create a changeset
pnpm changeset

# 3. Commit with your changes
git add .
git commit -m "feat: your feature description"
git push
```

### Release Workflow

```bash
# 1. Bump version (consumes all pending changesets)
pnpm changeset version

# 2. Review the changes
git diff

# 3. Commit the version bump
git add .
git commit -m "chore: version packages"

# 4. Publish to npm (requires npm 2FA code)
npm publish --otp=YOUR_6_DIGIT_CODE

# 5. Push to GitHub
git push --follow-tags
```

---

## Versioning Strategy

This project follows [Semantic Versioning](https://semver.org/) (SemVer):

- **Major (X.0.0)** - Breaking changes that require user action
- **Minor (1.X.0)** - New features, backwards compatible
- **Patch (1.0.X)** - Bug fixes, backwards compatible

### Examples

| Change Type | Example | Version Change |
|------------|---------|----------------|
| **Patch** | Fix typo in error message | 1.0.0 → 1.0.1 |
| **Patch** | Fix bug in file detection | 1.0.0 → 1.0.1 |
| **Minor** | Add support for new agent file | 1.0.0 → 1.1.0 |
| **Minor** | Add new CLI command | 1.0.0 → 1.1.0 |
| **Major** | Remove deprecated command | 1.0.0 → 2.0.0 |
| **Major** | Change config file format | 1.0.0 → 2.0.0 |

---

## Making Changes

### Step 1: Develop Your Feature

Make your code changes as usual:

```bash
# Create a branch (optional but recommended)
git checkout -b feat/my-new-feature

# Make your changes
# ... edit files ...

# Run tests
pnpm test

# Build
pnpm build
```

### Step 2: Create a Changeset

After completing your changes, create a changeset:

```bash
pnpm changeset
```

This will prompt you with:

1. **Which packages would you like to include?**
   - Press `Enter` (we only have one package)

2. **What kind of change is this?**
   - `patch` - Bug fixes, minor updates
   - `minor` - New features (backwards compatible)
   - `major` - Breaking changes

3. **Summary of changes**
   - Write a brief description (this goes in CHANGELOG.md)
   - Use present tense: "Add feature" not "Added feature"

**Example:**
```
🦋  What kind of change is this for agent-watch? (current version is 1.0.0)
❯ patch
  minor
  major

🦋  Please enter a summary for this change (this will be in the changelog).
    (submit empty line to open external editor)
🦋  Summary › Add support for .aiderules configuration file
```

This creates a markdown file in `.changeset/` with your change description.

### Step 3: Commit Your Changes

```bash
git add .
git commit -m "feat: add support for .aiderules file"
git push
```

**Important:** Commit the changeset file (`.changeset/*.md`) along with your code changes.

---

## Creating a Release

When you're ready to publish a new version:

### Step 1: Bump Version

```bash
pnpm changeset version
```

This command will:
- ✅ Read all changeset files in `.changeset/`
- ✅ Determine the new version based on changeset types
- ✅ Update `package.json` version
- ✅ Update `CHANGELOG.md` with all changes
- ✅ Delete consumed changeset files

### Step 2: Review Changes

```bash
# Check what changed
git diff

# Review the CHANGELOG.md
cat CHANGELOG.md
```

Make sure:
- ✅ Version number is correct in `package.json`
- ✅ CHANGELOG.md has all your changes
- ✅ Changeset files were deleted

### Step 3: Commit Version Bump

```bash
git add .
git commit -m "chore: version packages"
```

### Step 4: Build and Test

Before publishing, ensure everything works:

```bash
# Run full test suite
pnpm test:ci

# Build the package
pnpm build

# Verify package contents
npm pack --dry-run
```

### Step 5: Publish to npm

**Manual Publishing (Current Method):**

```bash
# Publish with 2FA
npm publish --otp=YOUR_6_DIGIT_CODE
```

Replace `YOUR_6_DIGIT_CODE` with the code from your authenticator app.

**Alternative: Using Automation Token**

If you don't want to enter OTP each time:

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Generate a "Granular Access Token" with:
   - Read and write permissions
   - "Bypass 2FA" enabled
3. Set the token:
   ```bash
   npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN
   ```

### Step 6: Push to GitHub

```bash
# Push commits and tags
git push --follow-tags
```

### Step 7: Create GitHub Release (Optional)

```bash
# Create a GitHub release
gh release create v1.X.X --title "v1.X.X" --notes "See CHANGELOG.md for details"
```

---

## Publishing to npm

### Pre-Publish Checks

The `prepublishOnly` script automatically runs:

```bash
pnpm run build && pnpm run test:exports
```

This ensures:
- ✅ Package builds successfully
- ✅ TypeScript exports are valid
- ✅ No missing dependencies

### What Gets Published

Only these files are included (see `package.json` → `files`):

- `dist/` - Compiled code (ESM + CJS)
- `CHANGELOG.md` - Release notes
- `README.md` - Documentation (auto-included)
- `LICENSE` - License file (auto-included)
- `package.json` - Package metadata (auto-included)

### npm Package URL

After publishing, your package will be available at:
- npm: https://www.npmjs.com/package/agent-watch
- Install: `npm install -g agent-watch`

---

## Troubleshooting

### "Two-factor authentication required"

**Error:**
```
npm error 403 Two-factor authentication is required to publish packages
```

**Solution:**
Use the `--otp` flag:
```bash
npm publish --otp=123456
```

### "Version already exists"

**Error:**
```
npm error 403 Cannot publish over existing version
```

**Solution:**
You can't republish the same version. Bump the version:
```bash
pnpm changeset version
```

### Pre-commit Hook Fails

**Error:**
```
Biome check failed
```

**Solution:**
Run the fix command:
```bash
pnpm run check:fix
git add .
git commit
```

### Build Fails

**Error:**
```
Build failed with errors
```

**Solution:**
1. Check TypeScript errors:
   ```bash
   pnpm run test:types
   ```

2. Fix the errors and try again

### Tests Fail Before Publish

**Error:**
```
ELIFECYCLE Test failed
```

**Solution:**
Fix failing tests before publishing:
```bash
# Run tests to see failures
pnpm test

# Fix the issues
# Re-run tests
pnpm test:ci
```

---

## Best Practices

### DO ✅

- Create a changeset for every meaningful change
- Write clear, concise changeset summaries
- Run `pnpm test:ci` before publishing
- Review CHANGELOG.md before releasing
- Use semantic versioning correctly
- Test the package locally before publishing

### DON'T ❌

- Skip creating changesets
- Manually edit `package.json` version (use changesets)
- Manually edit `CHANGELOG.md` (use changesets)
- Publish without running tests
- Force push to main branch
- Delete changesets manually (let `changeset version` do it)

---

## Example Release Flow

Here's a complete example of releasing a new feature:

```bash
# Day 1: Add feature
git checkout -b feat/new-agent-support
# ... make changes ...
pnpm changeset
# Select: minor
# Summary: "Add support for Aider agent configuration"
git add .
git commit -m "feat: add Aider agent support"
git push

# Day 2: Fix bug
# ... make changes ...
pnpm changeset
# Select: patch
# Summary: "Fix file detection for nested directories"
git add .
git commit -m "fix: file detection in nested dirs"
git push

# Day 3: Ready to release
pnpm changeset version
# Creates version 1.1.0 (minor bump)
# Updates CHANGELOG.md with both changes

git add .
git commit -m "chore: version packages"

pnpm test:ci
npm publish --otp=123456

git push --follow-tags

# Done! Version 1.1.0 is live
```

---

## Next Steps

- See [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md) for automated release setup
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines (if exists)
