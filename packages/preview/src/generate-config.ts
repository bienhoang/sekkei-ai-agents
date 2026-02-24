import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, relative, basename, dirname, extname } from 'node:path';

export interface ConfigOptions {
  edit: boolean;
  port: number;
  title?: string;
  description?: string;
}

interface SidebarItem {
  text: string;
  link?: string;
  collapsed?: boolean;
  items?: SidebarItem[];
}

/**
 * Build sidebar from docs directory structure.
 * Sorts by numbered prefix (01-, 02-, etc.).
 * Directories become collapsible groups.
 */
export function buildSidebar(docsDir: string, basePath = ''): SidebarItem[] {
  const items: SidebarItem[] = [];
  const fullPath = join(docsDir, basePath);

  if (!existsSync(fullPath)) return items;

  const entries = readdirSync(fullPath, { withFileTypes: true })
    .filter(e => {
      const name = e.name;
      if (name.startsWith('.') || name.startsWith('_')) return false;
      if (name === 'node_modules' || name === 'index.md') return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  for (const entry of entries) {
    const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const children = buildSidebar(docsDir, relPath);
      if (children.length > 0) {
        items.push({
          text: formatDisplayName(entry.name),
          collapsed: false,
          items: children,
        });
      }
    } else if (entry.isFile() && extname(entry.name) === '.md') {
      const title = extractTitle(join(docsDir, relPath));
      const link = '/' + relPath.replace(/\.md$/, '');
      items.push({ text: title, link });
    }
  }

  return items;
}

/**
 * Strip numbered prefix and format as display name.
 * "01-overview" → "Overview", "05-features" → "Features"
 */
function formatDisplayName(name: string): string {
  const stripped = name.replace(/^\d+-/, '');
  return stripped
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Extract title from markdown: YAML frontmatter title or first H1.
 */
function extractTitle(filePath: string): string {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const lines = raw.split('\n');

    // Check YAML frontmatter
    if (lines[0]?.trim() === '---') {
      for (let i = 1; i < Math.min(lines.length, 20); i++) {
        if (lines[i]?.trim() === '---') break;
        const match = lines[i]?.match(/^title:\s*["']?(.+?)["']?\s*$/);
        if (match) return match[1];
      }
    }

    // Check first H1
    for (const line of lines.slice(0, 30)) {
      const h1 = line.match(/^#\s+(.+)/);
      if (h1) return h1[1];
    }
  } catch {
    // ignore read errors
  }

  // Fallback: format filename
  return formatDisplayName(basename(filePath, '.md'));
}

/**
 * Generate VitePress config.mts content and write to docsDir/.vitepress/.
 */
export function generateVitePressConfig(
  docsDir: string,
  packageDir: string,
  options: ConfigOptions
): void {
  const sidebar = buildSidebar(docsDir);
  const sidebarJson = JSON.stringify(sidebar, null, 2);
  const themePath = resolve(packageDir, 'theme').replace(/\\/g, '/');
  const pluginPath = resolve(packageDir, 'plugins', 'file-api-plugin.ts').replace(/\\/g, '/');

  const pluginImport = options.edit
    ? `import { sekkeiFileApiPlugin } from '${pluginPath}'`
    : '';

  const nodeModulesPath = resolve(packageDir, 'node_modules').replace(/\\/g, '/');

  const pluginsList: string[] = [];
  if (options.edit) {
    pluginsList.push(`sekkeiFileApiPlugin('${docsDir.replace(/\\/g, '/')}')`);
  }

  const editModeConfig = options.edit ? `\n    editMode: true,` : '';

  const config = `import path from 'node:path'
${pluginImport}

export default {
  title: ${JSON.stringify(options.title ?? 'Sekkei Docs')},
  description: ${JSON.stringify(options.description ?? 'Japanese specification documents')},
  themeConfig: {
    sidebar: ${sidebarJson},
    outline: { level: [2, 3] },
    search: { provider: 'local' },${editModeConfig}
  },
  vite: {
    resolve: {
      alias: {
        'vitepress/theme': path.join('${nodeModulesPath}', 'vitepress', 'dist', 'client', 'theme-default', 'index.js'),
      },
    },
    server: {
      fs: { allow: ['${packageDir.replace(/\\/g, '/')}', '${docsDir.replace(/\\/g, '/')}'] },
    },
    optimizeDeps: {
      entries: [],
    },${pluginsList.length > 0 ? `\n    plugins: [${pluginsList.join(', ')}],` : ''}
  },
}
`;

  const vpDir = join(docsDir, '.vitepress');
  if (!existsSync(vpDir)) mkdirSync(vpDir, { recursive: true });
  writeFileSync(join(vpDir, 'config.mts'), config, 'utf8');

  // Write theme re-export so VitePress picks up the custom theme
  const themeIndex = `export { default } from '${themePath}/index.ts'\n`;
  const themeDir = join(vpDir, 'theme');
  if (!existsSync(themeDir)) mkdirSync(themeDir, { recursive: true });
  writeFileSync(join(themeDir, 'index.ts'), themeIndex, 'utf8');
}
