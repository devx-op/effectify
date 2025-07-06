import './App.css'

import { Button } from '@effectify/react-ui/components/primitives/button'
import { VStack } from '@effectify/react-ui/components/primitives/stack'
import { useState } from 'react'
import viteLogo from '/vite.svg'
import reactLogo from './assets/react.svg'
import { RegisterForm } from './components/register-form.js'

function App() {
  const [count, setCount] = useState(0)

  const handleSubmit = async (values: { name: string; email: string; password: string; confirmPassword: string }) => {
    console.log('Form submitted:', values)
  }

  return (
    <VStack gap="4" className="min-h-screen p-8">
      <div>
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <Button onClick={() => setCount((count) => count + 1)}>count is {count}</Button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">VStack Test</h2>
        <VStack gap="2" className="border-2 border-red-500 p-4 rounded bg-gray-100">
          <div className="bg-red-500 text-white p-2 rounded">Item 1 - Should be stacked vertically</div>
          <div className="bg-blue-500 text-white p-2 rounded">Item 2 - Should be stacked vertically</div>
          <div className="bg-green-500 text-white p-2 rounded">Item 3 - Should be stacked vertically</div>
        </VStack>

        <h3 className="text-lg font-bold mt-4 mb-2">Regular div for comparison:</h3>
        <div className="border-2 border-blue-500 p-4 rounded bg-gray-100">
          <div className="bg-red-500 text-white p-2 rounded mb-2">Item 1 - Regular div</div>
          <div className="bg-blue-500 text-white p-2 rounded mb-2">Item 2 - Regular div</div>
          <div className="bg-green-500 text-white p-2 rounded">Item 3 - Regular div</div>
        </div>
      </div>

      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Register Form Test</h2>
        <RegisterForm handleSubmit={handleSubmit} />
      </div>

      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
    </VStack>
  )
}

export default App
