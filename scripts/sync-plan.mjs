import {copyFileSync} from 'node:fs';
copyFileSync(new URL('../docs/ADMIN_PLAN.md', import.meta.url), new URL('../public/ADMIN_PLAN.md', import.meta.url));
