workspace {
  model {
    user = person "User"
    softwareSystem = softwareSystem "Software System" {
      webapp = container "Web Application" {
        user -> this "Uses"
      }
      container "Database" {
        webapp -> this "Reads from and writes to"
      }
    }
  }
}