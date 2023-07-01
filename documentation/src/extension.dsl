workspace extends example.dsl {
  views {
    systemContext softwareSystem {
      include *
      autolayout lr
    }

    container softwareSystem {
      include *
      autolayout lr
    }

    theme default
  }
}