import { useState } from "react"

// Simple chat demo without Effect hooks for now
// TODO: Integrate with @effectify/react-query when v4 APIs stabilize

interface Message {
  id: string
  body: string
  createdAt: Date
  readAt: Date | null
}

// Mock data
const mockMessages: Message[] = [
  {
    id: "1",
    body: "Hello from Effect v4 Beta!",
    createdAt: new Date(),
    readAt: null,
  },
  {
    id: "2",
    body: "This is a demo of the beta release workflow.",
    createdAt: new Date(),
    readAt: new Date(),
  },
]

export default function ChatPage() {
  const [messages] = useState<Message[]>(mockMessages)
  const [newMessage, setNewMessage] = useState("")

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    console.log("Sending message (demo):", newMessage)
    setNewMessage("")
  }

  return (
    <main className="container">
      <header>
        <h1>Chat Demo</h1>
        <p>Effect v4 Beta Integration - @effectify/react-query</p>
      </header>

      <section>
        <article>
          <header>
            <h3>Messages</h3>
          </header>

          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {messages.map((message: Message) => (
              <article
                key={message.id}
                style={{ marginBottom: "1rem", padding: "1rem" }}
              >
                <p>{message.body}</p>
                <small>
                  {message.createdAt.toLocaleString()}
                  {message.readAt && " ✓ Read"}
                </small>
              </article>
            ))}
          </div>
        </article>

        <footer>
          <form onSubmit={handleSend}>
            <fieldset role="group">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit">Send</button>
            </fieldset>
          </form>
          <small>
            Package: @effectify/react-query v4 beta | npm dist-tag: beta
          </small>
        </footer>
      </section>
    </main>
  )
}
