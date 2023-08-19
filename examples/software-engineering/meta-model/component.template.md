# {{this.displayName}}

## Summary

Category: {{this.category}}
Technology: {{this.technology}}
Is a part of modular monolith: {{this.isPartOfModularMonolith}}

## Description

{{this.description}}

## Phases

{{#children}}
- [Phase {{name}}]({{#childLink}}component-phase,component/{{parent.name}}/{{name}}{{/childLink}})
{{/children}}