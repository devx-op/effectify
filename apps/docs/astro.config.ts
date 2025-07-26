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
            link: '/react/',
            id: 'react',
            items: [
              {
                label: 'Getting Started',
                items: ['react/getting-started', 'react/installation'],
              },
              {
                label: 'Packages',
                items: ['react/packages/react-query', 'react/packages/react-ui', 'react/packages/chat-react'],
              },
              {
                label: 'Reference',
                autogenerate: {
                  directory: 'react/reference',
                },
              },
            ],
          },
          {
            label: 'SolidJs',
            icon: 'seti:sublime',
            link: '/solid/',
            id: 'solid',
            items: [
              {
                label: 'Getting Started',
                items: ['solid/getting-started', 'solid/installation'],
              },
              {
                label: 'Packages',
                items: ['solid/packages/solid-query', 'solid/packages/solid-ui', 'solid/packages/chat-solid'],
              },
              {
                label: 'Reference',
                autogenerate: {
                  directory: 'solid/reference',
                },
              },
            ],
          },
          {
            label: 'Backend',
            icon: 'bars',
            link: '/backend/',
            id: 'backend',
            items: [
              {
                label: 'Getting Started',
                items: ['backend/getting-started', 'backend/installation'],
              },
              {
                label: 'Packages',
                items: ['backend/packages/node-better-auth', 'backend/packages/node-auth-app'],
              },
              {
                label: 'Reference',
                autogenerate: {
                  directory: 'backend/reference',
                },
              },
            ],
          },
          {
            label: 'Universal',
            icon: 'puzzle',
            link: '/universal/',
            id: 'universal',
            items: [
              {
                label: 'Getting Started',
                items: ['universal/getting-started', 'universal/concepts'],
              },
              {
                label: 'Packages',
                items: ['universal/packages/chat-domain', 'universal/packages/shared-types'],
              },
              {
                label: 'Reference',
                autogenerate: {
                  directory: 'universal/reference',
                },
              },
            ],
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
