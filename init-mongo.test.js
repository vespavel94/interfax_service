db.createUser(
  {
    user: "interfax",
    pwd: "interfax",
    roles: [
      {
        role: "readWrite",
        db: "interfax"
      }
    ]
  }
)
