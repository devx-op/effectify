// @ts-check

import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import startlightSidebarTopics from 'starlight-sidebar-topics'
import startlightThemeNova from 'starlight-theme-nova'

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      plugins: [
        startlightSidebarTopics([
          {
            label: 'ReactJs',
            icon: 'seti:react',
            link: '/guides/',
            id: 'guides',
            items: [
              {
                label: 'Start Here',
                items: ['guides/example'],
              },
              {
                label: 'Reference',
                autogenerate: {
                  directory: 'reference',
                },
              },
            ],
          },
          {
            label: 'SolidJs',
            icon: 'seti:sublime',
            // The URL to the external resource to link to.
            link: 'https://starlight.astro.build',
          },
          {
            label: 'Backend',
            icon: 'bars',
            // The URL to the external resource to link to.
            link: 'https://starlight.astro.build',
          },
          {
            label: 'Universal',
            icon: 'puzzle',
            // The URL to the external resource to link to.
            link: 'https://starlight.astro.build',
          },
        ]),
        startlightThemeNova(),
      ],
      components: {
        Sidebar: './src/components/Sidebar.astro',
      },
      title: 'Effectify',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/devx-op/effectify' }],
      /* 			sidebar: [
				{
					label: 'Guides',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Example Guide', slug: 'guides/example' },
					],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
			], */
      customCss: ['./src/styles/global.css'],
    }),
  ],
  vite: {
    plugins: [tailwindcss() as any],
  },
})
