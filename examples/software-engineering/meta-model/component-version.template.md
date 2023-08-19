# {{parent.displayName}}

## Context

{{this.context}}

## Responsibilities

{{#this.responsibilities}}
- {{.}}
{{/this.responsibilities}}

## Implemented bounded contexts phases

{{#this.implementedBoundedContexts}}
- {{#link}}{{#accessProperty}}bounded-context,{{name}},{{displayName}}{{/accessProperty}} (phase {{#accessProperty}}bounded-context-phase,bounded-context/{{name}}/{{phase}},{{name}}{{/accessProperty}}),bounded-context-phase,{{name}}/{{phase}}{{/link}}
{{/this.implementedBoundedContexts}}

## Depends on components phases

{{#this.dependsOnComponents}}
- {{#link}}{{#accessProperty}}component,{{name}},{{displayName}}{{/accessProperty}} (phase {{#accessProperty}}component-phase,component/{{name}}/{{phase}},{{name}}{{/accessProperty}}),component-phase,{{name}}/{{phase}}{{/link}}
{{/this.dependsOnComponents}}

## Context diagram

@structurizr(phase-{{}}.dsl, Context)