# Open Cursor Project - Raycast Extension

Raycast extension to open local or remote (Git) projects directly in Cursor.

## Features

### Opening Local Projects
- Search and display local directories
- Automatic project scanning in your configured directories
- Intelligent project detection (via .git, package.json, etc.)
- Recently opened projects history
- Favorites for quick access

### Cloning Git Repositories
- Support for GitHub, GitLab, Bitbucket
- Custom Git URLs
- Authentication via tokens (optional)
- Detection of already cloned repositories
- Automatic opening in Cursor after cloning

### Search and Filtering
- Full-text search in names and paths
- Filtering by type (local/remote)
- Sort by access date
- Sections: All / Favorites / Recent

### Actions
- Open in Cursor
- Add/remove favorites
- Copy project path
- View details
- Remove from history

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Develop with: `npm run dev`
4. Build for production: `npm run build`

## Configuration

### Preferences

Configure the extension via Raycast preferences:

- **Directories to Scan**: Directories to scan (comma-separated)
- **Scan Depth**: Maximum recursive scan depth (default: 3)
- **Excluded Folders**: Folders to exclude (node_modules, .git, etc.)
- **Default Clone Directory**: Default directory for clones
- **GitHub/GitLab/Bitbucket Tokens**: Authentication tokens (optional)
- **Open in New Window**: Always open in a new Cursor window

## Usage

### "Open Project" Command
1. Open Raycast
2. Type "Open Project"
3. Search for your project
4. Press Enter to open in Cursor

### "Clone Repository" Command
1. Open Raycast
2. Type "Clone Repository"
3. Enter the Git repository URL
4. The repository will be cloned and automatically opened in Cursor

## Prerequisites

- [Cursor](https://cursor.sh/) installed and accessible via the `cursor` command
- Node.js and npm
- Git installed (for cloning)

## Project Detection

The extension automatically detects projects by looking for indicator files:
- `.git` (Git repository)
- `package.json` (Node.js)
- `Cargo.toml` (Rust)
- `pom.xml`, `build.gradle` (Java)
- `requirements.txt`, `setup.py`, `pyproject.toml` (Python)
- `go.mod` (Go)
- `composer.json` (PHP)
- And many more...

## Support

For issues or suggestions, open an issue on GitHub.

## License

MIT
