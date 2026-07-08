describe("react-router example bootstrap", () => {
  it("boots the app and renders navigation links", () => {
    cy.visit("/")

    cy.get("nav").should("be.visible")
    cy.contains("nav a", "Home").should("be.visible")
    cy.contains("nav a", "Login").should("be.visible")
  })

  it("navigates to login from the root route", () => {
    cy.visit("/")

    cy.contains("nav a", "Login").click()

    cy.url().should("include", "/login")
    cy.contains("h2", "Sign in to your account").should("be.visible")
    cy.get("#email-address")
      .should("be.visible")
      .type("browser@example.com")
      .should("have.value", "browser@example.com")
  })
})
