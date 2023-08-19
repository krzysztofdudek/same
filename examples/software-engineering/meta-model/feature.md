# {{this.codeName}} as {{this.businessName}}

## Context

{{this.context}}

## User stories

{{#each this.userStories}}
{{#if isNew}}
- **(new) {{content}}**
{{else}}
- {{content}}
{{/if}}
{{/each}}

## Requirements

{{#each this.requirements}}
{{#if isNew}}
- **(new) {{content}}**
{{else}}
- {{content}}
{{/if}}
{{/each}}

## Phases