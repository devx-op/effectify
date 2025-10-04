import Home from './routes/_index'
import Layout from './routes/_layout'
import About from './routes/about'
import Test, { action, loader } from './routes/test'

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'about',
        element: <About />,
      },
      {
        path: 'test',
        element: <Test />,
        loader,
        action,
      },
    ],
  },
]
