import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  alias: {
    '@': path.resolve(__dirname, './'),
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    permissions: ['sidePanel', 'storage', 'tabs'],
    side_panel: {
      default_path: 'sidepanel.html'
    },
    action: {
      default_title: 'Open Sidepanel'
    },
    web_accessible_resources: [
      {
        matches: ['*://*.zhipin.com/*','http://localhost/*'],
        resources: ["chunks/*", "content-scripts/*", "icon/*"],
      }
    ],
    host_permissions: ['*://*.zhipin.com/*','http://localhost/*']
  }
});
