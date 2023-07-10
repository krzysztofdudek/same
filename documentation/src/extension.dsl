workspace extends example.dsl {
  views {
    systemContext softwareSystem {
      include *
      autolayout lr
    }

    container softwareSystem DiagramKey {
      include *
      autolayout lr
    }

    theme default
  }
}