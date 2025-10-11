# GitHub Actions Workflows

This repository includes automated CI/CD workflows for building and publishing the Basis Universal Transcoder package.

## Workflows

### 1. CI Workflow (`ci.yml`)
- **Triggers**: Push to `main`/`develop` branches, Pull requests to `main`
- **Purpose**: Automated testing and building
- **Steps**:
  - Checkout code with submodules
  - Setup Node.js 18
  - Install Emscripten 3.1.45
  - Build WASM files
  - Install dependencies
  - Type checking with TypeScript
  - Build the package
  - Run tests (if available)

### 2. Publish Workflow (`publish.yml`)
- **Triggers**: 
  - Push tags matching `v*` pattern (e.g., `v1.0.0`, `v1.2.3`)
  - Manual trigger via GitHub UI
- **Purpose**: Automated package publishing to NPM
- **Steps**:
  - All CI steps above
  - Publish to NPM registry with public access

## Setup Instructions

### 1. NPM Token Setup
1. Go to [npmjs.com](https://www.npmjs.com) and log in
2. Go to Access Tokens → Generate New Token
3. Choose "Automation" type for CI/CD
4. Copy the token
5. In your GitHub repository:
   - Go to Settings → Secrets and variables → Actions
   - Add new repository secret named `NPM_TOKEN`
   - Paste your NPM token as the value

### 2. Publishing a New Version

#### Option A: Using Git Tags (Recommended)
```bash
# Update version in package.json
npm version patch  # or minor, major
git push origin main
git push origin --tags  # This triggers the publish workflow
```

#### Option B: Manual Trigger
1. Go to GitHub → Actions → "Build and Publish to NPM"
2. Click "Run workflow"
3. Select branch and click "Run workflow"

### 3. Version Management
The workflow assumes you're using semantic versioning:
- `v1.0.0` - Major release
- `v1.1.0` - Minor release  
- `v1.0.1` - Patch release

### 4. Monitoring
- Check the Actions tab in GitHub to monitor workflow runs
- Failed builds will be reported via GitHub notifications
- NPM publish status can be verified on npmjs.com

## Troubleshooting

### Common Issues:
1. **WASM build fails**: Check Emscripten version compatibility
2. **NPM publish fails**: Verify NPM_TOKEN secret is set correctly
3. **Type check fails**: Fix TypeScript errors before pushing
4. **Dependencies issue**: Ensure package-lock.json is committed

### Debugging:
- Check workflow logs in GitHub Actions tab
- Test builds locally using the same commands
- Verify all required secrets are configured