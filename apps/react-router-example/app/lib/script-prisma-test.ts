import { prisma } from "./prisma.js"

async function main() {
  // Create a new user with a post
  const todo = await prisma.todo.create({
    data: {
      title: "Alice",
      content: "alice@prisma.io",
      authorId: 1,
    },
  })

  console.log("Created todo:", todo)

  // Fetch all users with their posts
  const allTodos = await prisma.todo.findMany({})
  console.log("All allTodos:", JSON.stringify(allTodos, null, 2))
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
