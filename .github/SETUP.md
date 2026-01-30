# 🚀 CI/CD Setup Guide

This guide explains how to set up the automated CI/CD pipeline for publishing packages to NPM and JSR (Deno).

## 📋 Prerequisites

1. **NPM Account**: You need an NPM account with publish permissions
2. **JSR Account**: You need a JSR account for Deno packages (optional)
3. **GitHub Repository**: With admin access to configure secrets

## 🔐 Required Secrets

Configure these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### NPM Token

- **Name**: `NPM_TOKEN`
- **Description**: NPM authentication token for publishing packages
- **How to get**:
  1. Go to [npmjs.com](https://www.npmjs.com/) and log in
  2. Go to `Account Settings > Access Tokens`
  3. Click `Generate New Token`
  4. Select `Automation` type (for CI/CD)
  5. Copy the token and add it as `NPM_TOKEN` secret

### JSR OIDC Configuration (Recommended)

- **Method**: OIDC (OpenID Connect) - more secure than personal tokens
- **Setup**: Link your package to your GitHub repository in JSR
- **How to configure**:
  1. Go to your package `@effectify/solid-query` on [jsr.io](https://jsr.io/)
  2. Go to the **"Settings"** tab
  3. In **"GitHub repository"** field, enter your repository name (e.g., `your-username/effectify`)
  4. Click **"Link"** to connect the package to your repository
  5. No secrets needed in GitHub - OIDC handles authentication automatically
- **Reference**: [JSR Publishing from GitHub Actions](https://jsr.io/docs/publishing-packages#publishing-from-github-actions)

## 🏗️ Workflow Overview

### CI Workflow (`.github/workflows/ci.yml`)

- **Triggers**: Push to `master`, `main`, `develop` branches and PRs
- **Purpose**: Development and PR validation
- **Jobs**:
  - 🔍 **Lint & Format**: Checks code style and formatting
  - 🔍 **Type Check**: Validates TypeScript types
  - 🏗️ **Build**: Builds affected projects and uploads artifacts
  - 🧪 **Test**: Runs tests for affected projects
  - 📊 **Summary**: CI results dashboard

### Release Workflow (`.github/workflows/release.yml`)

- **Triggers**: Push to `master` branch only
- **Purpose**: Production release and publishing
- **Optimized**: Tries to reuse build artifacts from CI
- **Jobs**:
  - 🔍 **Detect Changes**: Determines if release is needed
  - 🚀 **Release & Publish**: Handles versioning, changelog, and publishing
  - 📢 **Notify**: Provides status notifications

## 🎯 How It Works

### 1. Change Detection

The workflow automatically detects if any of the configured release projects have changes:

- `packages/react/remix`
- `packages/react/router`
- `packages/node/better-auth`
- `packages/solid/query`

### 2. Affected Projects

Uses Nx's native `affected` commands to:

- Build only changed projects: `nx affected --target=build`
- Test only changed projects: `nx affected --target=test`
- Lint only changed projects: `nx affected --target=lint`

### 3. Release Process

When changes are detected on master:

1. **Try to reuse** build artifacts from CI (if available)
2. **Build** affected projects (only if artifacts not found)
3. **Test** affected projects
4. **Version** packages using Nx Release
5. **Generate** changelogs automatically
6. **Publish** to NPM and JSR
7. **Create** GitHub release

## 🔧 Configuration Files

### `.npmrc`

```ini
registry=https://registry.npmjs.org/
always-auth=true
@jsr:registry=https://npm.jsr.io/
```

### `nx.json` (Release Configuration)

```json
{
  "release": {
    "projects": [
      "packages/react/remix",
      "packages/react/router",
      "packages/node/better-auth",
      "packages/solid/query"
    ],
    "changelog": {
      "projectChangelogs": {
        "renderOptions": {
          "authors": true,
          "commitReferences": false,
          "versionTitleDate": true,
          "applyUsernameToAuthors": true
        }
      }
    },
    "releaseTagPattern": "release/{version}",
    "version": {
      "preVersionCommand": "pnpm nx build @effectify/react-remix @effectify/react-router"
    }
  }
}
```

## 🚀 Usage

### Automatic Release

- Push changes to `master` branch
- The workflow automatically detects affected packages
- If changes are found, it triggers the release process

### Manual Release

- Go to `Actions` tab in GitHub
- Select `🚀 Release & Publish` workflow
- Click `Run workflow` button

### Check Status

- Go to `Actions` tab to see workflow status
- Check the `📊 CI Summary` for detailed results
- Review published packages in NPM and JSR

## 🛠️ Troubleshooting

### Common Issues

1. **NPM Token Issues**

   - Ensure token has `Automation` type
   - Check token permissions include publish access
   - Verify token is not expired

2. **JSR Token Issues**

   - Ensure JSR account has publish permissions
   - Check if package name conflicts exist
   - Verify JSR token is valid

3. **Build Failures**

   - Check if all dependencies are installed
   - Verify TypeScript compilation
   - Review test failures

4. **No Release Triggered**
   - Ensure changes are in release-configured projects
   - Check if changes are in configuration files
   - Verify branch is `master`

## 🧪 Testing Workflows Locally

### Using Act (GitHub Actions Local Runner)

We've set up **act** to test GitHub Actions workflows locally before pushing to GitHub.

#### Prerequisites

```bash
# Install act (if not already installed)
brew install act

# Install Docker (required for act)
# Download from https://www.docker.com/products/docker-desktop
```

#### Quick Testing

```bash
# Test all workflows
./scripts/test-workflows.sh

# Test specific workflow
./scripts/test-workflows.sh ci
./scripts/test-workflows.sh release

# List available workflows
./scripts/test-workflows.sh list

# Get help
./scripts/test-workflows.sh help
```

#### Manual Testing with Act

```bash
# List jobs in a workflow
act -W .github/workflows/ci.yml --list
act -W .github/workflows/release.yml --list

# Run specific job
act -W .github/workflows/ci.yml -j build
act -W .github/workflows/ci.yml -j test

# Run with M1/M2 Mac compatibility
act -W .github/workflows/ci.yml --container-architecture linux/amd64

# Run with local secrets
act -W .github/workflows/ci.yml --secret-file .secrets
```

### Testing Nx Commands Locally

```bash
# Check affected projects locally
pnpm nx show projects --affected --base=origin/master~1 --head=HEAD

# Test release process locally
pnpm nx release --dry-run

# Build affected projects locally
pnpm nx affected --target=build --base=origin/master~1 --head=HEAD

# Test JSR publish locally (dry run)
cd packages/solid/query
pnpm dlx jsr publish --dry-run

# Test JSR publish locally (real publish)
cd packages/solid/query
pnpm dlx jsr publish
```

### Local Testing Files

- **`.actrc`**: Act configuration file
- **`.secrets`**: Local secrets for testing (not committed to git)
- **`scripts/test-workflows.sh`**: Helper script for testing workflows

## 📚 Additional Resources

- [Nx Release Documentation](https://nx.dev/nx-api/nx/documents/release)
- [Nx Affected Commands](https://nx.dev/nx-api/nx/documents/affected)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [JSR Publishing Guide](https://jsr.io/docs/publishing)

## 🎉 Benefits

- ✅ **Automated**: No manual publishing required
- ✅ **Optimized**: Reuses build artifacts when possible
- ✅ **Efficient**: Only builds and tests affected projects
- ✅ **Reliable**: Comprehensive testing before release
- ✅ **Transparent**: Clear changelogs and release notes
- ✅ **Multi-platform**: Supports both NPM and JSR (Deno)
- ✅ **Scalable**: Easy to add new packages to release process
- ✅ **Separated**: Clear separation between CI and Release concerns
- ✅ **Fast**: Parallel execution and smart artifact reuse
