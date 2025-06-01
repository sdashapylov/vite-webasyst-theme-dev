import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import FullReload from 'vite-plugin-full-reload';
import { execSync } from 'child_process';
import { XMLParser } from 'fast-xml-parser';

const apps = ['site', 'shop', 'blog', 'photos'];

const paths = apps.flatMap(app => ([
    `wa-apps/${app}/themes/aspiresense/**/*.html`,
    `wa-apps/${app}/themes/aspiresense/assets/*.css`,
    `wa-apps/${app}/themes/aspiresense/assets/*.js`,
]));
function archiveThemesPlugin() {
    return {
        name: 'archive-themes',
        apply: 'build',
        closeBundle() {
            const root = process.cwd();
            const outDir = path.resolve(root, 'dist/themes/aspiresense');
            const apps = ['site', 'shop', 'blog', 'photos'];

            const parser = new XMLParser({ ignoreAttributes: false });

            if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true });
            }

            apps.forEach((app) => {
                const themesDir = path.resolve(root, `wa-apps/${app}/themes`);
                const themePath = path.join(themesDir, 'aspiresense');
                const xmlPath = path.join(themePath, 'theme.xml');

                if (!fs.existsSync(themePath)) {
                    console.warn(`⚠️ Папка темы не найдена: ${themePath}`);
                    return;
                }

                if (!fs.existsSync(xmlPath)) {
                    console.warn(`⚠️ Файл theme.xml не найден: ${xmlPath}`);
                    return;
                }

                // Чтение и парсинг theme.xml
                const xml = fs.readFileSync(xmlPath, 'utf-8');
                const json = parser.parse(xml);
                const version = json?.theme?.['@_version'] || '0.0.0';

                const archiveName = `${app}-${version}.tar.gz`;
                const archivePath = path.resolve(outDir, archiveName);

                try {
                    execSync(`tar -czvf "${archivePath}" -C "${themesDir}" aspiresense`, {
                        stdio: 'inherit'
                    });
                    console.log(`✅ Архив создан: ${archiveName}`);
                } catch (e) {
                    console.error(`❌ Ошибка архивации ${app}:`, e.message);
                }
            });
        }
    };
}
function removeDevScriptPlugin() {
    return {
        name: 'remove-dev-script',
        apply: 'build',
        closeBundle() {
            apps.forEach(app => {
                const indexPath = path.resolve(`wa-apps/site/themes/aspiresense/index.html`);
                if (!fs.existsSync(indexPath)) return;

                const html = fs.readFileSync(indexPath, 'utf-8');
                const cleaned = html.replace(
                    /<script[^>]*src=["']http:\/\/localhost:5173\/\@vite\/client["'][^>]*><\/script>\s*/g,
                    ''
                );
                fs.writeFileSync(indexPath, cleaned, 'utf-8');
                console.log(`🧹 Удалена dev-строка из ${indexPath}`);
            });
        }
    };
}

export default defineConfig({
    root: './src', // работаем из корня темы
    base: '/', // путь для подключения ассетов
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'src/main.js'), // точка входа
            },
        },
    },
    plugins: [
        FullReload(paths),
        archiveThemesPlugin(),
        removeDevScriptPlugin()
    ],
    server: {
        port: 5173,
        open: false,
        watch: {
            usePolling: true,
            interval: 1000
        },
        hmr: {
            protocol: 'ws',
            host: 'localhost',
            port: 5173,
            clientPort: 5173,
        }
    },
});